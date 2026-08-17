const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'schedulo_access_token';

export const getToken = () => window.localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => window.localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => window.localStorage.removeItem(TOKEN_KEY);

export async function authenticate(path, payload) {
  const response = await fetch(`${API_URL}/api/v1/auth/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Authentication failed');
  setToken(data.access_token);
  return data;
}

export async function getCurrentUser(token = getToken()) {
  if (!token) return null;
  const response = await fetch(`${API_URL}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) { clearToken(); return null; }
  return response.json();
}

export async function getMyOrganization(token = getToken()) {
  if (!token) return null;
  const response = await fetch(`${API_URL}/api/v1/organizations/me`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('Could not load your organization');
  return response.json();
}

export const googleLoginUrl = `${API_URL}/api/v1/auth/google/start`;
export { API_URL };
