import { prisma } from '../../lib/prisma';
import { ChainAdapter } from '../../adapters/chainAdapter';

export interface TimelineItem {
  id: string;
  timestamp: Date;
  type: 'LIFECYCLE' | 'MILESTONE' | 'DISPUTE' | 'CHAIN_EVENT';
  title: string;
  description: string;
  metadata?: any;
}

export class EventIndexerService {
  /**
   * Backfills on-chain events and persists them in the ChainEvent model.
   */
  static async indexEventsForAgreement(agreementId: string) {
    const agreement = await prisma.agreement.findUnique({
      where: { id: agreementId },
    });

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    const events = await ChainAdapter.backfillEvents(
      agreement.onChainAgreementId || agreementId
    );

    const indexedRecords = [];

    for (const ev of events) {
      // Check if event is already persisted
      const existing = await prisma.chainEvent.findFirst({
        where: {
          transactionHash: ev.transactionHash,
          logIndex: ev.logIndex,
        },
      });

      if (!existing) {
        const created = await prisma.chainEvent.create({
          data: {
            agreementId: agreement.id,
            eventName: ev.eventName,
            transactionHash: ev.transactionHash,
            blockNumber: ev.blockNumber,
            logIndex: ev.logIndex,
            argsJson: ev.argsJson,
            timestamp: ev.timestamp,
          },
        });
        indexedRecords.push(created);
      }
    }

    return indexedRecords;
  }

  /**
   * Builds a complete, chronological timeline for an agreement.
   */
  static async buildTimeline(agreementId: string): Promise<TimelineItem[]> {
    const agreement = await prisma.agreement.findUnique({
      where: { id: agreementId },
      include: {
        milestones: {
          include: { progressReports: true },
        },
        disputes: {
          include: { evidences: true },
        },
        chainEvents: true,
      },
    });

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    const timeline: TimelineItem[] = [];

    // 1. Agreement creation
    timeline.push({
      id: `lifecycle-create-${agreement.id}`,
      timestamp: agreement.createdAt,
      type: 'LIFECYCLE',
      title: 'Agreement Drafted',
      description: `Draft created for '${agreement.title}'.`,
    });

    // 2. Client approval
    if (agreement.clientApprovedAt) {
      timeline.push({
        id: `lifecycle-client-approve-${agreement.id}`,
        timestamp: agreement.clientApprovedAt,
        type: 'LIFECYCLE',
        title: 'Client Approved Terms',
        description: 'Client gave formal sign-off to terms.',
      });
    }

    // 3. Freelancer approval
    if (agreement.freelancerApprovedAt) {
      timeline.push({
        id: `lifecycle-freelancer-approve-${agreement.id}`,
        timestamp: agreement.freelancerApprovedAt,
        type: 'LIFECYCLE',
        title: 'Freelancer Approved Terms',
        description: 'Freelancer gave formal sign-off to terms.',
      });
    }

    // 4. Locked terms
    if (agreement.lockedAt) {
      timeline.push({
        id: `lifecycle-lock-${agreement.id}`,
        timestamp: agreement.lockedAt,
        type: 'LIFECYCLE',
        title: 'Canonical Terms Locked',
        description: `Deterministic terms hash locked: ${agreement.canonicalHash}`,
        metadata: { canonicalHash: agreement.canonicalHash },
      });
    }

    // 5. Milestones & Progress reports
    for (const m of agreement.milestones) {
      if (m.submittedAt) {
        timeline.push({
          id: `milestone-submit-${m.id}`,
          timestamp: m.submittedAt,
          type: 'MILESTONE',
          title: `Milestone ${m.milestoneIndex + 1} Submitted`,
          description: `Repo submitted: ${m.submissionRepoUrl || 'N/A'}. Status: ${m.status}`,
          metadata: { milestoneId: m.id, repoUrl: m.submissionRepoUrl },
        });
      }

      for (const pr of m.progressReports) {
        timeline.push({
          id: `oracle-report-${pr.id}`,
          timestamp: pr.createdAt,
          type: 'MILESTONE',
          title: `Oracle Progress Verification (M${m.milestoneIndex + 1})`,
          description: `Quality Score: ${pr.qualityScore}/100. Tests Passing: ${pr.testsPassing}. Oracle Tx: ${pr.oracleTxHash || 'Mock'}`,
          metadata: { canonicalReportHash: pr.canonicalReportHash },
        });
      }
    }

    // 6. Disputes
    for (const d of agreement.disputes) {
      timeline.push({
        id: `dispute-open-${d.id}`,
        timestamp: d.createdAt,
        type: 'DISPUTE',
        title: 'Dispute Raised',
        description: `Reason: ${d.reason}`,
      });

      if (d.aiSummary) {
        timeline.push({
          id: `dispute-ai-${d.id}`,
          timestamp: d.updatedAt,
          type: 'DISPUTE',
          title: 'AI Arbitration Summary & Recommendation',
          description: d.oracleRecommendation || d.aiSummary,
        });
      }
    }

    // 7. Chain events
    for (const ev of agreement.chainEvents) {
      timeline.push({
        id: `chain-event-${ev.id}`,
        timestamp: ev.timestamp,
        type: 'CHAIN_EVENT',
        title: `On-Chain Event: ${ev.eventName}`,
        description: `Tx: ${ev.transactionHash} (Block ${ev.blockNumber})`,
        metadata: { args: ev.argsJson },
      });
    }

    // Sort chronologically
    return timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}
