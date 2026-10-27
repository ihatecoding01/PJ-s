import {
  BrowserProvider,
  JsonRpcProvider,
  Wallet,
  Contract
} from 'ethers';

import abiJson from './abi.json';
import { getConfig } from '../api/config.js';
import { DEMO_ACCOUNTS } from '../mock/mockStore.js';

export const FAIRWORK_ABI = abiJson;

/**
 * Safe BigInt conversion for agreement IDs
 */
export function toBigIntId(id) {
  if (id === undefined || id === null || id === '') return 1n;
  try {
    return BigInt(id);
  } catch {
    const num = Number(id);
    return isNaN(num) ? 1n : BigInt(Math.max(1, Math.floor(num)));
  }
}

export const SUPPORTED_NETWORKS = {
  31337: {
    chainId: '0x7a69',
    name: 'Hardhat Local',
    contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    rpcUrls: ['http://127.0.0.1:8545'],
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrls: ['http://127.0.0.1:8545']
  },

  11155111: {
    chainId: '0xaa36a7',
    name: 'Sepolia Testnet',
    contractAddress: '0xc1C0415872eA86DfdA31615B9Ad94d795974CA1e',
    rpcUrls: [
      'https://ethereum-sepolia-rpc.publicnode.com',
      'https://rpc.sepolia.org'
    ],
    nativeCurrency: {
      name: 'SepoliaETH',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrls: ['https://sepolia.etherscan.io']
  },

  80002: {
    chainId: '0x13882',
    name: 'Polygon Amoy Testnet',
    contractAddress: '0x811bA0f7e4e13e5E8f7f2b189ff4Fe14467c6999',
    rpcUrls: ['https://rpc-amoy.polygon.technology'],
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    blockExplorerUrls: ['https://amoy.polygonscan.com']
  }
};

/**
 * Fetch smart contract configuration for current or target chainId.
 */
export async function fetchContractConfig(targetChainId) {
  let currentChainId = targetChainId;
  if (!currentChainId && typeof window !== 'undefined' && window.ethereum?.chainId) {
    try {
      currentChainId = parseInt(window.ethereum.chainId, 16);
    } catch {}
  }
  if (!currentChainId || isNaN(Number(currentChainId))) {
    currentChainId = Number(import.meta.env.VITE_CHAIN_ID || 11155111);
  }

  // Attempt dynamic fetch from backend
  try {
    const remote = await getConfig();
    if (remote && remote.contractAddress) {
      return {
        chainId: remote.chainId || currentChainId,
        contractAddress: remote.contractAddress,
        abi: remote.abi || FAIRWORK_ABI
      };
    }
  } catch {}

  const net = SUPPORTED_NETWORKS[currentChainId];
  return {
    chainId: currentChainId,
    contractAddress: net?.contractAddress || import.meta.env.VITE_CONTRACT_ADDRESS || '0xc1C0415872eA86DfdA31615B9Ad94d795974CA1e',
    abi: FAIRWORK_ABI
  };
}

/**
 * Get MetaMask BrowserProvider.
 */
export function getProvider() {
  if (typeof window === 'undefined' || !window.ethereum) {
    return null;
  }

  return new BrowserProvider(window.ethereum);
}

/**
 * Get fallback JSON-RPC provider.
 */
export function getFallbackProvider() {
  let chainId = 11155111;
  if (typeof window !== 'undefined' && window.ethereum?.chainId) {
    try {
      chainId = parseInt(window.ethereum.chainId, 16);
    } catch {}
  }
  if (!chainId || isNaN(Number(chainId))) {
    chainId = Number(import.meta.env.VITE_CHAIN_ID || 11155111);
  }

  if (chainId === 31337) {
    return new JsonRpcProvider('http://127.0.0.1:8545');
  }

  const rpcUrl =
    SUPPORTED_NETWORKS[chainId]?.rpcUrls?.[0] ||
    'https://ethereum-sepolia-rpc.publicnode.com';

  return new JsonRpcProvider(rpcUrl);
}

/**
 * Get contract connected to MetaMask or an authenticated demo account.
 */
export async function getContractWithSigner() {
  const cfg = await fetchContractConfig();
  const provider = getProvider();

  // 1. Prefer active browser MetaMask signer if available
  if (provider) {
    try {
      const signer = await provider.getSigner();
      if (signer) {
        return new Contract(
          cfg.contractAddress,
          cfg.abi || FAIRWORK_ABI,
          signer
        );
      }
    } catch (err) {
      console.warn('MetaMask active signer not ready, trying stored account:', err);
    }
  }

  // 2. Demo persona fallback with local private key (for local simulation/Hardhat)
  const savedAddr = (
    localStorage.getItem('fairwork_user_address') || ''
  ).toLowerCase();

  const demoAccount = Object.values(DEMO_ACCOUNTS).find(
    (acc) =>
      acc.address.toLowerCase() === savedAddr &&
      acc.privateKey
  );

  if (demoAccount) {
    const jsonRpcProvider = getFallbackProvider();

    const demoSigner = new Wallet(
      demoAccount.privateKey,
      jsonRpcProvider
    );

    return new Contract(
      cfg.contractAddress,
      cfg.abi || FAIRWORK_ABI,
      demoSigner
    );
  }

  if (provider) {
    const signer = await provider.getSigner();

    return new Contract(
      cfg.contractAddress,
      cfg.abi || FAIRWORK_ABI,
      signer
    );
  }

  // 3. Fallback to default demo persona (Alice Client / Bob Freelancer)
  const defaultAccount = DEMO_ACCOUNTS.CLIENT;
  const jsonRpcProvider = getFallbackProvider();
  const demoSigner = new Wallet(defaultAccount.privateKey, jsonRpcProvider);

  return new Contract(
    cfg.contractAddress,
    cfg.abi || FAIRWORK_ABI,
    demoSigner
  );
}

/**
 * Get read-only contract instance.
 */
export async function getReadOnlyContract() {
  const cfg = await fetchContractConfig();
  const provider = getProvider() || getFallbackProvider();

  return new Contract(
    cfg.contractAddress,
    cfg.abi || FAIRWORK_ABI,
    provider
  );
}

/**
 * Switch MetaMask to the specified network.
 */
export async function switchNetwork(targetChainId) {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  const numericChainId = Number(targetChainId);
  const hexChainId =
    '0x' + numericChainId.toString(16);

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hexChainId }]
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      const netInfo = SUPPORTED_NETWORKS[numericChainId];

      if (!netInfo) {
        throw new Error(
          `Unsupported network: ${numericChainId}`
        );
      }

      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: hexChainId,
            chainName: netInfo.name,
            rpcUrls: netInfo.rpcUrls,
            nativeCurrency: netInfo.nativeCurrency,
            blockExplorerUrls: netInfo.blockExplorerUrls
          }
        ]
      });

      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }]
      });
    } else {
      throw switchError;
    }
  }
}

