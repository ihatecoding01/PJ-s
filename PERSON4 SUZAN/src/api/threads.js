import { apiFetch } from './client.js';
import { DEMO_ACCOUNTS } from '../mock/mockStore.js';

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
  const target = otherAddress || recipientId || DEMO_ACCOUNTS.FREELANCER.address;
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
