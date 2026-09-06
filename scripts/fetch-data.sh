#!/usr/bin/env bash
set -euo pipefail
task_scripts="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$task_scripts/precompute.sh" acquire "$@"
