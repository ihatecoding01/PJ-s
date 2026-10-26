import { prisma } from '../../lib/prisma';
import { ChainAdapter } from '../../adapters/chainAdapter';

export class PaymentService {
  /**
   * Combines indexed contract events with the contract's payment summary view.
   */
  static async getPaymentSummary(agreementId: string) {
    const agreement = await prisma.agreement.findUnique({
      where: { id: agreementId },
      include: {
        milestones: true,
      },
    });

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    const onChainId = agreement.onChainAgreementId || agreement.id;

    // 1. Fetch on-chain payment summary view
    const onChainSummary = await ChainAdapter.getPaymentSummary(onChainId);

    // 2. Fetch payment-related indexed chain events
    const paymentEvents = await prisma.chainEvent.findMany({
      where: {
        agreementId: agreement.id,
        eventName: { in: ['AgreementFunded', 'FundsDeposited', 'MilestoneApproved', 'MilestonePaid', 'MilestoneRefunded', 'DisputeResolved'] },
      },
      orderBy: { timestamp: 'desc' },
    });

    // 3. Compute milestone payout breakdown
    const milestonePayouts = agreement.milestones.map((m) => ({
      milestoneIndex: m.milestoneIndex,
      title: m.title,
      amount: m.amount,
      status: m.status,
      paid: m.status === 'APPROVED',
    }));

    return {
      agreementId: agreement.id,
      onChainAgreementId: agreement.onChainAgreementId,
      summary: onChainSummary,
      milestonePayouts,
      paymentEvents,
    };
  }
}
