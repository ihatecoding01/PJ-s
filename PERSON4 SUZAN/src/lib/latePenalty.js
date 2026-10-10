/**
 * Calculate late penalty and payout breakdown
 * 
 * Formula:
 * 1. daysLate = Math.max(0, Math.ceil((submittedTime - deadline) / 86400))
 * 2. appliedPenaltyBps = Math.min(daysLate * latePenaltyBpsPerDay, maxLatePenaltyBps)
 * 3. penaltyAmount = (milestoneAmount * appliedPenaltyBps) / 10000
 * 4. netBeforeFee = milestoneAmount - penaltyAmount
 * 5. protocolFee = (netBeforeFee * feeBps) / 10000 (standard default 100 bps = 1%)
 * 6. freelancerPayout = netBeforeFee - protocolFee
 * 7. clientPenaltyRefund = penaltyAmount
 */
export function calculateLatePenalty({
  milestoneAmount = 0,
  deadlineSec,
  submittedSec = Math.floor(Date.now() / 1000),
  latePenaltyBpsPerDay = 100,
  maxLatePenaltyBps = 3000,
  protocolFeeBps = 100
}) {
  const amount = Number(milestoneAmount) || 0;
  const deadline = Number(deadlineSec) || 0;
  const submitted = Number(submittedSec) || 0;

  const secondsLate = Math.max(0, submitted - deadline);
  const daysLate = secondsLate > 0 ? Math.ceil(secondsLate / 86400) : 0;

  const penaltyBps = Math.min(daysLate * Number(latePenaltyBpsPerDay), Number(maxLatePenaltyBps));
  const penaltyAmount = (amount * penaltyBps) / 10000;
  const netBeforeFee = Math.max(0, amount - penaltyAmount);
  const protocolFee = (netBeforeFee * Number(protocolFeeBps)) / 10000;
  const freelancerPayout = Math.max(0, netBeforeFee - protocolFee);

  return {
    isLate: daysLate > 0,
    daysLate,
    secondsLate,
    penaltyBps,
    penaltyPercentage: (penaltyBps / 100).toFixed(1),
    milestoneAmount: amount,
    penaltyAmount,
    clientRefundAmount: penaltyAmount,
    protocolFee,
    protocolFeeBps,
    freelancerPayout
  };
}
