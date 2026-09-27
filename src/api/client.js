const API_BASE = '/api';

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),

  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  requestEmailOtp: (email) =>
    request('/auth/request-otp', { method: 'POST', body: JSON.stringify({ email }) }),

  verifyEmailOtp: (email, otp) =>
    request('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp }) }),

  register: (payload) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),

  getRoutes: () => request('/routes'),
  getRouteStops: (routeId) => request(`/routes/${routeId}/stops`),
  getBuses: () => request('/buses'),
  getBus: (busId) => request(`/buses/${busId}`),
  getBusCommunity: (busId) => request(`/buses/${busId}/community`),
  getMyPoints: () => request('/me/points'),
  addBusComment: (busId, sessionId, comment) =>
    request(`/buses/${busId}/comments`, { method: 'POST', body: JSON.stringify({ sessionId, comment }) }),
};
