# FairWork Development Stack Orchestrator (Windows PowerShell)
$ErrorActionPreference = "Stop"
$rootDir = (Get-Item $PSScriptRoot).Parent.FullName
Set-Location $rootDir
node scripts/dev.js

