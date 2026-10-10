import { apiFetch } from './client.js';

/**
 * Get current authenticated user
 * GET /users/me
 */
export async function getMe() {
  return apiFetch('/users/me');
}

/**
 * Update authenticated user profile
 * PUT /users/me { name, bio, skills[], githubUsername, role }
 */
export async function updateMe(profileData) {
  return apiFetch('/users/me', {
    method: 'PUT',
    body: JSON.stringify(profileData)
  });
}

/**
 * Get public profile of user by address
 * GET /users/:address
 */
export async function getUser(address) {
  return apiFetch(`/users/${address}`);
}
