import { prisma } from '../../lib/prisma';
import { AiAdapter } from '../../adapters/aiAdapter';

export class ScopeDetectorService {
  /**
   * Evaluates client rejection feedback against milestone acceptance criteria
   * to classify whether it is a legitimate DEFECT_FIX or out-of-scope SCOPE_CREEP.
   */
  static async analyzeRevisionScope(identifier: string, rejectionReason: string, milestoneIdx?: number) {
    let milestone = null;

    if (milestoneIdx !== undefined) {
      milestone = await prisma.milestone.findFirst({
        where: { agreementId: identifier, milestoneIndex: milestoneIdx },
        include: { agreement: true },
      });
    }

    if (!milestone) {
      milestone = await prisma.milestone.findUnique({
        where: { id: identifier },
        include: { agreement: true },
      });
    }

    if (!milestone) {
      milestone = await prisma.milestone.findFirst({
        where: { agreementId: identifier },
        include: { agreement: true },
      });
    }

    if (!milestone) {
      throw new Error(`Milestone '${identifier}' not found`);
    }

    let criteria: string[] = [];
    if (milestone.agreement?.termsJson) {
      try {
        const terms = JSON.parse(milestone.agreement.termsJson);
        const mTerms = terms.milestones?.find((m: any) => m.index === milestone!.milestoneIndex) || {};
        criteria = mTerms.acceptanceCriteria || mTerms.criteria || [];
      } catch {
        criteria = [];
      }
    }

    const analysis = await AiAdapter.checkScopeCreep({
      milestoneTitle: milestone.title,
      acceptanceCriteria: criteria,
      rejectionReason,
    });

    return {
      milestoneId: milestone.id,
      milestoneIndex: milestone.milestoneIndex,
      milestoneTitle: milestone.title,
      classification: analysis.isScopeCreep ? 'SCOPE_CREEP' : 'DEFECT_FIX',
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
      suggestedAmendment: analysis.isScopeCreep
        ? {
            suggestedAdditionalBudget: analysis.suggestedBudget ?? 0.25,
            suggestedAdditionalDays: analysis.suggestedDays ?? 4,
          }
        : null,
    };
  }
}
