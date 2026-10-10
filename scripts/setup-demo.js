import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function main() {
  console.log('====================================================');
  console.log('        FAIRWORK ONE-TIME DEMO & ORACLE SETUP       ');
  console.log('====================================================');

  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');

  // Load deployed contract address and ABI
  const deploymentPath = path.join(rootDir, 'shared', 'deployments', 'localhost.json');
  const abiPath = path.join(rootDir, 'shared', 'abi', 'FairWork.json');

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment file missing at ${deploymentPath}. Please run deploy first.`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const abiJson = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
  const contractAddress = deployment.FairWork || deployment.address;
  console.log(`Contract address: ${contractAddress}`);

  // Hardhat standard mnemonic accounts
  const accounts = [
    { index: 0, role: 'Deployer / Owner', key: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' },
    { index: 1, role: 'Client Demo', key: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' },
    { index: 2, role: 'Freelancer Demo', key: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' },
    { index: 3, role: 'Oracle Wallet', key: '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6' },
    { index: 4, role: 'Treasury Wallet', key: '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a' },
    { index: 5, role: 'Arbitrator 1', key: '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba' },
    { index: 6, role: 'Arbitrator 2', key: '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e' },
    { index: 7, role: 'Arbitrator 3', key: '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356' },
    { index: 8, role: 'Arbitrator 4', key: '0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97' },
    { index: 9, role: 'Arbitrator 5', key: '0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6' },
  ];

  const signers = accounts.map(a => new ethers.Wallet(a.key, provider));
  const ownerWallet = signers[0];
  const oracleWallet = signers[3];
  const treasuryWallet = signers[4];

  const contractAbi = Array.isArray(abiJson) ? abiJson : (abiJson.abi || abiJson);
  const fairWork = new ethers.Contract(contractAddress, contractAbi, ownerWallet);

  console.log('\n--- Configuring Contract System Parameters ---');

  // Track monotonic nonce
  let currentNonce = await provider.getTransactionCount(ownerWallet.address, 'pending');
  async function sendWithNonce(fnCall) {
    const tx = await fnCall(currentNonce++);
    await tx.wait();
    return tx;
  }

  // 1. Set Oracle
  const currentOracle = await fairWork.oracle();
  if (currentOracle.toLowerCase() !== oracleWallet.address.toLowerCase()) {
    console.log(`Setting Oracle -> ${oracleWallet.address}...`);
    await sendWithNonce(nonce => fairWork.setOracle(oracleWallet.address, { nonce }));
    console.log('✓ Oracle updated successfully');
  } else {
    console.log(`✓ Oracle already set to ${currentOracle}`);
  }

  // 2. Set Treasury
  const currentTreasury = await fairWork.treasury();
  if (currentTreasury.toLowerCase() !== treasuryWallet.address.toLowerCase()) {
    console.log(`Setting Treasury -> ${treasuryWallet.address}...`);
    await sendWithNonce(nonce => fairWork.setTreasury(treasuryWallet.address, { nonce }));
    console.log('✓ Treasury updated successfully');
  } else {
    console.log(`✓ Treasury already set to ${currentTreasury}`);
  }

  // 3. Set Fee Bps (100 = 1%)
  const currentFee = await fairWork.feeBps();
  if (Number(currentFee) !== 100) {
    console.log(`Setting Fee Bps -> 100 (1%)...`);
    await sendWithNonce(nonce => fairWork.setFeeBps(100, { nonce }));
    console.log('✓ Fee Bps set to 100');
  } else {
    console.log(`✓ Fee Bps already 100 (1%)`);
  }

  // 4. Add Arbitrators (Accounts 5..9)
  console.log('\n--- Registering Arbitrators ---');
  for (let i = 5; i <= 9; i++) {
    const arbAddr = signers[i].address;
    const isArb = await fairWork.isArbitrator(arbAddr);
    if (!isArb) {
      console.log(`Adding Arbitrator ${i - 4}: ${arbAddr}...`);
      await sendWithNonce(nonce => fairWork.addArbitrator(arbAddr, { nonce }));
      console.log(`✓ Added Arbitrator ${i - 4}`);
    } else {
      console.log(`✓ Arbitrator ${i - 4} already registered: ${arbAddr}`);
    }
  }

  let activeArbs = 0;
  for (let i = 5; i <= 9; i++) {
    if (await fairWork.isArbitrator(signers[i].address)) activeArbs++;
  }
  console.log(`Total Active Arbitrators Verified in Contract: ${activeArbs}`);

  // Print Demo Table
  console.log('\n========================================================================================');
  console.log('                                 DEMO ACCOUNTS TABLE                                    ');
  console.log('========================================================================================');
  console.log('| Idx | Role             | Address                                    | Private Key (MetaMask)                         |');
  console.log('|-----|------------------|--------------------------------------------|------------------------------------------------|');
  for (const a of accounts) {
    const wallet = new ethers.Wallet(a.key);
    console.log(`| ${String(a.index).padEnd(3)} | ${a.role.padEnd(16)} | ${wallet.address} | ${a.key} |`);
  }
  console.log('========================================================================================\n');
  console.log('✓ Setup complete! All parameters ready for E2E and Live Demo.');
}

main().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
