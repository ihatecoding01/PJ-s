import { apiFetch } from './client.js';

/**
 * Submit evidence for a disputed milestone
 * POST /agreements/:id/milestones/:idx/evidence { text, files? }
 */
export async function submitEvidence(agreementId, idx, { text, files }) {
  return apiFetch(`/agreements/${agreementId}/milestones/${idx}/evidence`, {
    method: 'POST',
    body: JSON.stringify({ text, files })
  });
}

/**
 * Get dispute data and evidence thread for a milestone
 * GET /agreements/:id/milestones/:idx/dispute
 */
export async function getDispute(agreementId, idx) {
  return apiFetch(`/agreements/${agreementId}/milestones/${idx}/dispute`);
}

/**
 * Request advisory AI dispute summary and recommended split
 * POST /agreements/:id/milestones/:idx/ai-summary
 */
export async function getAiDisputeSummary(agreementId, idx) {
  return apiFetch(`/agreements/${agreementId}/milestones/${idx}/ai-summary`, {
    method: 'POST'
  });
}

/**
 * Get AI Arbitrator Executive Dossier with split Claims vs Fact matrix
 * GET /disputes/:disputeId/dossier
 */
export async function getArbitratorDossier(disputeId) {
  return apiFetch(`/disputes/${disputeId}/dossier`);
}

/**
 * Ask the interactive Arbitrator Evidence Cross-Examiner
 * POST /disputes/:disputeId/query { question }
 */
export async function queryArbitratorEvidence(disputeId, question) {
  return apiFetch(`/disputes/${disputeId}/query`, {
    method: 'POST',
    body: JSON.stringify({ question })
  });
}
