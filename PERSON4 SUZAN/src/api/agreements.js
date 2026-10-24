import { apiFetch } from './client.js';

/**
 * Generate agreement draft from chat thread via AI service
 * POST /agreements/draft { threadId } -> { agreementId, terms, openQuestions, warnings }
 */
export async function draftAgreement(threadId) {
  return apiFetch('/agreements/draft', {
    method: 'POST',
    body: JSON.stringify({ threadId })
  });
}

/**
 * Get all agreements for user
 * GET /agreements
 */
export async function getAgreements() {
  return apiFetch('/agreements');
}

/**
 * Get agreement details by ID
 * GET /agreements/:id
 */
export async function getAgreement(id) {
  return apiFetch(`/agreements/${id}`);
}

/**
 * Update agreement terms (resets approvals)
 * PUT /agreements/:id/terms { terms }
 */
export async function updateAgreementTerms(id, terms) {
  return apiFetch(`/agreements/${id}/terms`, {
    method: 'PUT',
    body: JSON.stringify({ terms })
  });
}

/**
 * Approve draft terms
 * POST /agreements/:id/approve-draft
 */
export async function approveDraft(id) {
  return apiFetch(`/agreements/${id}/approve-draft`, {
    method: 'POST'
  });
}

/**
 * Link on-chain agreement ID and txHash
 * POST /agreements/:id/link-chain { onchainId, txHash }
 */
export async function linkChain(id, { onchainId, txHash }) {
  return apiFetch(`/agreements/${id}/link-chain`, {
    method: 'POST',
    body: JSON.stringify({ onchainId, txHash })
  });
}

/**
 * Get agreement timeline
 * GET /agreements/:id/timeline
 */
export async function getTimeline(id) {
  return apiFetch(`/agreements/${id}/timeline`);
}

/**
 * Get agreement payments summary
 * GET /agreements/:id/payments
 */
export async function getPayments(id) {
  return apiFetch(`/agreements/${id}/payments`);
}

/**
 * Get agreement active alerts
 * GET /agreements/:id/alerts
 */
export async function getAlerts(id) {
  return apiFetch(`/agreements/${id}/alerts`);
}

/**
 * Generate plan and draft agreement autonomously from a project brief
 * POST /agreements/plan-from-brief
 */
export async function planFromBrief(data) {
  return apiFetch('/agreements/plan-from-brief', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * Audit agreement terms for clarity, fairness, and pre-lock escrow risks
 * POST /agreements/:id/audit or POST /agreements/audit
 */
export async function auditAgreement(id, terms) {
  if (id) {
    return apiFetch(`/agreements/${id}/audit`, {
      method: 'POST',
      body: terms ? JSON.stringify({ terms }) : undefined
    });
  }
  return apiFetch('/agreements/audit', {
    method: 'POST',
    body: JSON.stringify({ terms })
  });
}
