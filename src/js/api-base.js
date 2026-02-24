// Central API base helper for deploys where frontend and backend are on different domains.
// Configure with Vite env var: VITE_API_BASE_URL="https://your-backend.example.com"

const RAW_BASE = (import.meta?.env?.VITE_API_BASE_URL || '').trim();
const API_BASE_URL = RAW_BASE ? RAW_BASE.replace(/\/+$/, '') : '';

function isAbsoluteUrl(url) {
  return /^https?:\/\//i.test(url);
}

export function apiUrl(pathOrUrl) {
  const url = String(pathOrUrl || '');
  if (!API_BASE_URL) return url;
  if (isAbsoluteUrl(url)) return url;
  if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
  return `${API_BASE_URL}/${url}`;
}

export function apiFetch(url, options) {
  // This project uses string URLs throughout; keep it simple.
  return fetch(apiUrl(url), options);
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

