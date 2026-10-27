import { apiFetch } from './client.js';
import { DEMO_ACCOUNTS } from '../mock/mockStore.js';
import { getNonce, verifySignature } from './auth.js';
import { Wallet } from 'ethers';

/**
 * Ensures an active authenticated session exists, auto-logging in with Client demo account if needed
 */
export async function ensureAuthenticated() {
  const isMock = localStorage.getItem('fairwork_app_mode') === 'demo' || import.meta.env.VITE_USE_MOCK === 'true';
  let token = localStorage.getItem('fairwork_jwt');
  if (token) return token;

  if (isMock) {
    const demoClient = DEMO_ACCOUNTS.CLIENT;
    const clientAddr = demoClient.address.toLowerCase();
    const fakeToken = `mock-token-${clientAddr}`;
    localStorage.setItem('fairwork_user_address', clientAddr);
    localStorage.setItem('fairwork_jwt', fakeToken);
    return fakeToken;
  }

  // Live mode: auto-authenticate with Client demo wallet (Account #1) using cryptographic SIWE
  const demoClient = DEMO_ACCOUNTS.CLIENT;
  if (demoClient?.privateKey) {
    try {
      const demoWallet = new Wallet(demoClient.privateKey);
      const addr = demoWallet.address.toLowerCase();
      const { nonce } = await getNonce(addr);
      const messageToSign = `FairWork login: ${nonce}`;
      const signature = await demoWallet.signMessage(messageToSign);
      const res = await verifySignature(addr, signature);
      if (res?.token) {
        localStorage.setItem('fairwork_jwt', res.token);
        localStorage.setItem('fairwork_user_address', addr);
        return res.token;
      }
    } catch (err) {
      console.warn('Auto-auth failed:', err);
    }
  }
  return null;
}

/**
 * Normalizes message object from backend or mock
 */
export function normalizeMessage(m) {
  if (!m) return m;
  const senderAddr = typeof m.sender === 'object' && m.sender !== null
    ? (m.sender.walletAddress || '')
    : (typeof m.sender === 'string' ? m.sender : (m.senderAddress || ''));

  return {
    ...m,
    id: m.id || `msg-${Date.now()}-${Math.random()}`,
    sender: senderAddr,
    senderAddress: senderAddr,
    senderName: (typeof m.sender === 'object' && m.sender?.name) ? m.sender.name : '',
    content: m.content || m.text || '',
    text: m.text || m.content || '',
    createdAt: m.createdAt || m.ts || new Date().toISOString()
  };
}

/**
 * Get chat threads for authenticated user
 * GET /threads
 */
export async function getThreads() {
  await ensureAuthenticated();
  const data = await apiFetch('/threads');
  if (Array.isArray(data)) {
    return data.map(t => ({
      ...t,
      lastMessage: t.lastMessage || t.messages?.[0]?.content || '',
      updatedAt: t.updatedAt || t.messages?.[0]?.createdAt || t.createdAt
    }));
  }
  return [];
}

/**
 * Start or open thread with address
 * POST /threads { otherAddress, recipientId, subject, postId? }
 */
export async function createThread({ otherAddress, recipientId, subject, postId }) {
  await ensureAuthenticated();
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
  if (!threadId) return [];
  await ensureAuthenticated();
  const data = await apiFetch(`/threads/${threadId}/messages`);
  if (Array.isArray(data)) {
    return data.map(normalizeMessage);
  }
  return [];
}

/**
 * Send message in a thread
 * POST /threads/:id/messages { text, content }
 */
export async function sendMessage(threadId, text) {
  await ensureAuthenticated();
  const data = await apiFetch(`/threads/${threadId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      text,
      content: text
    })
  });
  return normalizeMessage(data);
}
