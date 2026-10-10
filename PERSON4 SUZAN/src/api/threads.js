import { apiFetch } from './client.js';

/**
 * Get chat threads for authenticated user
 * GET /threads
 */
export async function getThreads() {
  return apiFetch('/threads');
}

/**
 * Start or open thread with address
 * POST /threads { otherAddress, postId? }
 */
export async function createThread({ otherAddress, postId }) {
  return apiFetch('/threads', {
    method: 'POST',
    body: JSON.stringify({ otherAddress, postId })
  });
}

/**
 * Get messages for a thread
 * GET /threads/:id/messages
 */
export async function getMessages(threadId) {
  return apiFetch(`/threads/${threadId}/messages`);
}

/**
 * Send message in a thread
 * POST /threads/:id/messages { text }
 */
export async function sendMessage(threadId, text) {
  return apiFetch(`/threads/${threadId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text })
  });
}
