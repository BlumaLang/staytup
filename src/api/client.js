/**
 * Staytup API Client
 * Automatically determines API URL depending on whether running in Vite dev or Apache deployment.
 */

const getApiBase = () => {
  // Check if we are running in subfolder /staytup
  if (window.location.pathname.includes('/staytup')) {
    return '/staytup/api';
  }
  return '/api';
};

export async function apiRequest(endpoint, options = {}) {
  const base = getApiBase();
  const url = `${base}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  
  const userId = localStorage.getItem('staytup_user_id') || 'guest_user';

  const defaultHeaders = {
    'Accept': 'application/json',
    'X-User-Id': userId,
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorData = null;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
    }
    const err = new Error(errorData?.error || errorData?.message || 'API request failed');
    err.status = response.status;
    err.data = errorData;
    throw err;
  }

  return response.json();
}
