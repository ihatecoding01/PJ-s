import { formatEther } from 'ethers';

/**
 * Shorten Ethereum address (0x1234...5678)
 */
export function shortenAddress(address, chars = 4) {
  if (!address) return '';
  const str = String(address);
  if (str.length <= chars * 2 + 2) return str;
  return `${str.substring(0, chars + 2)}...${str.substring(str.length - chars)}`;
}

/**
 * Format MATIC amount
 */
export function formatMatic(val) {
  if (val === undefined || val === null) return '0.00 MATIC';
  if (typeof val === 'bigint') {
    return `${parseFloat(formatEther(val)).toFixed(4)} MATIC`;
  }
  const num = parseFloat(val);
  return isNaN(num) ? '0.00 MATIC' : `${num.toFixed(4).replace(/\.?0+$/, '')} MATIC`;
}

/**
 * Format basis points to percentage (e.g. 8000 -> "80%")
 */
export function formatBps(bps) {
  if (bps === undefined || bps === null) return '0%';
  return `${(Number(bps) / 100).toFixed(1).replace(/\.0$/, '')}%`;
}

/**
 * Format date string or timestamp
 */
export function formatDate(timestampOrIso) {
  if (!timestampOrIso) return 'N/A';
  const d = typeof timestampOrIso === 'number'
    ? new Date(timestampOrIso < 1e11 ? timestampOrIso * 1000 : timestampOrIso)
    : new Date(timestampOrIso);
  if (isNaN(d.getTime())) return String(timestampOrIso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format relative time
 */
export function formatRelativeTime(timestampOrIso) {
  if (!timestampOrIso) return '';
  const d = typeof timestampOrIso === 'number'
    ? new Date(timestampOrIso < 1e11 ? timestampOrIso * 1000 : timestampOrIso)
    : new Date(timestampOrIso);
  if (isNaN(d.getTime())) return '';
  const now = Date.now();
  const diffSec = Math.floor((now - d.getTime()) / 1000);
  
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

/**
 * Calculate countdown time remaining
 */
export function timeRemaining(targetTimeSecOrIso) {
  if (!targetTimeSecOrIso) return { expired: true, text: 'No timer' };
  const targetMs = typeof targetTimeSecOrIso === 'number'
    ? (targetTimeSecOrIso < 1e11 ? targetTimeSecOrIso * 1000 : targetTimeSecOrIso)
    : new Date(targetTimeSecOrIso).getTime();
  
  const diff = targetMs - Date.now();
  if (diff <= 0) {
    return {
      expired: true,
      diffMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      text: 'Window expired'
    };
  }

  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  let text = '';
  if (days > 0) text += `${days}d `;
  if (hours > 0 || days > 0) text += `${hours}h `;
  text += `${minutes}m ${seconds}s`;

  return {
    expired: false,
    diffMs: diff,
    days,
    hours,
    minutes,
    seconds,
    text: text.trim()
  };
}
