import { apiFetch } from './client.js';

/**
 * Normalize post schema from backend or mock
 */
export function normalizePost(p) {
  if (!p) return p;
  let skills = [];
  if (Array.isArray(p.skills)) {
    skills = p.skills;
  } else if (typeof p.tags === 'string') {
    try {
      skills = JSON.parse(p.tags);
    } catch {
      skills = p.tags.split(',').map(s => s.trim()).filter(Boolean);
    }
  } else if (Array.isArray(p.tags)) {
    skills = p.tags;
  }

  const authorAddr = typeof p.author === 'object' && p.author !== null
    ? (p.author.walletAddress || '')
    : (p.author || '');

  const authorName = typeof p.author === 'object' && p.author !== null
    ? (p.author.name || '')
    : (p.authorName || '');

  return {
    ...p,
    author: authorAddr,
    authorName,
    authorObj: typeof p.author === 'object' ? p.author : null,
    skills,
    budget: typeof p.budget === 'number' ? `${p.budget} MATIC` : (p.budget || 'Negotiable'),
    proposalsCount: p.proposalsCount ?? p._count?.proposals ?? 0
  };
}

/**
 * Normalize proposal schema from backend or mock
 */
export function normalizeProposal(prop) {
  if (!prop) return prop;
  const authorAddr = typeof prop.freelancer === 'object' && prop.freelancer !== null
    ? (prop.freelancer.walletAddress || '')
    : (prop.author || '');

  const authorName = typeof prop.freelancer === 'object' && prop.freelancer !== null
    ? (prop.freelancer.name || 'Freelancer')
    : (prop.authorName || 'Freelancer');

  return {
    ...prop,
    author: authorAddr,
    authorName,
    message: prop.coverLetter || prop.message || '',
    price: prop.proposedBudget !== undefined ? `${prop.proposedBudget} MATIC` : (prop.price || '0 MATIC')
  };
}

/**
 * Get posts feed with optional filters
 * GET /posts?type=&q=
 */
export async function getPosts({ type, q } = {}) {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  if (q) params.append('q', q);
  const query = params.toString() ? `?${params.toString()}` : '';
  const data = await apiFetch(`/posts${query}`);
  if (Array.isArray(data)) {
    return data.map(normalizePost);
  }
  return data;
}

/**
 * Get single post by ID
 * GET /posts/:id
 */
export async function getPost(id) {
  const data = await apiFetch(`/posts/${id}`);
  return normalizePost(data);
}

/**
 * Create a new Job or Service post
 * POST /posts { type: "JOB" | "SERVICE", title, description, budget, skills[] }
 */
export async function createPost(postData) {
  const data = await apiFetch('/posts', {
    method: 'POST',
    body: JSON.stringify(postData)
  });
  return normalizePost(data);
}

/**
 * Get proposals for a post
 * GET /posts/:id/proposals
 */
export async function getProposals(postId) {
  const data = await apiFetch(`/posts/${postId}/proposals`);
  if (Array.isArray(data)) {
    return data.map(normalizeProposal);
  }
  return data;
}

/**
 * Submit a proposal for a post
 * POST /posts/:id/proposals { message, price }
 */
export async function createProposal(postId, proposalData) {
  const data = await apiFetch(`/posts/${postId}/proposals`, {
    method: 'POST',
    body: JSON.stringify(proposalData)
  });
  return normalizeProposal(data);
}
