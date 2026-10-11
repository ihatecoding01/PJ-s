import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Wallet } from 'ethers';
import { getProvider, switchNetwork as switchChainNetwork, fetchContractConfig } from '../chain/contract.js';
import { getNonce, verifySignature } from '../api/auth.js';
import { getMe } from '../api/users.js';
import { DEMO_ACCOUNTS, mockStore } from '../mock/mockStore.js';
import { useToast } from './ToastContext.jsx';

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const toast = useToast();
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [configuredChainId, setConfiguredChainId] = useState(Number(import.meta.env.VITE_CHAIN_ID || 31337));
  const [contractAddress, setContractAddress] = useState(null);
  const [user, setUser] = useState(null);
  const [jwt, setJwt] = useState(localStorage.getItem('fairwork_jwt'));
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const isMock = import.meta.env.VITE_USE_MOCK === 'true';

  // Load configuration on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        const cfg = await fetchContractConfig();
        if (cfg) {
          if (cfg.chainId) setConfiguredChainId(Number(cfg.chainId));
          if (cfg.contractAddress) setContractAddress(cfg.contractAddress);
        }
      } catch (err) {
        console.warn('Config fetch error:', err);
      }
    }
    loadConfig();
  }, []);

  // Restore session on mount
  useEffect(() => {
    const savedAddr = localStorage.getItem('fairwork_user_address');
    const savedJwt = localStorage.getItem('fairwork_jwt');
    if (savedAddr && savedJwt) {
      setAddress(savedAddr.toLowerCase());
      setJwt(savedJwt);
      getMe().then(u => setUser(u)).catch(() => {});
    } else if (isMock) {
      // Auto-load demo client in mock mode if empty
      const demoClient = DEMO_ACCOUNTS.CLIENT;
      setAddress(demoClient.address.toLowerCase());
      setUser(demoClient);
      const fakeToken = `mock-token-${demoClient.address}`;
      setJwt(fakeToken);
      localStorage.setItem('fairwork_user_address', demoClient.address.toLowerCase());
      localStorage.setItem('fairwork_jwt', fakeToken);
    }
  }, [isMock]);

  // Read current chainId from ethereum if available
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.request({ method: 'eth_chainId' })
        .then(hexId => setChainId(parseInt(hexId, 16)))
        .catch(() => {});

      const handleAccountsChanged = (accounts) => {
        if (!accounts || accounts.length === 0) {
          handleDisconnect();
        } else {
          const newAddr = accounts[0].toLowerCase();
          if (newAddr !== address) {
            handleLogin(newAddr);
          }
        }
      };

      const handleChainChanged = (hexId) => {
        setChainId(parseInt(hexId, 16));
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [address]);

  const handleLogin = async (targetAddress) => {
    try {
      setIsConnecting(true);
      const addr = targetAddress.toLowerCase();

      if (isMock) {
        // Instant mock sign-in
        const { token, user: loggedUser } = await verifySignature(addr, 'mock-sig');
        localStorage.setItem('fairwork_jwt', token);
        localStorage.setItem('fairwork_user_address', addr);
        setJwt(token);
        setAddress(addr);
        setUser(loggedUser);
        toast.success(`Connected as ${loggedUser.name || addr.substring(0, 8)}`);
        return;
      }

      // Live Web3 SIWE Flow
      const provider = getProvider();
      if (!provider) throw new Error('MetaMask is required');
      const signer = await provider.getSigner();
      
      const { nonce } = await getNonce(addr);
      const messageToSign = `FairWork login: ${nonce}`;
      
      const signature = await signer.signMessage(messageToSign);
      const { token, user: loggedUser } = await verifySignature(addr, signature);

      localStorage.setItem('fairwork_jwt', token);
      localStorage.setItem('fairwork_user_address', addr);
      setJwt(token);
      setAddress(addr);
      setUser(loggedUser);
      toast.success('Wallet connected and verified!');
    } catch (err) {
      console.error('Login error:', err);
      toast.error(err.message || 'Login failed');
    } finally {
      setIsConnecting(false);
    }
  };

  const connectWallet = () => {
    setIsConnectModalOpen(true);
  };

  const connectMetaMask = async () => {
    if (!window.ethereum) {
      toast.error('MetaMask extension not found in browser');
      return;
    }

    try {
      setIsConnecting(true);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts[0]) {
        await handleLogin(accounts[0]);
        setIsConnectModalOpen(false);
      }
    } catch (err) {
      toast.error(err.message || 'Could not connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const connectWithDemoAccount = async (accountKey) => {
    const acc = DEMO_ACCOUNTS[accountKey];
    if (!acc) return;
    try {
      setIsConnecting(true);
      if (isMock) {
        const addr = acc.address.toLowerCase();
        const fakeToken = `mock-token-${addr}`;
        localStorage.setItem('fairwork_user_address', addr);
        localStorage.setItem('fairwork_jwt', fakeToken);
        setAddress(addr);
        setUser(acc);
        setJwt(fakeToken);
        setIsConnectModalOpen(false);
        toast.success(`Connected as ${acc.name} (${acc.role})`);
        return;
      }

      if (acc.privateKey) {
        // Authenticate with real backend using cryptographic SIWE
        const demoWallet = new Wallet(acc.privateKey);
        const addr = demoWallet.address.toLowerCase();
        const { nonce } = await getNonce(addr);
        const messageToSign = `FairWork login: ${nonce}`;
        const signature = await demoWallet.signMessage(messageToSign);
        const { token, user: loggedUser } = await verifySignature(addr, signature);

        localStorage.setItem('fairwork_jwt', token);
        localStorage.setItem('fairwork_user_address', addr);
        setJwt(token);
        setAddress(addr);
        setUser(loggedUser);
        setIsConnectModalOpen(false);
        toast.success(`Connected as ${loggedUser.name || acc.name} (${acc.role})`);
      } else {
        const addr = acc.address.toLowerCase();
        localStorage.setItem('fairwork_user_address', addr);
        const fakeToken = `mock-token-${addr}`;
        localStorage.setItem('fairwork_jwt', fakeToken);
        setAddress(addr);
        setUser(acc);
        setJwt(fakeToken);
        setIsConnectModalOpen(false);
        toast.success(`Switched active persona to ${acc.name} (${acc.role})`);
      }
    } catch (err) {
      console.error('Demo login error:', err);
      toast.error(err.message || 'Demo login failed');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('fairwork_jwt');
    localStorage.removeItem('fairwork_user_address');
    setAddress(null);
    setJwt(null);
    setUser(null);
    toast.info('Wallet disconnected');
  };

  const handleSwitchNetwork = async (targetId) => {
    try {
      const netId = Number(targetId || configuredChainId);
      await switchChainNetwork(netId);
      setChainId(netId);
      setConfiguredChainId(netId);
      toast.success(`Switched to chain ${netId}`);
    } catch (err) {
      toast.error(err.message || 'Failed to switch network');
    }
  };

  const switchDemoAccount = async (accountKey) => {
    await connectWithDemoAccount(accountKey);
  };

  const refreshUser = async () => {
    try {
      const u = await getMe();
      setUser(u);
    } catch (err) {
      console.warn('Could not refresh user:', err);
    }
  };

  const isWrongNetwork = Boolean(chainId && configuredChainId && chainId !== configuredChainId);

  return (
    <WalletContext.Provider
      value={{
        address,
        chainId,
        configuredChainId,
        contractAddress,
        user,
        jwt,
        isConnected: Boolean(address && jwt),
        isConnecting,
        isWrongNetwork,
        isMock,
        isConnectModalOpen,
        openConnectModal: () => setIsConnectModalOpen(true),
        closeConnectModal: () => setIsConnectModalOpen(false),
        connectWallet,
        connectMetaMask,
        connectWithDemoAccount,
        disconnectWallet: handleDisconnect,
        switchNetwork: handleSwitchNetwork,
        switchDemoAccount,
        refreshUser
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within WalletProvider');
  return context;
}
