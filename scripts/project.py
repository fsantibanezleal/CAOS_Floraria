#!/usr/bin/env python3
"""Cross-platform local commands for Floraria. No installable product package."""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
VENV = ROOT / '.venv' / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')


def run(command: list[str], *, capture: bool = False, env: dict[str, str] | None = None) -> str:
    completed = subprocess.run(command, cwd=ROOT, check=True, text=True,
                               stdout=subprocess.PIPE if capture else None, env=env)
    return completed.stdout.strip() if capture else ''


def node_check() -> str:
    node = shutil.which('node')
    npm = shutil.which('npm.cmd' if os.name == 'nt' else 'npm')
    if not node or not npm:
        raise RuntimeError('Node.js 22 or 24 and npm are required. Run scripts/local/00_install-prereqs.ps1.')
    version = run([node, '--version'], capture=True)
    if int(version.lstrip('v').split('.')[0]) not in {22, 24}:
        raise RuntimeError(f'Unsupported Node.js {version}; install supported Node.js 22 or 24.')
    return npm


def python_check() -> None:
    if sys.version_info[:2] != (3, 13):
        raise RuntimeError('Python 3.13 is required. Windows: py -3.13; Linux/macOS: python3.13.')


def py(script: str, *arguments: str) -> None:
    if not VENV.exists():
        raise RuntimeError('Virtual environment missing. Run scripts/setup.ps1 or scripts/setup.sh first.')
    run([str(VENV), script, *arguments])


def npm(command: str, *arguments: str) -> None:
    executable = node_check()
    run([executable, '--prefix', str(ROOT / 'frontend'), command, *arguments])


def setup() -> None:
    python_check()
    node_check()
    if not VENV.exists():
        run([sys.executable, '-m', 'venv', str(ROOT / '.venv')])
    run([str(VENV), '-m', 'pip', 'install', '-r', 'requirements-dev.txt'])
    env = ROOT / '.env'
    if not env.exists():
        shutil.copyfile(ROOT / '.env.example', env)
    canonical = ROOT / 'manifests/catalog.json'
    if canonical.exists():
        py('data-pipeline/run.py', 'verify', '--offline')
    else:
        py('data-pipeline/run.py', 'all')
    npm('ci')
    print('Setup complete. Next: scripts/local/03_dev.ps1 or scripts/local/03_dev.sh.')


def test() -> None:
    python_check()
    py('scripts/check_content_standards.py')
    py('scripts/check_template_residue.py')
    py('scripts/check_release.py')
    py('scripts/check_artifacts.py')
    run([str(VENV), '-m', 'unittest', 'discover', '-s', 'tests', '-v'])
    npm('run', 'test')


def build() -> None:
    test()
    npm('run', 'build')
    py('scripts/check_release.py', '--built')
    import release
    release.write_build_receipt()
    print('Build verified. Preview: scripts/preview.ps1 or scripts/preview.sh.')


def verify_ui(base_url: str | None, browser_cache: str | None, install_browser: bool) -> None:
    executable = node_check()
    environment = os.environ.copy()
    environment['FLORARIA_QA_URL'] = base_url or environment.get('FLORARIA_QA_URL', 'http://127.0.0.1:5902')
    if not re.fullmatch(r'https?://[a-zA-Z0-9.\-]+(?::[0-9]+)?/?', environment['FLORARIA_QA_URL']):
        raise RuntimeError('Browser QA URL must be an HTTP(S) origin, without credentials, query or path.')
    cache = browser_cache or environment.get('PLAYWRIGHT_BROWSERS_PATH') or str(ROOT / 'build/playwright')
    environment['PLAYWRIGHT_BROWSERS_PATH'] = cache if cache == '0' else str(Path(cache).expanduser().resolve())
    environment.setdefault('FLORARIA_QA_DIR', str(ROOT / 'build/qa/studio'))
    if install_browser:
        node = shutil.which('node')
        run([node, str(ROOT / 'frontend/node_modules/playwright/cli.js'), 'install', 'chromium'], env=environment)
    print('Browser QA expects an already-running Floraria dev, preview or public HTTPS site; it does not start or reuse a server automatically.')
    run([executable, '--prefix', str(ROOT / 'frontend'), 'run', 'test:browser'], env=environment)


def smoke(base_url: str) -> None:
    if not re.fullmatch(r'https?://[a-zA-Z0-9.\-]+(?::[0-9]+)?/?', base_url):
        raise RuntimeError('Smoke URL must be an HTTP(S) origin, with no credentials, query or path.')
    base = base_url.rstrip('/')
    request = urllib.request.Request(base + '/', headers={'User-Agent': 'Floraria-release-smoke/1'})
    with urllib.request.urlopen(request, timeout=25) as response:
        page = response.read().decode('utf-8')
        if response.status != 200 or 'floraria' not in page.lower() or '<html' not in page.lower():
            raise RuntimeError('Homepage did not return Floraria HTML with HTTP 200.')
    with urllib.request.urlopen(base + '/release.json', timeout=25) as response:
        metadata = json.load(response)
    if metadata.get('product') != 'FLORARIA' or not metadata.get('revision') or not metadata.get('release_id'):
        raise RuntimeError('Public release metadata is incomplete. Build with scripts/build before preview, and deploy a verified package.')
    print(json.dumps({key: metadata[key] for key in ('product', 'version', 'revision', 'release_id')}, indent=2))
    print('Transport and release identity verified. Rendered browser QA is a separate required gate.')


