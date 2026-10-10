import { BrowserProvider, Contract } from 'ethers';
import abiJson from './abi.json';
import { getConfig } from '../api/config.js';

export const FAIRWORK_ABI = abiJson;

export const SUPPORTED_NETWORKS = {
  31337: {
    chainId: '0x7a69',
    name: 'Hardhat Local',
    rpcUrls: ['http://127.0.0.1:8545'],
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    blockExplorerUrls: ['http://localhost:8545']
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

  // Fallback defaults
  cachedConfig = {
    chainId: Number(import.meta.env.VITE_CHAIN_ID || 31337),
    contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    abi: FAIRWORK_ABI
  };
  return cachedConfig;
}

/**
 * Get ethers BrowserProvider from window.ethereum
 */
export function getProvider() {
  if (typeof window === 'undefined' || !window.ethereum) {
    return null;
  }
  return new BrowserProvider(window.ethereum);
}

/**
 * Get contract instance connected with current signer
 */
export async function getContractWithSigner() {
  const provider = getProvider();
  if (!provider) throw new Error('MetaMask or Web3 wallet is not installed');
  const signer = await provider.getSigner();
  const cfg = await fetchContractConfig();
  return new Contract(cfg.contractAddress, cfg.abi || FAIRWORK_ABI, signer);
}

/**
 * Get read-only contract instance
 */
export async function getReadOnlyContract() {
  const provider = getProvider();
  const cfg = await fetchContractConfig();
  if (!provider) {
    return null;
  }
  return new Contract(cfg.contractAddress, cfg.abi || FAIRWORK_ABI, provider);
}

/**
 * Switch wallet chain to configured chainId
 */
export async function switchNetwork(targetChainId) {
  if (!window.ethereum) throw new Error('MetaMask is not installed');
  const hexChainId = '0x' + Number(targetChainId).toString(16);
  
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hexChainId }]
    });
  } catch (switchError) {
    // Error 4902: Network has not been added to MetaMask
    if (switchError.code === 4902 || switchError.code === -32603) {
      const netInfo = SUPPORTED_NETWORKS[targetChainId];
      if (netInfo) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: hexChainId,
            chainName: netInfo.name,
            rpcUrls: netInfo.rpcUrls,
            nativeCurrency: netInfo.nativeCurrency,
            blockExplorerUrls: netInfo.blockExplorerUrls
          }]
        });
      }
    } else {
      throw switchError;
    }
  }
}

/**
 * Decode revert reasons from ethers errors
 */
export function decodeRevertReason(error) {
  if (!error) return 'Unknown error';
  if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
    return 'Transaction rejected by user in wallet.';
  }
  if (error.reason) return error.reason;
  if (error.shortMessage) return error.shortMessage;
  if (error.data && typeof error.data === 'string') {
    return `Reverted with: ${error.data}`;
  }
  if (error.info?.error?.message) {
    return error.info.error.message;
  }
  if (error.message) {
    // Strip long trace strings
    return error.message.split('(')[0].trim();
  }
  return String(error);
}
