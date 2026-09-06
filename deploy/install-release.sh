#!/usr/bin/env bash
# Invoked on the server by scripts/release.py. It never deletes historical releases.
set -Eeuo pipefail
mode="${1:-}"
domain="${2:-}"
release_id="${3:-}"
[[ "$mode" == install || "$mode" == rollback ]] || { echo 'Expected install or rollback.' >&2; exit 2; }
[[ "$domain" =~ ^[a-z0-9][a-z0-9.-]*[a-z0-9]$ && "$domain" != *..* ]] || exit 2
[[ "$release_id" =~ ^v[0-9]+\.[0-9]{2}\.[0-9]{3}-[a-f0-9]{12}-[a-f0-9]{12}$ ]] || exit 2
[[ "$EUID" == 0 ]] || { echo 'Run this server installer as root.' >&2; exit 2; }
base="/var/www/$domain"
release_path="$base/releases/$release_id"
[[ -f "/etc/nginx/sites-enabled/$domain" ]] || { echo 'Bootstrap this exact domain before installing a release.' >&2; exit 2; }
exec 9>"/var/lock/floraria-$domain.lock"
flock -n 9 || { echo 'Another Floraria release operation holds the domain lock.' >&2; exit 2; }
nginx -t
nginx -T 2>/dev/null | grep -F "root $base/current;" >/dev/null || { echo 'nginx does not use the expected current release root.' >&2; exit 2; }
mkdir -p "$base/releases"
archive="${4:-}"
archive_sha="${5:-}"
if [[ "$mode" == install ]]; then
  upload_directory="${archive%/*}"
  [[ "$upload_directory" =~ ^/tmp/floraria-upload\.[a-zA-Z0-9]{10}$ ]] || exit 2
  [[ "$archive" == "$upload_directory/floraria-$release_id.tar.gz" && -f "$archive" && ! -L "$archive" ]] || exit 2
  [[ -d "$upload_directory" && ! -L "$upload_directory" && "$(stat -c '%u:%a' "$upload_directory")" == '0:700' ]] || { echo 'Upload directory must be root-owned and private (0700).' >&2; exit 2; }
  [[ "$archive_sha" =~ ^[a-f0-9]{64}$ ]] || exit 2
  printf '%s  %s\n' "$archive_sha" "$archive" | sha256sum --check --status
fi

# Validate every path, byte count, hash and release identity before publishing a symlink.
python3 - "$mode" "$release_path" "$release_id" "$archive" <<'PY'
from pathlib import Path, PurePosixPath
import hashlib, json, os, shutil, sys, tarfile
mode, target_text, release_id, archive_path = sys.argv[1:]
target = Path(target_text)

def check_name(name):
    p = PurePosixPath(name)
    if not name or p.is_absolute() or '..' in p.parts or '.' in p.parts or '\\' in name or ':' in name:
        raise SystemExit('Invalid path in release artifact.')
    if str(p) != name or name.startswith('.'):
        raise SystemExit('Noncanonical path in release artifact.')

def validate(directory):
    if directory.is_symlink() or not directory.is_dir():
        raise SystemExit('Release directory is missing or is a symlink.')
    meta = json.loads((directory / 'release.json').read_text(encoding='utf-8'))
    if meta.get('schema') != 'floraria-release/v1' or meta.get('product') != 'FLORARIA' or meta.get('source_clean') is not True or meta.get('release_id') != release_id:
        raise SystemExit('Release metadata identity mismatch.')
    files = meta['files']
    digest = hashlib.sha256(json.dumps(files,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    if digest != meta['artifact_tree_sha256'] or not release_id.endswith('-'+digest[:12]):
        raise SystemExit('Release tree digest mismatch.')
    if release_id != 'v'+meta['version']+'-'+meta['revision'][:12]+'-'+digest[:12]:
        raise SystemExit('Release version or source identity mismatch.')
    actual = set()
    for p in directory.rglob('*'):
        if p.is_symlink(): raise SystemExit('Symlinks are forbidden inside releases.')
        if p.is_file() and p.relative_to(directory).as_posix() != 'release.json': actual.add(p.relative_to(directory).as_posix())
    if actual != set(files) or 'index.html' not in files:
        raise SystemExit('Release file inventory mismatch.')
    for name, expected in files.items():
        check_name(name)
        p = directory / name
        if p.stat().st_size != expected['bytes'] or hashlib.sha256(p.read_bytes()).hexdigest() != expected['sha256']:
            raise SystemExit('Release file byte/hash mismatch: '+name)
    return meta

if mode == 'install' and not target.exists():
    staging = target.with_name('.staging-'+release_id)
    if staging.exists(): raise SystemExit('Staging path already exists; inspect the earlier interrupted operation.')
    with tarfile.open(archive_path,'r:gz') as archive:
        members = archive.getmembers()
        seen=set()
        for member in members:
            check_name(member.name)
            if not member.isfile() or member.name in seen: raise SystemExit('Only unique regular files are accepted.')
            seen.add(member.name)
        if sum(m.size for m in members) > 2*1024**3: raise SystemExit('Release exceeds the 2 GiB static-artifact guard.')
        available=shutil.disk_usage(target.parent).free
        if available < sum(m.size for m in members)*2+100*1024**2: raise SystemExit('Insufficient free space for atomic release staging.')
        staging.mkdir(mode=0o755)
        for member in members:
            destination=staging/member.name
            destination.parent.mkdir(parents=True,exist_ok=True)
            with archive.extractfile(member) as source, destination.open('xb') as sink:
                shutil.copyfileobj(source,sink)
            destination.chmod(0o644)
    validate(staging)
    staging.rename(target)
validate(target)
print('Validated immutable release '+release_id)
PY

previous=''
if [[ -L "$base/current" ]]; then
  previous="$(readlink -f "$base/current")"
  [[ "$previous" == "$base/releases/"* && -d "$previous" ]] || { echo 'Previous symlink escaped the release root.' >&2; exit 2; }
elif [[ -e "$base/current" ]]; then
  echo 'Current is not a symlink; refusing to replace existing content.' >&2
  exit 2
fi
temporary="$base/.current-$release_id-$$"
switched=0
restore_on_failure() {
  if [[ "$switched" == 1 && -n "$previous" ]]; then
    ln -s "$previous" "$temporary-restore"
    mv -Tf "$temporary-restore" "$base/current"
    echo 'Restored previous release after failed post-switch check.' >&2
  elif [[ "$switched" == 1 && -L "$base/current" ]]; then
    rm -f -- "$base/current"
    echo 'Removed failed first-release symlink; no prior release existed.' >&2
  fi
}
trap restore_on_failure ERR
ln -s "$release_path" "$temporary"
mv -Tf "$temporary" "$base/current"
switched=1
nginx -t
[[ "$(readlink -f "$base/current")" == "$release_path" ]]
trap - ERR
if [[ "$mode" == install ]]; then
  rm -f -- "$archive"
  rmdir -- "$upload_directory"
fi
printf 'Current release: %s\n' "$release_id"
if [[ -n "$previous" ]]; then printf 'Previous release: %s\n' "$(basename "$previous")"; fi
