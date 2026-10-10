import { apiFetch } from './client.js';

/**
 * Fetch nonce for wallet address
 * POST /auth/nonce { address } -> { nonce }
 */
export async function getNonce(address) {
  return apiFetch('/auth/nonce', {
    method: 'POST',
    body: JSON.stringify({ address })
  });
}

/**
 * Verify signed login message
 * POST /auth/verify { address, signature } -> { token, user }
 */
export async function verifySignature(address, signature) {
  return apiFetch('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ address, signature })
  });
}
