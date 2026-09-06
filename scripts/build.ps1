param([Parameter(ValueFromRemainingArguments=$true)][string[]]$ScriptArguments)
$ErrorActionPreference = 'Stop'
$FlorariaRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$FlorariaPython = Join-Path $FlorariaRoot '.venv\Scripts\python.exe'
if (Test-Path -LiteralPath $FlorariaPython) {
    & $FlorariaPython (Join-Path $FlorariaRoot 'scripts\project.py') 'build' @ScriptArguments
} else {
    & py -3.13 (Join-Path $FlorariaRoot 'scripts\project.py') 'build' @ScriptArguments
}
exit $LASTEXITCODE
