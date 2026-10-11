import React, { useState } from 'react';
import { Card, Button, Badge } from '../components/ui/index.js';
import AddressChip from '../components/ui/AddressChip.jsx';
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
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';

export default function AdminPage() {
  const { address, isOwner } = useWallet();
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

      setArbitrators(prev => [...prev, newArbitrator.trim()]);
      setNewArbitrator('');
      toast.success('Arbitrator added to pool');
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
      toast.success('Arbitrator removed from pool');
    } catch (err) {
      toast.error(err.message || 'Failed to remove arbitrator');
    } finally {
      setIsProcessing(false);
    }
  };

  // Update Parameters
  const handleUpdateParams = async (e) => {
    e.preventDefault();
    try {
      setIsProcessing(true);
      let toastId = null;

      if (oracleAddress) {
        await txSetOracle(oracleAddress.trim(), {
          onPending: (hash) => { toastId = toast.pendingTx(hash, 'Updating Oracle address...'); },
          onSuccess: (rec) => { if (toastId) toast.confirmedTx(toastId, rec.hash, 'Oracle updated!'); },
          onError: (err) => { if (toastId) toast.failedTx(toastId, err); }
        });
      }

      if (treasuryAddress) {
        await txSetTreasury(treasuryAddress.trim(), {
          onPending: (hash) => { toastId = toast.pendingTx(hash, 'Updating Treasury address...'); },
          onSuccess: (rec) => { if (toastId) toast.confirmedTx(toastId, rec.hash, 'Treasury updated!'); },
          onError: (err) => { if (toastId) toast.failedTx(toastId, err); }
        });
      }

      await txSetFeeBps(Number(feeBps), {
        onPending: (hash) => { toastId = toast.pendingTx(hash, 'Updating protocol Fee Bps...'); },
        onSuccess: (rec) => { if (toastId) toast.confirmedTx(toastId, rec.hash, 'Fee updated!'); },
        onError: (err) => { if (toastId) toast.failedTx(toastId, err); }
      });

      toast.success('Protocol configuration parameters saved!');
    } catch (err) {
      toast.error(err.message || 'Failed to update protocol params');
    } finally {
      setIsProcessing(false);
    }
  };

  // Emergency Pause
  const handleTogglePause = async () => {
    try {
      setIsProcessing(true);
      let toastId = null;

      if (isPaused) {
        await txUnpause({
          onPending: (hash) => { toastId = toast.pendingTx(hash, 'Unpausing protocol on-chain...'); },
          onSuccess: (rec) => { if (toastId) toast.confirmedTx(toastId, rec.hash, 'Protocol unpaused!'); },
          onError: (err) => { if (toastId) toast.failedTx(toastId, err); }
        });
        setIsPaused(false);
        toast.success('Protocol is now UNPAUSED');
      } else {
        await txPause({
          onPending: (hash) => { toastId = toast.pendingTx(hash, 'Emergency pausing protocol...'); },
          onSuccess: (rec) => { if (toastId) toast.confirmedTx(toastId, rec.hash, 'Protocol paused!'); },
          onError: (err) => { if (toastId) toast.failedTx(toastId, err); }
        });
        setIsPaused(true);
        toast.warning('Protocol is now PAUSED');
      }
    } catch (err) {
      toast.error(err.message || 'Pause toggle failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-ink tracking-tight">
              Protocol Governance Council
            </h1>
            <Badge variant="coral">Contract Owner Only</Badge>
          </div>
          <p className="text-sm text-ink/60">
            Smart contract administrative operations: arbitrator pool management, oracle keys, and emergency circuits.
          </p>
        </div>

        <Button
          variant={isPaused ? 'primary' : 'danger'}
          onClick={handleTogglePause}
          loading={isProcessing}
          icon={isPaused ? Play : Pause}
        >
          {isPaused ? 'Unpause Protocol' : 'Emergency Pause'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Arbitrator Pool Card */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray">
            <h3 className="font-heading font-bold text-base text-ink flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-forest" />
              Arbitrator Council Pool ({arbitrators.length})
            </h3>
          </div>

          <form onSubmit={handleAddArbitrator} className="flex gap-2">
            <input
              type="text"
              value={newArbitrator}
              onChange={(e) => setNewArbitrator(e.target.value)}
              placeholder="0x... new arbitrator address"
              className="flex-1 bg-white border border-gray rounded-[10px] px-3.5 py-2 text-xs font-mono text-ink placeholder:text-ink/40 focus:outline-none focus:border-forest"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isProcessing}
              disabled={!newArbitrator.trim() || isProcessing}
              icon={UserPlus}
            >
              Add
            </Button>
          </form>

          <div className="space-y-2 pt-2">
            {arbitrators.map((arb, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-[10px] bg-sage/30 border border-gray"
              >
                <AddressChip address={arb} />
                <button
                  type="button"
                  onClick={() => handleRemoveArbitrator(arb)}
                  disabled={isProcessing || arbitrators.length <= 3}
                  className="p-1 text-ink/40 hover:text-coral transition-colors disabled:opacity-30"
                  title="Remove arbitrator"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Protocol Parameters Form */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray">
            <h3 className="font-heading font-bold text-base text-ink flex items-center gap-2">
              <Settings className="w-5 h-5 text-forest" />
              Protocol Oracle & Financial Parameters
            </h3>
          </div>

          <form onSubmit={handleUpdateParams} className="space-y-4">
            <div>
              <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/60 mb-1">
                Backend Oracle Signer Address
              </label>
              <input
                type="text"
                value={oracleAddress}
                onChange={(e) => setOracleAddress(e.target.value)}
                className="w-full bg-white border border-gray rounded-[10px] px-3.5 py-2 text-xs font-mono text-ink focus:outline-none focus:border-forest"
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/60 mb-1">
                Platform Treasury Address
              </label>
              <input
                type="text"
                value={treasuryAddress}
                onChange={(e) => setTreasuryAddress(e.target.value)}
                className="w-full bg-white border border-gray rounded-[10px] px-3.5 py-2 text-xs font-mono text-ink focus:outline-none focus:border-forest"
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/60 mb-1">
                Protocol Fee (Basis Points - 100 bps = 1.0%)
              </label>
              <input
                type="number"
                min="0"
                max="500"
                value={feeBps}
                onChange={(e) => setFeeBps(Number(e.target.value))}
                className="w-full bg-white border border-gray rounded-[10px] px-3.5 py-2 text-xs font-mono text-ink focus:outline-none focus:border-forest"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={isProcessing}
                disabled={isProcessing}
              >
                Update Parameters
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
