#!/usr/bin/env bash
set -euo pipefail
task_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
task_python="$task_root/.venv/bin/python"
if [[ ! -x "$task_python" ]]; then task_python="$task_root/.venv/Scripts/python.exe"; fi
if [[ ! -f "$task_python" ]]; then printf '%s\n' 'Run scripts/setup.sh first.' >&2; exit 1; fi
exec "$task_python" "$task_root/data-pipeline/run.py" "$@"
