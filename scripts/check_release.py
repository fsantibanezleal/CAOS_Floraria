#!/usr/bin/env python3
"""Check version consistency, static-product boundaries and release file hygiene."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import re
import subprocess
import sys
import tomllib

ROOT = Path(__file__).resolve().parents[1]


def validate_version(display: str, semver: str) -> bool:
    return bool(re.fullmatch(r'\d+\.\d{2}\.\d{3}', display)) and '.'.join(str(int(part)) for part in display.split('.')) == semver


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--built', action='store_true')
    parser.add_argument('--git-modes', action='store_true', help='Require executable Git modes for all tracked shell scripts.')
    options = parser.parse_args()
    errors = []
    required = ['VERSION', 'CHANGELOG.md', 'README.md', 'LICENSE', 'SECURITY.md', 'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', '.env.example', 'frontend/package-lock.json']
    for name in required:
        if not (ROOT / name).is_file(): errors.append('Missing required file: '+name)
    if (ROOT / 'VERSION').exists():
        version = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
        package = json.loads((ROOT / 'frontend/package.json').read_text(encoding='utf-8'))
        if not validate_version(version, package['version']): errors.append('VERSION and frontend semantic version disagree.')
        if version not in (ROOT / 'CHANGELOG.md').read_text(encoding='utf-8'): errors.append('Current VERSION is absent from CHANGELOG.md.')
        lock = json.loads((ROOT / 'frontend/package-lock.json').read_text(encoding='utf-8'))
        if lock.get('packages', {}).get('', {}).get('version') != package['version']: errors.append('npm lock root version differs from package.json.')
    config = tomllib.loads((ROOT / 'pyproject.toml').read_text(encoding='utf-8'))
    if 'project' in config or 'build-system' in config: errors.append('Product pyproject.toml must remain tool configuration only, without an installable package.')
    tracked = subprocess.run(['git', 'ls-files', '-s'], cwd=ROOT, check=True, capture_output=True, text=True).stdout.splitlines()
    for line in tracked:
        metadata, name = line.split('\t', 1)
        if name == '.env' or (Path(name).name.startswith('.env.') and name != '.env.example'):
            errors.append('Tracked environment file: '+name)
        if options.git_modes and name.endswith('.sh') and not metadata.startswith('100755 '): errors.append('Shell script is not executable in Git: '+name)
    if options.built:
        dist = ROOT / 'frontend/dist'
        if not (dist / 'index.html').exists(): errors.append('Missing built index.html.')
        else:
            content = (dist / 'index.html').read_text(encoding='utf-8').lower()
            if 'floraria' not in content: errors.append('Built entry does not identify Floraria.')
        for path in dist.rglob('*'):
            if path.is_symlink(): errors.append('Symlink in built artifact: '+path.relative_to(dist).as_posix())
            if path.is_file() and path.name.startswith('.env'): errors.append('Environment file included in built artifact.')
    if errors:
        print('\n'.join('FAIL: '+message for message in errors), file=sys.stderr)
        return 1
    print('Release structure, version and static-product boundaries verified.')
    return 0


if __name__ == '__main__': raise SystemExit(main())
