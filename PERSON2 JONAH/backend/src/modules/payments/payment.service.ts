import { prisma } from '../../lib/prisma';
import { ChainAdapter } from '../../adapters/chainAdapter';

export class PaymentService {
  /**
   * Combines indexed contract events with the contract's payment summary view.
   */
  static async getPaymentSummary(agreementId: string) {
    if (!agreementId || agreementId === 'undefined' || agreementId === 'null') {
      const err: any = new Error('Agreement ID is required');
      err.statusCode = 400;
      throw err;
    }

    const agreement = await prisma.agreement.findFirst({
      where: {
        OR: [{ id: agreementId }, { onChainAgreementId: agreementId }],
      },
      include: {
        milestones: true,
      },
    });

    if (!agreement) {
      const err: any = new Error('Agreement not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
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
