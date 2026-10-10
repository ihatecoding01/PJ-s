import { apiFetch } from './client.js';

/**
 * Get posts feed with optional filters
 * GET /posts?type=&q=
 */
export async function getPosts({ type, q } = {}) {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  if (q) params.append('q', q);
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiFetch(`/posts${query}`);
}

/**
 * Get single post by ID
 * GET /posts/:id
 */
export async function getPost(id) {
  return apiFetch(`/posts/${id}`);
}

/**
 * Create a new Job or Service post
 * POST /posts { type: "JOB" | "SERVICE", title, description, budget, skills[] }
 */
export async function createPost(postData) {
  return apiFetch('/posts', {
    method: 'POST',
    body: JSON.stringify(postData)
  });
}

/**
 * Get proposals for a post
 * GET /posts/:id/proposals
 */
export async function getProposals(postId) {
  return apiFetch(`/posts/${postId}/proposals`);
}

/**
 * Submit a proposal for a post
 * POST /posts/:id/proposals { message, price }
 */
export async function createProposal(postId, proposalData) {
  return apiFetch(`/posts/${postId}/proposals`, {
    method: 'POST',
    body: JSON.stringify(proposalData)
  });
}
