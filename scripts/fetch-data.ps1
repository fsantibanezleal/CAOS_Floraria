# Acquire only locked source files; never exports or changes the public catalog.
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'precompute.ps1') acquire @args
exit $LASTEXITCODE
