import { apiFetch } from './client.js';

/**
 * Submit milestone for review and trigger AI GitHub analysis
 * POST /agreements/:id/milestones/:idx/submit { commitSha, prUrl?, notes }
 */
export async function submitMilestone(agreementId, idx, { commitSha, prUrl, notes, deliverableType, deliverableContent, assetUrl }) {
  return apiFetch(`/agreements/${agreementId}/milestones/${idx}/submit`, {
    method: 'POST',
    body: JSON.stringify({ commitSha, prUrl, notes, deliverableType, deliverableContent, assetUrl })
  });
}

/**
 * Get AI progress analysis report for a milestone
 * GET /agreements/:id/milestones/:idx/progress
 */
export async function getMilestoneProgress(agreementId, idx) {
  return apiFetch(`/agreements/${agreementId}/milestones/${idx}/progress`);
}
