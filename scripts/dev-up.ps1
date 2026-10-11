# FairWork Development Stack Orchestrator (Windows PowerShell)
# Launches and health-checks all 4 microservices in proper sequence

$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "         STARTING FAIRWORK MONOREPO SERVICES         " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

$rootDir = (Get-Item $PSScriptRoot).Parent.FullName

# 1. Start Hardhat Node
Write-Host "`n[1/4] Starting Hardhat Node on port 8545..." -ForegroundColor Yellow
$chainJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm --prefix 'PERSON1 YASH NAIK/contracts' run chain" -WorkingDirectory $rootDir -PassThru

# Wait for Hardhat Node
$nodeReady = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $resp = Invoke-RestMethod -Uri "http://127.0.0.1:8545" -Method Post -Body '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' -ContentType "application/json" -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($resp) { $nodeReady = $true; break }
    } catch {}
    Start-Sleep -Seconds 1
}

if (-not $nodeReady) {
    Write-Host "Failed to reach Hardhat Node on :8545" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Hardhat Node is healthy on :8545" -ForegroundColor Green

# Deploy contracts & run setup
Write-Host "`nDeploying smart contracts and running one-time setup..." -ForegroundColor Yellow
& npm --prefix "$rootDir" run deploy
& npm --prefix "$rootDir" run setup

# 2. Start AI Service (FastAPI)
Write-Host "`n[2/4] Starting AI Service on port 8000..." -ForegroundColor Yellow
$aiJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run ai" -WorkingDirectory $rootDir -PassThru

$aiReady = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $resp = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($resp.status -eq "ok") { $aiReady = $true; break }
    } catch {}
    Start-Sleep -Seconds 1
}

if (-not $aiReady) {
    Write-Host "Failed to reach AI Service on :8000/health" -ForegroundColor Red
    exit 1
}
Write-Host "✓ AI Service is healthy on :8000" -ForegroundColor Green

# 3. Start Backend (Express + Prisma)
Write-Host "`n[3/4] Starting Backend API on port 4000..." -ForegroundColor Yellow
$backendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run backend" -WorkingDirectory $rootDir -PassThru

$backendReady = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $resp = Invoke-RestMethod -Uri "http://localhost:4000/api/health" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($resp.status -eq "ok" -or $resp.success -eq $true -or ($resp.data -and $resp.data.status -eq "ok")) { $backendReady = $true; break }
    } catch {}
    Start-Sleep -Seconds 1
}

if (-not $backendReady) {
    Write-Host "Failed to reach Backend on :4000/api/health" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Backend API is healthy on :4000" -ForegroundColor Green

# 4. Start Frontend (React + Vite)
Write-Host "`n[4/4] Starting Frontend on port 5173..." -ForegroundColor Yellow
$frontendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run frontend" -WorkingDirectory $rootDir -PassThru

$frontendReady = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:5173" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($resp.StatusCode -eq 200) { $frontendReady = $true; break }
    } catch {}
    Start-Sleep -Seconds 1
}

if (-not $frontendReady) {
    Write-Host "Failed to reach Frontend on :5173" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Frontend is healthy on :5173" -ForegroundColor Green

Write-Host "`n====================================================" -ForegroundColor Cyan
Write-Host "      ALL FAIRWORK SERVICES RUNNING SUCCESSFULLY    " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " - Hardhat Node: http://127.0.0.1:8545"
Write-Host " - AI Service:   http://localhost:8000"
Write-Host " - Backend API:  http://localhost:4000/api"
Write-Host " - Frontend UI:  http://localhost:5173"
Write-Host "====================================================" -ForegroundColor Cyan
