import { apiFetch } from './client.js';

/**
 * Get chain configuration, contract address, and ABI
 * GET /config -> { chainId, contractAddress, abi }
 */
export async function getConfig() {
  return apiFetch('/config');
}

/**
 * Get backend system health
 * GET /health
 */
export async function getHealth() {
  return apiFetch('/health');
}