def main(arguments: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['prereqs', 'setup', 'generate-data', 'dev', 'test', 'build', 'preview', 'smoke', 'verify-ui', 'prepare-pages', 'deploy', 'rollback', 'legacy-vps-deploy', 'legacy-vps-rollback', 'package-release'])
    parser.add_argument('--release', action='store_true', help='Explicitly regenerate canonical data instead of a sandbox.')
    parser.add_argument('--url', help='HTTP(S) origin for transport smoke or browser QA.')
    parser.add_argument('--browser-cache', help='Explicit Playwright browser cache path; defaults to PLAYWRIGHT_BROWSERS_PATH or build/playwright.')
    parser.add_argument('--install-browser', action='store_true', help='Explicitly install the pinned Playwright Chromium before running browser QA.')
    parser.add_argument('--revision', help='Exact 40-character Git revision for release packaging/deployment.')
    parser.add_argument('--require-clean', action='store_true', help='Require clean source when staging a Pages publishing artifact.')
    parser.add_argument('--approved-sha', help='Operator-approved exact revision if origin/main does not contain it.')
    parser.add_argument('--release-id', help='Exact existing remote release identifier for rollback.')
    parser.add_argument('--bootstrap', action='store_true', help='Explicitly create the new nginx hostname and HTTPS certificate before the first deployment.')
    parser.add_argument('--certificate-email', help='Operator contact email for first-time certificate bootstrap.')
    options = parser.parse_args(arguments)
    command = options.command
    if command == 'prereqs':
        python_check(); node_check()
        if not shutil.which('git'):
            raise RuntimeError('Git is required.')
        print('Python 3.13, Node.js 22/24, npm and Git are available. No system software was installed.')
        print('Next: scripts/local/01_init.ps1 or scripts/local/01_init.sh.')
    elif command == 'setup': setup()
    elif command == 'generate-data':
        args = []
        if not options.release:
            sandbox = ROOT / 'build/local'
            (sandbox / 'data/sources').mkdir(parents=True, exist_ok=True)
            for source in ['catalog-source.json', 'assets.lock.json']:
                shutil.copyfile(ROOT / 'data/sources' / source, sandbox / 'data/sources' / source)
            shutil.copytree(ROOT / 'data/artifacts/assets', sandbox / 'data/raw/assets', dirs_exist_ok=True)
            args = ['--root', str(sandbox), '--offline']
        py('data-pipeline/run.py', 'all', *args)
        print('Data generation complete. Next: scripts/local/03_dev.ps1 or scripts/local/03_dev.sh.')
    elif command == 'dev': npm('run', 'dev', '--', '--host', '127.0.0.1', '--port', '5902', '--strictPort')
    elif command == 'preview': npm('run', 'preview', '--', '--host', '127.0.0.1', '--port', '4902', '--strictPort')
    elif command == 'test': test()
    elif command == 'build': build()
    elif command == 'smoke': smoke(options.url or 'https://floraria.fasl-work.com')
    elif command == 'verify-ui': verify_ui(options.url, options.browser_cache, options.install_browser)
    elif command == 'prepare-pages':
        import prepare_pages
        print(json.dumps(prepare_pages.prepare(revision=options.revision, require_clean=options.require_clean), indent=2))
    elif command == 'deploy':
        import deploy_pages
        deploy_pages.dispatch(options.revision)
    elif command == 'rollback':
        raise RuntimeError('Pages recovery uses a reviewed Git revert/promotion or a retained prior Actions artifact; see deploy/README.md. The historical VPS command is explicitly named legacy-vps-rollback.')
    else:
        import release
        if command == 'legacy-vps-rollback': release.rollback(options.release_id)
        else:
            revision = release.trusted_revision(options.revision, options.approved_sha)
            build()
            archive = release.package(revision)
            if command == 'legacy-vps-deploy':
                if options.bootstrap and not options.certificate_email:
                    raise RuntimeError('--bootstrap requires --certificate-email.')
                release.deploy(archive, options.certificate_email if options.bootstrap else None)
            else: print(archive)
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError as error:
        print(f'Floraria command failed: subprocess exited with code {error.returncode}.', file=sys.stderr)
        raise SystemExit(1)
    except (RuntimeError, OSError, ValueError) as error:
        print(f'Floraria command failed: {error}', file=sys.stderr)
        raise SystemExit(1)
