import React, { useState } from 'react';
import Card from '../components/common/Card.jsx';
import Button from '../components/common/Button.jsx';
import AddressBadge from '../components/common/AddressBadge.jsx';
import {
  txAddArbitrator,
  txRemoveArbitrator,
  txSetOracle,
  txSetTreasury,
  txSetFeeBps,
  txPause,
  txUnpause
} from '../chain/transactions.js';
import { DEMO_ACCOUNTS } from '../mock/mockStore.js';
import { useWallet } from '../context/WalletContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  ShieldAlert,
  UserPlus,
  Trash2,
  Settings,
  AlertTriangle,
  Play,
  Pause,
  Percent,
  CheckCircle2
} from 'lucide-react';

export default function AdminPage() {
  const { address } = useWallet();
  const toast = useToast();

  const [arbitrators, setArbitrators] = useState([
    DEMO_ACCOUNTS.ARBITRATOR_1.address,
    DEMO_ACCOUNTS.ARBITRATOR_2.address,
    DEMO_ACCOUNTS.ARBITRATOR_3.address
  ]);
  const [newArbitrator, setNewArbitrator] = useState('');
  const [oracleAddress, setOracleAddress] = useState('0x90f79bf6eb2c4f870365e785982e1f101e93b906');
  const [treasuryAddress, setTreasuryAddress] = useState('0x15d34aaf54267db7d7c367839aaf71a00a2c6a65');
  const [feeBps, setFeeBps] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Add Arbitrator
  const handleAddArbitrator = async (e) => {
    e.preventDefault();
    if (!newArbitrator.trim()) return;

    try {
      setIsProcessing(true);
      let toastId = null;

      await txAddArbitrator(newArbitrator.trim(), {
        onPending: (hash) => {
          toastId = toast.pendingTx(hash, 'Adding arbitrator to protocol...');
        },
        onSuccess: (rec) => {
          if (toastId) toast.confirmedTx(toastId, rec.hash, 'Arbitrator added on-chain!');
        },
        onError: (err) => {
          if (toastId) toast.failedTx(toastId, err);
        }
      });

      setArbitrators(prev => [...prev, newArbitrator.trim().toLowerCase()]);
      setNewArbitrator('');
      toast.success('Arbitrator added successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to add arbitrator');
    } finally {
      setIsProcessing(false);
    }
  };

  // Remove Arbitrator
  const handleRemoveArbitrator = async (arbAddr) => {
    try {
      setIsProcessing(true);
      let toastId = null;

      await txRemoveArbitrator(arbAddr, {
        onPending: (hash) => {
          toastId = toast.pendingTx(hash, 'Removing arbitrator on-chain...');
        },
        onSuccess: (rec) => {
          if (toastId) toast.confirmedTx(toastId, rec.hash, 'Arbitrator removed!');
        },
        onError: (err) => {
          if (toastId) toast.failedTx(toastId, err);
        }
      });

      setArbitrators(prev => prev.filter(a => a.toLowerCase() !== arbAddr.toLowerCase()));
      toast.success('Arbitrator removed.');
    } catch (err) {
      toast.error(err.message || 'Failed to remove arbitrator');
    } finally {
      setIsProcessing(false);
    }
  };

  // Set Oracle
  const handleSetOracle = async () => {
    try {
      setIsProcessing(true);
      await txSetOracle(oracleAddress.trim());
      toast.success('Protocol Oracle wallet updated on-chain!');
    } catch (err) {
      toast.error(err.message || 'Failed to update oracle');
    } finally {
      setIsProcessing(false);
    }
  };

  // Set Treasury
  const handleSetTreasury = async () => {
    try {
      setIsProcessing(true);
      await txSetTreasury(treasuryAddress.trim());
      toast.success('Treasury address updated on-chain!');
    } catch (err) {
      toast.error(err.message || 'Failed to update treasury');
    } finally {
      setIsProcessing(false);
    }
  };

  // Set Fee Bps
  const handleSetFee = async () => {
    if (Number(feeBps) > 500) {
      toast.error('Protocol fee cannot exceed 500 bps (5.0%)');
      return;
    }
    try {
      setIsProcessing(true);
      await txSetFeeBps(Number(feeBps));
      toast.success(`Protocol fee set to ${feeBps} bps (${(feeBps / 100).toFixed(1)}%)!`);
    } catch (err) {
      toast.error(err.message || 'Failed to update fee');
    } finally {
      setIsProcessing(false);
    }
  };

  // Pause / Unpause
  const handleTogglePause = async () => {
    try {
      setIsProcessing(true);
      if (isPaused) {
        await txUnpause();
        setIsPaused(false);
        toast.success('Protocol unpaused on-chain!');
      } else {
        await txPause();
        setIsPaused(true);
        toast.warning('Protocol paused on-chain.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to toggle pause');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-rose-400 font-bold uppercase tracking-wider">
              Governance & Admin
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-surface-800 border border-slate-700 text-slate-300 font-mono">
              Contract Owner Only
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            FairWork Protocol Administration
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage authorized arbitrator tribunal members, backend oracle wallets, treasury fee routing, and circuit breaker.
          </p>
        </div>

        {/* Emergency Pause Toggle */}
        <Button
          variant={isPaused ? 'primary' : 'danger'}
          onClick={handleTogglePause}
          isLoading={isProcessing}
          icon={isPaused ? Play : Pause}
        >
          {isPaused ? 'Unpause Protocol' : 'Emergency Pause'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Arbitrators Management */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Arbitrator Registry ({arbitrators.length})
            </h3>
          </div>

          <div className="space-y-2">
            {arbitrators.map((arb, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-surface-850 border border-slate-800 flex items-center justify-between gap-2"
              >
                <AddressBadge address={arb} chars={4} showExplorer={false} />
                <button
                  onClick={() => handleRemoveArbitrator(arb)}
                  disabled={isProcessing}
                  className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                  title="Remove Arbitrator"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Arbitrator form */}
          <form onSubmit={handleAddArbitrator} className="pt-2 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={newArbitrator}
              onChange={(e) => setNewArbitrator(e.target.value)}
              placeholder="0x... arbitrator address"
              className="flex-1 bg-surface-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-teal-400"
            />
            <Button type="submit" variant="primary" size="sm" isLoading={isProcessing} icon={UserPlus}>
              Add
            </Button>
          </form>
        </Card>

        {/* System Addresses & Fee */}
        <div className="space-y-6">
          {/* Fee Configuration */}
          <Card className="space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 pb-3 border-b border-slate-800">
              <Percent className="w-4 h-4 text-teal-400" />
              Protocol Escrow Fee (Max 500 bps = 5.0%)
            </h3>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={feeBps}
                  onChange={(e) => setFeeBps(e.target.value)}
                  className="w-full bg-surface-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-400"
                />
              </div>
              <span className="text-xs text-slate-300 font-mono font-bold">
                = {(Number(feeBps) / 100).toFixed(2)}%
              </span>
              <Button variant="secondary" size="sm" onClick={handleSetFee} isLoading={isProcessing}>
                Update Fee
              </Button>
            </div>
          </Card>

          {/* Oracle & Treasury */}
          <Card className="space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 pb-3 border-b border-slate-800">
              <Settings className="w-4 h-4 text-indigo-400" />
              Protocol Oracle & Treasury
            </h3>

            {/* Oracle */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Backend Oracle Address
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={oracleAddress}
                  onChange={(e) => setOracleAddress(e.target.value)}
                  className="flex-1 bg-surface-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-400"
                />
                <Button variant="secondary" size="sm" onClick={handleSetOracle} isLoading={isProcessing}>
                  Save
                </Button>
              </div>
            </div>

            {/* Treasury */}
            <div className="space-y-1.5 pt-2">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Fee Treasury Address
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={treasuryAddress}
                  onChange={(e) => setTreasuryAddress(e.target.value)}
                  className="flex-1 bg-surface-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-400"
                />
                <Button variant="secondary" size="sm" onClick={handleSetTreasury} isLoading={isProcessing}>
                  Save
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
