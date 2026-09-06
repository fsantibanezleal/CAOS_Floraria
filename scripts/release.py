#!/usr/bin/env python3
"""Immutable static-release packaging and explicit operator-controlled delivery."""
from __future__ import annotations

import gzip
import hashlib
import io
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import tarfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'frontend/dist'
RECEIPT = ROOT / 'build/build-receipt.json'
SHA = re.compile(r'[a-f0-9]{40}')
RELEASE_ID = re.compile(r'v[0-9]+\.[0-9]{2}\.[0-9]{3}-[a-f0-9]{12}-[a-f0-9]{12}')
UPLOAD_DIR = re.compile(r'/tmp/floraria-upload\.[a-zA-Z0-9]{10}')


def git(*arguments: str) -> str:
    return subprocess.run(['git', *arguments], cwd=ROOT, check=True, capture_output=True, text=True).stdout.strip()


def clean() -> bool:
    return not git('status', '--porcelain', '--untracked-files=all')


def trusted_revision(revision: str | None, approved_sha: str | None) -> str:
    head = git('rev-parse', 'HEAD')
    if not revision or not SHA.fullmatch(revision) or revision != head:
        raise RuntimeError('Supply --revision with the exact current 40-character HEAD SHA.')
    if not clean():
        raise RuntimeError('Release requires a clean Git worktree, including all untracked non-ignored files.')
    if approved_sha is not None:
        if approved_sha != revision:
            raise RuntimeError('--approved-sha must exactly match the requested revision.')
    else:
        git('fetch', 'origin', 'main')
        result = subprocess.run(['git', 'merge-base', '--is-ancestor', revision, 'origin/main'], cwd=ROOT)
        if result.returncode:
            raise RuntimeError('Revision is not in refreshed origin/main. Promote it or pass its explicitly approved exact SHA.')
    return revision


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def tree_manifest(directory: Path) -> dict[str, dict[str, str | int]]:
    if not directory.is_dir():
        raise RuntimeError('Frontend build directory is missing.')
    files = {}
    for path in sorted(directory.rglob('*')):
        if path.is_symlink():
            raise RuntimeError(f'Symlinks are forbidden in a release artifact: {path.name}')
        if not path.is_file(): continue
        rel = path.relative_to(directory).as_posix()
        if rel == 'release.json': continue
        if rel.startswith('.') or any(part in {'.git', 'node_modules', '.env'} for part in Path(rel).parts):
            raise RuntimeError(f'Private or development path in frontend build: {rel}')
        data = path.read_bytes()
        files[rel] = {'sha256': sha256_bytes(data), 'bytes': len(data)}
    if 'index.html' not in files or not any(name.endswith('.js') for name in files):
        raise RuntimeError('A release must contain index.html and built JavaScript.')
    return files


def tree_digest(files: dict) -> str:
    return sha256_bytes(json.dumps(files, sort_keys=True, separators=(',', ':')).encode())


def release_metadata(revision: str | None, files: dict, source_clean: bool) -> dict:
    version = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
    if not re.fullmatch(r'[0-9]+\.[0-9]{2}\.[0-9]{3}', version):
        raise RuntimeError('VERSION must use the X.XX.XXX display format.')
    digest = tree_digest(files)
    valid_revision = revision is not None and SHA.fullmatch(revision) is not None
    release_id = f'v{version}-{revision[:12]}-{digest[:12]}' if valid_revision else f'local-v{version}-{digest[:12]}'
    return {'schema': 'floraria-release/v1' if source_clean else 'floraria-local-build/v1',
            'product': 'FLORARIA', 'version': version, 'revision': revision or 'uncommitted', 'source_clean': source_clean,
            'release_id': release_id, 'artifact_tree_sha256': digest,
            'source_commit_time': git('show', '-s', '--format=%cI', revision) if valid_revision else None, 'files': files}


def write_build_receipt() -> None:
    files = tree_manifest(DIST)
    try:
        revision = git('rev-parse', 'HEAD')
        source_clean = clean()
    except subprocess.CalledProcessError:
        revision = None
        source_clean = False
    receipt = {'revision': revision, 'source_clean': source_clean, 'artifact_tree_sha256': tree_digest(files), 'files': files}
    RECEIPT.parent.mkdir(parents=True, exist_ok=True)
    RECEIPT.write_text(json.dumps(receipt, sort_keys=True, indent=2) + '\n', encoding='utf-8')
    (DIST / 'release.json').write_text(json.dumps(release_metadata(revision, files, source_clean),sort_keys=True,indent=2)+'\n',encoding='utf-8')


