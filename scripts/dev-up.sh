#!/usr/bin/env bash
# FairWork Development Stack Orchestrator (Bash)
# Launches and health-checks all 4 microservices in proper sequence

set -e

echo "===================================================="
echo "         STARTING FAIRWORK MONOREPO SERVICES         "
echo "===================================================="

# 1. Start Hardhat Node
echo -e "\n[1/4] Starting Hardhat Node on port 8545..."
npm run chain &
CHAIN_PID=$!

echo "Waiting for Hardhat node on :8545..."
until curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' http://127.0.0.1:8545 > /dev/null; do
  sleep 1
done
echo "✓ Hardhat Node is healthy on :8545"

# Deploy contracts & run setup
echo -e "\nDeploying smart contracts and running setup..."
npm run deploy
npm run setup

# 2. Start AI Service (FastAPI)
echo -e "\n[2/4] Starting AI Service on port 8000..."
npm run ai &
AI_PID=$!

echo "Waiting for AI Service on :8000/health..."
until curl -s http://localhost:8000/health | grep -q "ok"; do
  sleep 1
done
echo "✓ AI Service is healthy on :8000"

# 3. Start Backend (Express + Prisma)
echo -e "\n[3/4] Starting Backend API on port 4000..."
npm run backend &
BACKEND_PID=$!

echo "Waiting for Backend API on :4000/api/health..."
until curl -s http://localhost:4000/api/health | grep -q "ok"; do
  sleep 1
done
echo "✓ Backend API is healthy on :4000"

# 4. Start Frontend (React + Vite)
echo -e "\n[4/4] Starting Frontend on port 5173..."
npm run frontend &
FRONTEND_PID=$!

echo "Waiting for Frontend on :5173..."
until curl -s http://localhost:5173 > /dev/null; do
  sleep 1
done
echo "✓ Frontend is healthy on :5173"

echo -e "\n===================================================="
echo "      ALL FAIRWORK SERVICES RUNNING SUCCESSFULLY    "
echo "===================================================="
echo " - Hardhat Node: http://127.0.0.1:8545"
echo " - AI Service:   http://localhost:8000"
echo " - Backend API:  http://localhost:4000/api"
echo " - Frontend UI:  http://localhost:5173"
echo "===================================================="

# Keep alive
wait $CHAIN_PID $AI_PID $BACKEND_PID $FRONTEND_PID
