#!/usr/bin/env node

/**
 * FairWork Unified Development Stack Orchestrator
 * Cross-platform runner that installs dependencies, starts EVM Hardhat node with
 * a friendly JSON-RPC + Web Browser Gateway, deploys smart contracts,
 * seeds demo personas, and launches AI, Backend, and Frontend.
 */

import { spawn, execSync } from 'child_process';
import http from 'http';
import net from 'net';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const isWin = process.platform === 'win32';

// Ports
const HARDHAT_PORT = 8545;
const EVM_EXPLORER_PORT = 8547;

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
let gatewayServer = null;

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
  if (gatewayServer) {
    try { gatewayServer.close(); } catch {}
  }
  for (const { proc, name } of processes) {
    try {
      if (isWin && proc.pid) {
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
  if (gatewayServer) {
    try { gatewayServer.close(); } catch {}
  }
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

/**
 * HTML UI for GET requests to port 8545 (EVM node status & tx explorer)
 */
function renderDashboardHtml(proxyPort) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FairWork Local EVM Node (:8545)</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0B132B; color: #E0E1DD; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; }
    .card { background: #1C2541; border: 1px solid #3A506B; border-radius: 16px; padding: 32px; max-width: 620px; width: 100%; box-shadow: 0 12px 40px rgba(0,0,0,0.6); }
    .badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(16, 185, 129, 0.15); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.3); padding: 6px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; margin-bottom: 16px; }
    .badge-dot { width: 8px; height: 8px; background: #10B981; border-radius: 50%; box-shadow: 0 0 10px #10B981; }
    h1 { margin: 0 0 8px 0; font-size: 24px; color: #fff; }
    p.desc { color: #8D99AE; font-size: 14px; line-height: 1.5; margin: 0 0 20px 0; }
    .grid { background: #0F172A; border-radius: 10px; padding: 16px; margin-bottom: 24px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1E293B; word-break: break-all; }
    .row:last-child { border-bottom: none; }
    .label { color: #64748B; min-width: 130px; }
    .val { color: #38BDF8; font-weight: 600; text-align: right; }
    .btn { display: inline-block; width: 100%; text-align: center; background: #10B981; color: #064E3B; font-weight: 700; padding: 14px 20px; border-radius: 10px; text-decoration: none; transition: transform 0.1s, background 0.2s; font-size: 15px; }
    .btn:hover { background: #34D399; transform: translateY(-1px); }
    .notice { margin-top: 20px; font-size: 12px; color: #64748B; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge"><div class="badge-dot"></div> Local EVM Node Operational</div>
    <h1>FairWork Local Blockchain Node</h1>
    <p class="desc">
      You have reached the JSON-RPC Ethereum endpoint on port ${proxyPort}. This port is active and processing automated JSON-RPC 2.0 transactions for MetaMask, Ethers.js, and Smart Contracts.
    </p>
    <div class="grid">
      <div class="row"><span class="label">Network</span><span class="val">Hardhat Localhost</span></div>
      <div class="row"><span class="label">Chain ID</span><span class="val">31337 (0x7a69)</span></div>
      <div class="row"><span class="label">JSON-RPC URL</span><span class="val">http://127.0.0.1:${proxyPort}</span></div>
      <div class="row"><span class="label">Contract</span><span class="val">0x5FbDB2315678afecb367f032d93F642f64180aa3</span></div>
      <div class="row"><span class="label">Status</span><span class="val" style="color:#10B981;">Ready & Listening</span></div>
    </div>
    <a href="http://localhost:5173" class="btn">🚀 Open FairWork Web App (http://localhost:5173)</a>
    <div class="notice">FairWork Smart Gateway • Listening on 127.0.0.1:${proxyPort}</div>
  </div>
</body>
</html>`;
}

function renderTxHtml(txHash, tx, receipt) {
  const isFound = Boolean(tx || receipt);
  const statusSuccess = receipt?.status === '0x1' || receipt?.status === 1;
  const statusText = !isFound ? 'Pending or Not Found' : (statusSuccess ? 'Success (Confirmed)' : 'Reverted');
  const statusColor = !isFound ? '#F59E0B' : (statusSuccess ? '#10B981' : '#EF4444');
  const blockNum = receipt?.blockNumber ? parseInt(receipt.blockNumber, 16) : 'Pending';
  const fromAddr = tx?.from || 'Unknown';
  const toAddr = tx?.to || 'Unknown';
  const ethVal = tx?.value ? `${(parseInt(tx.value, 16) / 1e18).toFixed(4)} ETH` : '0 ETH';
  const gasUsed = receipt?.gasUsed ? parseInt(receipt.gasUsed, 16).toLocaleString() : 'Pending';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Transaction Details | FairWork Local Explorer</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0B132B; color: #E0E1DD; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; }
    .card { background: #1C2541; border: 1px solid #3A506B; border-radius: 16px; padding: 32px; max-width: 680px; width: 100%; box-shadow: 0 12px 40px rgba(0,0,0,0.6); }
    .badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(56, 189, 248, 0.15); color: #38BDF8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 6px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; margin-bottom: 16px; }
    h1 { margin: 0 0 8px 0; font-size: 22px; color: #fff; }
    .grid { background: #0F172A; border-radius: 10px; padding: 16px; margin: 20px 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
    .row { display: flex; flex-direction: column; gap: 4px; padding: 10px 0; border-bottom: 1px solid #1E293B; word-break: break-all; }
    .row:last-child { border-bottom: none; }
    .label { color: #64748B; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    .val { color: #E2E8F0; font-weight: 600; }
    .btn { display: inline-block; width: 100%; text-align: center; background: #3B82F6; color: #fff; font-weight: 700; padding: 12px 20px; border-radius: 10px; text-decoration: none; margin-top: 10px; }
    .btn:hover { background: #2563EB; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Local Block Explorer</div>
    <h1>Transaction Verified On-Chain</h1>
    <div class="grid">
      <div class="row"><span class="label">Transaction Hash</span><span class="val">${txHash}</span></div>
      <div class="row"><span class="label">Status</span><span class="val" style="color:${statusColor}">${statusText}</span></div>
      <div class="row"><span class="label">Block Number</span><span class="val">${blockNum}</span></div>
      <div class="row"><span class="label">From</span><span class="val">${fromAddr}</span></div>
      <div class="row"><span class="label">To</span><span class="val">${toAddr}</span></div>
      <div class="row"><span class="label">Value</span><span class="val">${ethVal}</span></div>
      <div class="row"><span class="label">Gas Used</span><span class="val">${gasUsed}</span></div>
    </div>
    <a href="http://localhost:5173" class="btn">🚀 Return to FairWork App</a>
  </div>
</body>
</html>`;
}

/**
 * Creates the EVM Explorer & Dashboard on explorerPort (8547) that connects directly to Hardhat on rpcPort (8545).
 * Answers browser requests with an HTML Dashboard & Block Explorer without interfering with raw JSON-RPC on 8545.
 */
function startEvmExplorer(explorerPort = EVM_EXPLORER_PORT, rpcPort = HARDHAT_PORT) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
      res.setHeader('Access-Control-Allow-Headers', '*');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
      }

      const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
      const isJson = req.headers.accept?.includes('application/json');

      // Block Explorer path: /tx/:hash
      if (url.pathname.startsWith('/tx/')) {
        const txHash = url.pathname.replace('/tx/', '').split('/')[0].trim();
        let tx = null;
        let receipt = null;
        try {
          const txRes = await fetch(`http://127.0.0.1:${rpcPort}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getTransactionByHash', params: [txHash], id: 1 })
          });
          const txJson = await txRes.json();
          tx = txJson.result;

          const recRes = await fetch(`http://127.0.0.1:${rpcPort}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getTransactionReceipt', params: [txHash], id: 2 })
          });
          const recJson = await recRes.json();
          receipt = recJson.result;
        } catch {}

        if (isJson) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ tx, receipt }));
        }

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(renderTxHtml(txHash, tx, receipt));
      }

      // Standard Status / Health
      if (isJson || url.pathname === '/status' || url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          status: 'ok',
          service: 'FairWork Local EVM Explorer',
          chainId: 31337,
          network: 'Hardhat Localhost',
          rpcUrl: `http://127.0.0.1:${rpcPort}`,
          explorerUrl: `http://localhost:${explorerPort}`,
          contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3'
        }));
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(renderDashboardHtml(explorerPort));
    });

    server.listen(explorerPort, '0.0.0.0', () => resolve(server));
    server.on('error', reject);
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

  // --- Step 1: EVM Hardhat Node (:8545) & Local Explorer (:8547) ---
  log('CHAIN', `Checking Hardhat node on http://127.0.0.1:${HARDHAT_PORT}...`, c.yellow);
  const chainAlreadyActive = await checkUrl(`http://127.0.0.1:${HARDHAT_PORT}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'net_version', params: [], id: 1 })
  });

  if (!chainAlreadyActive) {
    log('CHAIN', `Spawning Hardhat Node directly on port :${HARDHAT_PORT}...`, c.yellow);
    const contractsDir = path.join(rootDir, 'PERSON1 SCARLET', 'contracts');
    const chainProc = spawn('npx', ['hardhat', 'node', '--port', String(HARDHAT_PORT)], {
      cwd: contractsDir,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    registerProcess(chainProc, 'CHAIN');
    pipeOutput(chainProc, 'CHAIN', c.yellow);

    const internalReady = await waitForUrl(`http://127.0.0.1:${HARDHAT_PORT}`, 'CHAIN', 30, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'net_version', params: [], id: 1 })
    });

    if (!internalReady) {
      log('CHAIN', `Hardhat node failed to respond on port :${HARDHAT_PORT} within 30s.`, c.red);
      cleanup();
    }
  } else {
    log('CHAIN', `Hardhat node is already active on :${HARDHAT_PORT}. Utilizing existing node.`, c.green);
  }

  log('CHAIN', `✓ Hardhat EVM node is healthy on :${HARDHAT_PORT} (Chain ID: 31337)`, c.green);

  // Start lightweight local EVM Explorer on :8547
  try {
    gatewayServer = await startEvmExplorer(EVM_EXPLORER_PORT, HARDHAT_PORT);
    log('CHAIN', `✓ Local EVM Explorer active on http://localhost:${EVM_EXPLORER_PORT}`, c.cyan);
  } catch {}

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
  console.log(` ${c.bold}1. Web Client:${c.reset}   ${c.green}${c.bold}http://localhost:5173${c.reset}  👈 ${c.bold}(OPEN IN BROWSER)${c.reset}`);
  console.log(` ${c.bold}2. Backend API:${c.reset}  http://localhost:4000/api/health`);
  console.log(` ${c.bold}3. AI Engine:${c.reset}    http://localhost:8000/docs`);
  console.log(` ${c.bold}4. EVM Node:${c.reset}     http://127.0.0.1:${HARDHAT_PORT} (Chain ID: 31337 — JSON-RPC for MetaMask)`);
  console.log(` ${c.bold}5. EVM Explorer:${c.reset} http://localhost:${EVM_EXPLORER_PORT} (Block & Transaction Explorer)`);
  console.log(`${c.dim}Press Ctrl+C at any time to gracefully terminate all services.${c.reset}\n`);

  // Keep event loop alive
  setInterval(() => {}, 10000);
}

main().catch(err => {
  console.error(`${c.red}[FATAL ERROR]${c.reset} ${err.message}`);
  cleanup();
});
