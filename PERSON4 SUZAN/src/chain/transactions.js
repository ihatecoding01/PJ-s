import { getContractWithSigner, decodeRevertReason } from './contract.js';
import { termsToChain } from '../lib/termsToChain.js';
import { canonicalHash } from '../lib/canonicalHash.js';

/**
 * Execute contract transaction with full lifecycle callbacks
 */
async function executeTx(actionName, txFunc, { onPending, onSuccess, onError } = {}) {
  try {
    const isMock = import.meta.env.VITE_USE_MOCK === 'true' && (!window.ethereum || !window.ethereum.selectedAddress);

    if (isMock) {
      // Simulate on-chain transaction lifecycle in mock mode
      const fakeTxHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      if (onPending) onPending(fakeTxHash);
      await new Promise(r => setTimeout(r, 1200));
      const fakeReceipt = {
        hash: fakeTxHash,
        status: 1,
        blockNumber: 1234567,
        gasUsed: 85000n
      };
      if (onSuccess) onSuccess(fakeReceipt);
      return { txHash: fakeTxHash, receipt: fakeReceipt };
    }

    const tx = await txFunc();
    if (onPending) onPending(tx.hash);
    const receipt = await tx.wait();
    if (onSuccess) onSuccess(receipt);
    return { txHash: tx.hash, receipt };
  } catch (err) {
    const reason = decodeRevertReason(err);
    if (onError) onError(reason, err);
    throw new Error(reason);
  }
}

/**
 * createAgreement (Client)
 */
export async function txCreateAgreement(terms, callbacks = {}) {
  const { args } = termsToChain(terms);
  
  const isMock = import.meta.env.VITE_USE_MOCK === 'true' && (!window.ethereum || !window.ethereum.selectedAddress);
  if (isMock) {
    const fakeTxHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    if (callbacks.onPending) callbacks.onPending(fakeTxHash);
    await new Promise(r => setTimeout(r, 1200));
    const randomId = Math.floor(Math.random() * 900) + 100;
    const fakeReceipt = { hash: fakeTxHash, status: 1 };
    if (callbacks.onSuccess) callbacks.onSuccess(fakeReceipt);
    return { txHash: fakeTxHash, receipt: fakeReceipt, onchainId: randomId };
  }

  const contract = await getContractWithSigner();
  const tx = await contract.createAgreement(...args);
  if (callbacks.onPending) callbacks.onPending(tx.hash);
  const receipt = await tx.wait();

  // Parse AgreementCreated event from logs
  let onchainId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed && parsed.name === 'AgreementCreated') {
        onchainId = Number(parsed.args[0] || parsed.args.id);
        break;
      }
    } catch {
      // ignore other logs
    }
  }

  if (callbacks.onSuccess) callbacks.onSuccess(receipt);
  return { txHash: tx.hash, receipt, onchainId };
}

/**
 * acceptAgreement (Freelancer)
 */
export async function txAcceptAgreement(id, callbacks = {}) {
  const contract = await getContractWithSigner();
  return executeTx('acceptAgreement', () => contract.acceptAgreement(BigInt(id)), callbacks);
}

/**
 * fundAgreement (Client)
 */
export async function txFundAgreement(id, totalWei, callbacks = {}) {
  const contract = await getContractWithSigner();
  return executeTx('fundAgreement', () => contract.fundAgreement(BigInt(id), { value: BigInt(totalWei) }), callbacks);
}

/**
 * cancelUnfunded (Either before Active)
 */
export async function txCancelUnfunded(id, callbacks = {}) {
  const contract = await getContractWithSigner();
  return executeTx('cancelUnfunded', () => contract.cancelUnfunded(BigInt(id)), callbacks);
}

/**
 * submitMilestone (Freelancer)
 */
export async function txSubmitMilestone(id, idx, submissionHash, commitSha, callbacks = {}) {
  const contract = await getContractWithSigner();
  return executeTx('submitMilestone', () => contract.submitMilestone(BigInt(id), Number(idx), submissionHash, commitSha || ''), callbacks);
}

/**
 * recordProgress (Oracle)
 */
export async function txRecordProgress(id, idx, aiProgressBps, aiReportHash, callbacks = {}) {
  const contract = await getContractWithSigner();
  return executeTx('recordProgress', () => contract.recordProgress(BigInt(id), Number(idx), Number(aiProgressBps), aiReportHash), callbacks);
}

/**
 * approveMilestone (Client)
 */
export async function txApproveMilestone(id, idx, callbacks = {}) {
  const contract = await getContractWithSigner();
  return executeTx('approveMilestone', () => contract.approveMilestone(BigInt(id), Number(idx)), callbacks);
}

/**
 * rejectMilestone (Client)
 */
