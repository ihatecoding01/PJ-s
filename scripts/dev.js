#!/usr/bin/env node

/**
 * FairWork Unified Development Stack Orchestrator
 * Cross-platform runner that installs dependencies, starts EVM Hardhat node,
 * deploys smart contracts, seeds demo personas, and launches AI, Backend, and Frontend.
 */

import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const isWin = process.platform === 'win32';

// ANSI color formatting
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
};

function log(tag, msg, color = c.reset) {
  const ts = new Date().toLocaleTimeString();
  console.log(`${c.dim}[${ts}]${c.reset} ${color}${c.bold}[${tag}]${c.reset} ${msg}`);
}

const processes = [];

function registerProcess(proc, name) {
  processes.push({ proc, name });
  proc.on('exit', (code, signal) => {
    if (signal !== 'SIGINT' && signal !== 'SIGTERM' && code !== 0) {
      log(name, `Process exited with code ${code ?? signal}`, c.red);
    }
  });
}

function cleanup() {
  log('SHUTDOWN', 'Stopping all FairWork services...', c.yellow);
  for (const { proc, name } of processes) {
    try {
      if (isWin && proc.pid) {
        // Force kill process tree on Windows
        execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: 'ignore' });
      } else {
        proc.kill('SIGTERM');
      }
    } catch {}
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', () => {
  for (const { proc } of processes) {
    try { proc.kill(); } catch {}
  }
});

async function checkUrl(url, options = {}) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

async function waitForUrl(url, name, maxSeconds = 35, options = {}) {
  const start = Date.now();
  while ((Date.now() - start) / 1000 < maxSeconds) {
    if (await checkUrl(url, options)) return true;
    await new Promise(r => setTimeout(r, 1000));
  }
  return false;
}

function pipeOutput(proc, name, color) {
  proc.stdout?.on('data', data => {
    const lines = data.toString().trim().split('\n');
    for (const line of lines) {
      if (line.trim()) log(name, line, color);
    }
  });
  proc.stderr?.on('data', data => {
    const lines = data.toString().trim().split('\n');
    for (const line of lines) {
      if (line.trim()) log(name, line, c.red);
    }
  });
}