/**
 * Decode smart contract errors.
 */
export function decodeRevertReason(error) {
  if (!error) {
    return 'Unknown error';
  }

  if (
    error.code === 4001 ||
    error.code === 'ACTION_REJECTED'
  ) {
    return 'Transaction rejected by user in wallet.';
  }

  if (error.reason) {
    return error.reason;
  }

  if (error.shortMessage) {
    return error.shortMessage;
  }

  if (error.data && typeof error.data === 'string') {
    return `Reverted with: ${error.data}`;
  }

  if (error.info?.error?.message) {
    return error.info.error.message;
  }

  if (error.message) {
    return error.message.split('(')[0].trim();
  }

  return String(error);
}

/**
 * Cast arbitrator dispute vote.
 */
export async function castVote(
  agreementId,
  milestoneIndex,
  freelancerShareBps
) {
  const contract = await getContractWithSigner();
  const safeId = toBigIntId(agreementId);

  return await contract.castVote(
    safeId,
    Number(milestoneIndex),
    Number(freelancerShareBps)
  );
}

/**
 * Finalize dispute resolution.
 */
export async function finalizeDispute(
  agreementId,
  milestoneIndex
) {
  const contract = await getContractWithSigner();
  const safeId = toBigIntId(agreementId);

  if (typeof contract.finalizeDispute === 'function') {
    return await contract.finalizeDispute(
      safeId,
      Number(milestoneIndex)
    );
  }

  if (typeof contract.resolveDispute === 'function') {
    return await contract.resolveDispute(
      safeId,
      Number(milestoneIndex)
    );
  }

  return null;
}
