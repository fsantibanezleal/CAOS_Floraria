#!/usr/bin/env python3
"""Explicitly request the pinned Pages workflow for the reviewed current main SHA."""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys

import release

REPOSITORY = 'fsantibanezleal/CAOS_Floraria'


def dispatch(revision: str | None) -> None:
    if not revision or not release.SHA.fullmatch(revision) or release.git('rev-parse', 'HEAD') != revision:
        raise RuntimeError('Pages dispatch requires --revision with the exact current 40-character HEAD SHA.')
    if not release.clean():
        raise RuntimeError('Commit and promote the reviewed clean source before dispatching Pages.')
    gh = shutil.which('gh')
    if not gh:
        raise RuntimeError('GitHub CLI is required for operator-triggered deployment; main pushes deploy through Actions.')
    remote = subprocess.run([gh, 'api', f'repos/{REPOSITORY}/git/ref/heads/main', '--jq', '.object.sha'],
                            check=True, capture_output=True, text=True, timeout=45).stdout.strip()
    if remote != revision:
        raise RuntimeError('Requested revision is not the current remote main SHA. Promote it first.')
    subprocess.run([gh, 'workflow', 'run', 'deploy-pages.yml', '--repo', REPOSITORY, '--ref', 'main',
                    '--field', f'revision={revision}'], check=True, timeout=45)
    print('Pages workflow requested for the exact reviewed main SHA. Verify its successful run and public release.json before reporting deployment.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--revision', required=True)
    options = parser.parse_args()
    try:
        dispatch(options.revision)
    except (RuntimeError, OSError, subprocess.SubprocessError) as error:
        print(f'Pages dispatch failed: {error}', file=sys.stderr)
        raise SystemExit(1)