async function main() {
  console.log(`\n${c.cyan}${c.bold}====================================================`);
  console.log(`        FAIRWORK UNIFIED DEVELOPMENT STACK          `);
  console.log(`====================================================${c.reset}\n`);

  // --- Step 0: Preflight Dependency Verification ---
  log('PREFLIGHT', 'Checking project dependencies across all 4 modules...', c.cyan);

  const subprojects = [
    { name: 'Root', dir: rootDir },
    { name: 'Smart Contracts', dir: path.join(rootDir, 'PERSON1 SCARLET', 'contracts') },
    { name: 'Backend', dir: path.join(rootDir, 'PERSON2 JONAH', 'backend') },
    { name: 'Frontend', dir: path.join(rootDir, 'PERSON4 SUZAN') },
  ];

  for (const sub of subprojects) {
    const nmPath = path.join(sub.dir, 'node_modules');
    if (!fs.existsSync(nmPath)) {
      log('PREFLIGHT', `Installing missing dependencies for ${sub.name}...`, c.yellow);
      execSync('npm install', { cwd: sub.dir, stdio: 'inherit', shell: true });
    }
  }

  // --- Step 1: EVM Hardhat Node (:8545) ---
  log('CHAIN', 'Checking Hardhat node on http://127.0.0.1:8545...', c.yellow);
  const chainReady = await checkUrl('http://127.0.0.1:8545', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'net_version', params: [], id: 1 })
  });

  if (!chainReady) {
    log('CHAIN', 'Spawning local Hardhat EVM Node...', c.yellow);
    const contractsDir = path.join(rootDir, 'PERSON1 SCARLET', 'contracts');
    const chainProc = spawn('npx', ['hardhat', 'node'], {
      cwd: contractsDir,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    registerProcess(chainProc, 'CHAIN');
    pipeOutput(chainProc, 'CHAIN', c.yellow);

    const ready = await waitForUrl('http://127.0.0.1:8545', 'CHAIN', 30, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'net_version', params: [], id: 1 })
    });

    if (!ready) {
      log('CHAIN', 'Hardhat node failed to respond on :8545 within 30s.', c.red);
      cleanup();
    }
  }
  log('CHAIN', '✓ Hardhat EVM node is healthy on :8545 (Chain ID: 31337)', c.green);

  // Deploy contracts & run platform setup
  log('CONTRACTS', 'Deploying FairWork.sol to local EVM node...', c.cyan);
  try {
    execSync('npm run deploy', { cwd: rootDir, stdio: 'inherit', shell: true });
    log('CONTRACTS', 'Running one-time platform setup and seeding demo personas...', c.cyan);
    execSync('node scripts/setup-demo.js', { cwd: rootDir, stdio: 'inherit', shell: true });
    log('CONTRACTS', '✓ Smart contracts deployed and initialized successfully', c.green);
  } catch (err) {
    log('CONTRACTS', `Deployment/setup failed: ${err.message}`, c.red);
  }

  // --- Step 2: AI Verification Engine (:8000) ---
  log('AI', 'Checking AI FastAPI engine on http://localhost:8000/health...', c.magenta);
  const aiReady = await checkUrl('http://localhost:8000/health');

  if (!aiReady) {
    log('AI', 'Spawning Python FastAPI AI Engine...', c.magenta);
    const pythonExe = isWin
      ? path.join(rootDir, 'PERSON3 PERCY', 'venv', 'Scripts', 'python.exe')
      : path.join(rootDir, 'PERSON3 PERCY', 'venv', 'bin', 'python');

    const aiProc = spawn(pythonExe, [
      '-m', 'uvicorn',
      'app.main:app',
      '--host', '0.0.0.0',
      '--port', '8000',
      '--app-dir', 'PERSON3 PERCY'
    ], {
      cwd: rootDir,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    registerProcess(aiProc, 'AI');
    pipeOutput(aiProc, 'AI', c.magenta);

    const ready = await waitForUrl('http://localhost:8000/health', 'AI', 30);
    if (!ready) {
      log('AI', 'AI service failed to respond on :8000 within 30s.', c.red);
    }
  }
  log('AI', '✓ AI Engine is healthy on http://localhost:8000', c.green);

  // --- Step 3: Backend REST API & Oracle (:4000) ---
  log('BACKEND', 'Checking Backend API on http://localhost:4000/api/health...', c.blue);
  const backendReady = await checkUrl('http://localhost:4000/api/health');

  if (!backendReady) {
    const backendDir = path.join(rootDir, 'PERSON2 JONAH', 'backend');
    // Ensure sqlite database is pushed
    try {
      execSync('npx prisma db push --skip-generate', { cwd: backendDir, stdio: 'ignore', shell: true });
    } catch {}

    log('BACKEND', 'Spawning Express & Prisma Backend...', c.blue);
    const backendProc = spawn('npm', ['run', 'dev'], {
      cwd: backendDir,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    registerProcess(backendProc, 'API');
    pipeOutput(backendProc, 'API', c.blue);

    const ready = await waitForUrl('http://localhost:4000/api/health', 'BACKEND', 30);
    if (!ready) {
      log('BACKEND', 'Backend failed to respond on :4000 within 30s.', c.red);
    }
  }
  log('BACKEND', '✓ Backend REST API is healthy on http://localhost:4000/api', c.green);

  // --- Step 4: Frontend UI (:5173) ---
  log('FRONTEND', 'Checking Frontend on http://localhost:5173...', c.green);
  const frontendReady = await checkUrl('http://localhost:5173');

  if (!frontendReady) {
    const frontendDir = path.join(rootDir, 'PERSON4 SUZAN');
    log('FRONTEND', 'Spawning Vite Development Server...', c.green);
    const frontendProc = spawn('npm', ['run', 'dev'], {
      cwd: frontendDir,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    registerProcess(frontendProc, 'WEB');
    pipeOutput(frontendProc, 'WEB', c.green);

    await waitForUrl('http://localhost:5173', 'FRONTEND', 30);
  }
  log('FRONTEND', '✓ Frontend is healthy on http://localhost:5173', c.green);

  console.log(`\n${c.cyan}${c.bold}====================================================`);
  console.log(`      ALL FAIRWORK SERVICES RUNNING IN HARMONY      `);
  console.log(`====================================================${c.reset}`);
  console.log(` ${c.bold}1. EVM Node:${c.reset}    http://127.0.0.1:8545 (Chain ID: 31337)`);
  console.log(` ${c.bold}2. AI Engine:${c.reset}   http://localhost:8000/docs`);
  console.log(` ${c.bold}3. Backend API:${c.reset} http://localhost:4000/api/health`);
  console.log(` ${c.bold}4. Web Client:${c.reset}  http://localhost:5173`);
  console.log(`${c.dim}Press Ctrl+C at any time to gracefully terminate all services.${c.reset}\n`);

  // Keep event loop alive
  setInterval(() => {}, 10000);
}

main().catch(err => {
  console.error(`${c.red}[FATAL ERROR]${c.reset} ${err.message}`);
  cleanup();
});
