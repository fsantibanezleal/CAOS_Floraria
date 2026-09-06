# Explicit pipeline invocation. Use --root with a prepared sandbox for experiments.
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskPython = Join-Path $taskRoot '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $taskPython)) { throw 'Run scripts/setup.ps1 to create the Python environment.' }
& $taskPython (Join-Path $taskRoot 'data-pipeline/run.py') @args
exit $LASTEXITCODE
