
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
    throw new Error(
      data?.error || `Request failed (${res.status})`
    );
  }

  return data;
}

export const api = {
  // General requests
  get: (path) => request(path),

  post: (path, body) =>
    request(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Authentication
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  requestEmailOtp: (email) =>
    request('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  verifyEmailOtp: (email, otp) =>
    request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }),

  register: (payload) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Registered student statistics
  getRegisteredStudentCount: () =>
    request('/auth/student-count'),

  // Routes
  getRoutes: () => request('/routes'),

  createRoute: (payload) =>
    request('/routes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateRoute: (routeId, payload) =>
    request(`/routes/${routeId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteRoute: (routeId) =>
    request(`/routes/${routeId}`, {
      method: 'DELETE',
    }),

  // Buses
  getBuses: () => request('/buses'),

  createBus: (payload) =>
    request('/buses', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateBus: (busId, payload) =>
    request(`/buses/${busId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteBus: (busId) =>
    request(`/buses/${busId}`, {
      method: 'DELETE',
    }),

  getBus: (busId) =>
    request(`/buses/${busId}`),

  getBusCommunity: (busId) =>
    request(`/buses/${busId}/community`),

  // Route schedules
  addRouteSchedule: (routeId, payload) =>
    request(`/routes/${routeId}/schedules`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateRouteSchedule: (scheduleId, payload) =>
    request(`/schedules/${scheduleId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteRouteSchedule: (scheduleId) =>
    request(`/schedules/${scheduleId}`, {
      method: 'DELETE',
    }),

  // Route stops
  getRouteStops: (routeId) =>
    request(`/routes/${routeId}/stops`),

  // User points
  getMyPoints: () =>
    request('/me/points'),

  // Bus comments
  addBusComment: (busId, sessionId, comment) =>
    request(`/buses/${busId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ sessionId, comment }),
    }),
};

