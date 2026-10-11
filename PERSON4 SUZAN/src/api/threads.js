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
 * POST /threads { otherAddress, recipientId, subject, postId? }
 */
export async function createThread({ otherAddress, recipientId, subject, postId }) {
  const target = otherAddress || recipientId || '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
  return apiFetch('/threads', {
    method: 'POST',
    body: JSON.stringify({
      otherAddress: target,
      recipientId: target,
      subject: subject || 'Project Consultation',
      postId: postId || undefined
    })
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
 * POST /threads/:id/messages { text, content }
 */
export async function sendMessage(threadId, text) {
  return apiFetch(`/threads/${threadId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      text,
      content: text
    })
  });
}