def package(revision: str) -> Path:
    if not SHA.fullmatch(revision) or git('rev-parse', 'HEAD') != revision or not clean():
        raise RuntimeError('Git source changed between trust check, build and packaging.')
    receipt = json.loads(RECEIPT.read_text(encoding='utf-8'))
    files = tree_manifest(DIST)
    digest = tree_digest(files)
    if receipt != {'revision': revision, 'source_clean': True, 'artifact_tree_sha256': digest, 'files': files}:
        raise RuntimeError('Build receipt does not match the clean source revision and immutable built-file digest.')
    metadata = release_metadata(revision, files, True)
    release_id = metadata['release_id']
    target = ROOT / 'build/releases' / (release_id + '.tar.gz')
    target.parent.mkdir(parents=True, exist_ok=True)
    buffer = io.BytesIO()
    with gzip.GzipFile(fileobj=buffer, mode='wb', mtime=0, filename='') as compressed:
        with tarfile.open(fileobj=compressed, mode='w') as archive:
            entries = {name: (DIST / name).read_bytes() for name in files}
            entries['release.json'] = (json.dumps(metadata, sort_keys=True, indent=2) + '\n').encode()
            for name, data in sorted(entries.items()):
                info = tarfile.TarInfo(name); info.size = len(data); info.mode = 0o644; info.mtime = 0
                archive.addfile(info, io.BytesIO(data))
    payload = buffer.getvalue()
    if target.exists() and target.read_bytes() != payload:
        raise RuntimeError('An existing release identifier has different archive bytes; refusing replacement.')
    target.write_bytes(payload)
    target.with_suffix(target.suffix + '.sha256').write_text(sha256_bytes(payload) + '  ' + target.name + '\n', encoding='ascii')
    return target


def config() -> tuple[str, str, str]:
    key = os.environ.get('FLORARIA_SSH_KEY', '')
    target = os.environ.get('FLORARIA_SSH_TARGET', '')
    domain = os.environ.get('FLORARIA_DOMAIN', 'floraria.fasl-work.com')
    if not key or not Path(key).is_file():
        raise RuntimeError('Set FLORARIA_SSH_KEY to an existing operator-managed SSH identity file.')
    if not re.fullmatch(r'[a-zA-Z0-9_.-]+@[a-zA-Z0-9.-]+', target):
        raise RuntimeError('Set FLORARIA_SSH_TARGET to user@host without ports, options or shell text.')
    if not re.fullmatch(r'[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?', domain) or '.' not in domain or '..' in domain:
        raise RuntimeError('FLORARIA_DOMAIN must be a plain lowercase public hostname.')
    return key, target, domain


def remote(command: list[str], script: Path, key: str, target: str) -> None:
    invocation = 'bash -s -- ' + ' '.join(shlex.quote(part) for part in command)
    # Key paths and identity values are passed as argv, never printed or embedded in a shell string.
    subprocess.run(['ssh', '-i', key, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', target, invocation],
                   input=script.read_text(encoding='utf-8'), text=True, check=True)


def public_identity(domain: str, expected: str) -> dict:
    request = urllib.request.Request(f'https://{domain}/release.json', headers={'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(request, timeout=30) as response:
        metadata = json.load(response)
    if metadata.get('release_id') != expected or metadata.get('product') != 'FLORARIA':
        raise RuntimeError('Public HTTPS release identity does not match the requested release.')
    print(json.dumps({key: metadata[key] for key in ('product', 'version', 'revision', 'release_id')}, indent=2))
    return metadata


def allocate_upload(key: str, target: str) -> str:
    result = subprocess.run(
        ['ssh', '-i', key, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', target,
         'umask 077; mktemp -d /tmp/floraria-upload.XXXXXXXXXX'],
        check=True, capture_output=True, text=True)
    directory = result.stdout.strip()
    if not UPLOAD_DIR.fullmatch(directory):
        raise RuntimeError('Remote upload directory was not the expected private mktemp directory.')
    return directory


def deploy(archive: Path, bootstrap_email: str | None = None) -> None:
    key, target, domain = config()
    release_id = archive.name.removesuffix('.tar.gz')
    if not RELEASE_ID.fullmatch(release_id): raise RuntimeError('Invalid release identifier.')
    digest = sha256_bytes(archive.read_bytes())
    if bootstrap_email is not None:
        remote([domain, bootstrap_email], ROOT / 'deploy/bootstrap.sh', key, target)
    # A private unpredictable parent prevents a local user from preplacing a symlink at the scp target.
    upload_directory = allocate_upload(key, target)
    remote_archive = f'{upload_directory}/floraria-{release_id}.tar.gz'
    subprocess.run(['scp', '-i', key, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', str(archive), f'{target}:{remote_archive}'], check=True)
    remote(['install', domain, release_id, remote_archive, digest], ROOT / 'deploy/install-release.sh', key, target)
    public_identity(domain, release_id)
    print('Deployment identity verified. Complete rendered production QA before reporting delivery.')


def rollback(release_id: str | None) -> None:
    if not release_id or not RELEASE_ID.fullmatch(release_id):
        raise RuntimeError('Rollback requires --release-id with one exact existing immutable release identifier.')
    key, target, domain = config()
    remote(['rollback', domain, release_id], ROOT / 'deploy/install-release.sh', key, target)
    public_identity(domain, release_id)
