import { BrowserProvider, JsonRpcProvider, Wallet, Contract } from 'ethers';
import abiJson from './abi.json';
import { getConfig } from '../api/config.js';
import { DEMO_ACCOUNTS } from '../mock/mockStore.js';

export const FAIRWORK_ABI = abiJson;

export const SUPPORTED_NETWORKS = {
  31337: {
    chainId: '0x7a69',
    name: 'Hardhat Local',
    rpcUrls: ['http://127.0.0.1:8545'],
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    blockExplorerUrls: ['http://localhost:8545']
  },
  11155111: {
    chainId: '0xaa36a7',
    name: 'Sepolia Testnet',
    rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
    nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
    blockExplorerUrls: ['https://sepolia.etherscan.io']
  },
  80002: {
    chainId: '0x13882',
    name: 'Polygon Amoy Testnet',
    rpcUrls: ['https://rpc-amoy.polygon.technology'],
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    blockExplorerUrls: ['https://amoy.polygonscan.com']
  }
};

let cachedConfig = null;

export async function fetchContractConfig() {
  if (cachedConfig) return cachedConfig;

  try {
    const res = await getConfig();

    if (res && res.contractAddress) {
      cachedConfig = res;
      return res;
    }
  } catch (err) {
    console.warn('Could not fetch remote config, using defaults:', err);
  }

  // Fallback defaults — Sepolia deployed contract
  cachedConfig = {
    chainId: Number(import.meta.env.VITE_CHAIN_ID || 11155111),
    contractAddress:
      import.meta.env.VITE_CONTRACT_ADDRESS ||
      '0xc1C0415872eA86DfdA31615B9Ad94d795974CA1e',
    abi: FAIRWORK_ABI
  };

  return cachedConfig;
}

/**
 * Get ethers BrowserProvider from window.ethereum or null
 */
export function getProvider() {
  if (typeof window === 'undefined' || !window.ethereum) {
    return null;
  }

  return new BrowserProvider(window.ethereum);
}

