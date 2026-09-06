#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FLORARIA_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
if [[ -x "$FLORARIA_ROOT/.venv/bin/python" ]]; then
  FLORARIA_PYTHON=("$FLORARIA_ROOT/.venv/bin/python")
elif [[ -x "$FLORARIA_ROOT/.venv/Scripts/python.exe" ]]; then
  FLORARIA_PYTHON=("$FLORARIA_ROOT/.venv/Scripts/python.exe")
elif command -v python3.13 >/dev/null 2>&1; then
  FLORARIA_PYTHON=(python3.13)
elif command -v py >/dev/null 2>&1; then
  FLORARIA_PYTHON=(py -3.13)
else
  echo 'Python 3.13 is required. Install it before running Floraria setup.' >&2
  exit 1
fi
exec "${FLORARIA_PYTHON[@]}" "$FLORARIA_ROOT/scripts/project.py" 'test' "$@"