export async function txRejectMilestone(id, idx, reason, callbacks = {}) {
  const reasonHash = canonicalHash({ reason: String(reason || '') });
  const contract = await getContractWithSigner();
  return executeTx('rejectMilestone', () => contract.rejectMilestone(BigInt(id), Number(idx), reasonHash), callbacks);
}

/**
 * claimAfterReviewWindow (Freelancer after review window)
 */
export async function txClaimAfterReviewWindow(id, idx, callbacks = {}) {
  const contract = await getContractWithSigner();
  return executeTx('claimAfterReviewWindow', () => contract.claimAfterReviewWindow(BigInt(id), Number(idx)), callbacks);
}

/**
 * reclaimMissedMilestone (Client after deadline + grace)
 */
export async function txReclaimMissedMilestone(id, idx, callbacks = {}) {
  const contract = await getContractWithSigner();
  return executeTx('reclaimMissedMilestone', () => contract.reclaimMissedMilestone(BigInt(id), Number(idx)), callbacks);
}

/**
 * proposeAmendment (Either party)
 */
export async function txProposeAmendment(id, idx, newDeadlineSec, newTerms, newTermsURI = '', callbacks = {}) {
  const termsHash = canonicalHash(newTerms);
  const contract = await getContractWithSigner();
  return executeTx('proposeAmendment', () => contract.proposeAmendment(BigInt(id), Number(idx), BigInt(newDeadlineSec), termsHash, newTermsURI), callbacks);
}

/**
 * acceptAmendment (Counterparty)
 */
export async function txAcceptAmendment(id, amendmentId, callbacks = {}) {
  const contract = await getContractWithSigner();
  return executeTx('acceptAmendment', () => contract.acceptAmendment(BigInt(id), BigInt(amendmentId)), callbacks);
}

/**
 * raiseDispute (Either party)
 */
export async function txRaiseDispute(id, idx, evidenceText, callbacks = {}) {
  const evidenceHash = canonicalHash({ text: evidenceText, timestamp: Date.now() });
  const contract = await getContractWithSigner();
  return executeTx('raiseDispute', () => contract.raiseDispute(BigInt(id), Number(idx), evidenceHash), callbacks);
}

/**
 * submitEvidence (Parties)
 */
export async function txSubmitEvidence(id, idx, evidenceText, callbacks = {}) {
  const evidenceHash = canonicalHash({ text: evidenceText, timestamp: Date.now() });
  const contract = await getContractWithSigner();
  return executeTx('submitEvidence', () => contract.submitEvidence(BigInt(id), Number(idx), evidenceHash), callbacks);
}

/**
 * castVote (Arbitrator)
 */
export async function txCastVote(id, idx, freelancerShareBps, callbacks = {}) {
  const contract = await getContractWithSigner();
  return executeTx('castVote', () => contract.castVote(BigInt(id), Number(idx), Number(freelancerShareBps)), callbacks);
}

/**
 * finalizeDispute (Anyone after voting window)
 */
export async function txFinalizeDispute(id, idx, callbacks = {}) {
  const contract = await getContractWithSigner();
  return executeTx('finalizeDispute', () => contract.finalizeDispute(BigInt(id), Number(idx)), callbacks);
}

/**
 * Admin: addArbitrator
 */
export async function txAddArbitrator(arbitratorAddr, callbacks = {}) {
  const contract = await getContractWithSigner();
  return executeTx('addArbitrator', () => contract.addArbitrator(arbitratorAddr), callbacks);
}

/**
 * Admin: removeArbitrator
 */
export async function txRemoveArbitrator(arbitratorAddr, callbacks = {}) {
  const contract = await getContractWithSigner();
  return executeTx('removeArbitrator', () => contract.removeArbitrator(arbitratorAddr), callbacks);
}

/**
 * Admin: setOracle
 */
export async function txSetOracle(oracleAddr, callbacks = {}) {
  const contract = await getContractWithSigner();
  return executeTx('setOracle', () => contract.setOracle(oracleAddr), callbacks);
}

/**
 * Admin: setTreasury
 */
export async function txSetTreasury(treasuryAddr, callbacks = {}) {
  const contract = await getContractWithSigner();
  return executeTx('setTreasury', () => contract.setTreasury(treasuryAddr), callbacks);
}

/**
 * Admin: setFeeBps (max 500)
 */
export async function txSetFeeBps(feeBps, callbacks = {}) {
  const contract = await getContractWithSigner();
  return executeTx('setFeeBps', () => contract.setFeeBps(Number(feeBps)), callbacks);
}

/**
 * Admin: pause
 */
export async function txPause(callbacks = {}) {
  const contract = await getContractWithSigner();
  return executeTx('pause', () => contract.pause(), callbacks);
}

/**
 * Admin: unpause
 */
export async function txUnpause(callbacks = {}) {
  const contract = await getContractWithSigner();
  return executeTx('unpause', () => contract.unpause(), callbacks);
}
