// Production backend URL deployed on Render
const getApiBaseUrl = () => {
  const raw = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://opsflow-1-xd2t.onrender.com/api' : '/api');
  let clean = raw.trim().replace(/\/+$/, '');
  if (clean.startsWith('http') && !clean.endsWith('/api')) {
    clean += '/api';
  }
  return clean;
};
const BASE_URL = getApiBaseUrl();

// Thread-safe demo authentication helper to guarantee a valid JWT is always available
let autoLoginPromise = null;

export async function ensureAuthToken() {
  const existing = localStorage.getItem('opsflow_token');
  if (existing) return existing;

  if (!autoLoginPromise) {
    autoLoginPromise = (async () => {
      try {
        const response = await fetch(`${BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'alex@opsflow.internal',
            password: 'password123',
          }),
        });
        const data = await response.json();
        if (data.token) {
          localStorage.setItem('opsflow_token', data.token);
          return data.token;
        }
      } catch (err) {
        console.error('[API] Auto-login error:', err);
      } finally {
        autoLoginPromise = null;
      }
      return null;
    })();
  }
  return autoLoginPromise;
}

async function request(endpoint, options = {}) {
  // Ensure we have a valid token for all protected API calls
  let token = localStorage.getItem('opsflow_token');
  if (!token && !endpoint.startsWith('/auth/login') && !endpoint.startsWith('/auth/register')) {
    token = await ensureAuthToken();
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  let response = await fetch(`${BASE_URL}${endpoint}`, config);

  // If 401 received (e.g. stale/expired token), clear token, re-authenticate, and retry once
  if (response.status === 401 && !endpoint.startsWith('/auth/login')) {
    console.warn('[API] 401 Unauthorized encountered. Re-authenticating demo session...');
    localStorage.removeItem('opsflow_token');
    const freshToken = await ensureAuthToken();
    if (freshToken) {
      headers['Authorization'] = `Bearer ${freshToken}`;
      response = await fetch(`${BASE_URL}${endpoint}`, {
        ...config,
        headers,
      });
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  get: (endpoint, options) => request(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) => request(endpoint, { method: 'POST', body, ...options }),
  patch: (endpoint, body, options) => request(endpoint, { method: 'PATCH', body, ...options }),
  delete: (endpoint, options) => request(endpoint, { method: 'DELETE', ...options }),

  // Auth API
  auth: {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    getMe: () => api.get('/auth/me'),
    getUsers: () => api.get('/auth/users'),
  },

  // Incidents API
  incidents: {
    getAll: (params = {}) => {
      const search = new URLSearchParams();
      if (params.status) search.append('status', params.status);
      if (params.severity) search.append('severity', params.severity);
      if (params.serviceKey) search.append('serviceKey', params.serviceKey);
      if (params.search) search.append('search', params.search);
      const qs = search.toString();
      return api.get(`/incidents${qs ? `?${qs}` : ''}`);
    },
    getById: (id) => api.get(`/incidents/${id}`),
    create: (data) => api.post('/incidents', data),
    updateStatus: (id, status, note) => api.patch(`/incidents/${id}/status`, { status, note }),
    assignRole: (id, userId, role) => api.patch(`/incidents/${id}/assign`, { userId, role }),
    addTimelineNote: (id, content, type) => api.post(`/incidents/${id}/timeline`, { content, type }),
    addChecklistItem: (id, title) => api.post(`/incidents/${id}/checklist`, { title }),
    toggleChecklist: (id, itemId) => api.patch(`/incidents/${id}/checklist/${itemId}`),
    sendMessage: (id, message) => api.post(`/incidents/${id}/chat`, { message }),
    generatePostMortem: (id) => api.post(`/incidents/${id}/post-mortem`),
  },

  // Services API
  services: {
    getAll: () => api.get('/services'),
    getByKey: (key) => api.get(`/services/${key}`),
    create: (data) => api.post('/services', data),
    updateStatus: (key, status) => api.patch(`/services/${key}/status`, { status }),
  },

  // Webhooks API
  webhooks: {
    getLogs: (serviceKey) => api.get(`/webhooks/logs${serviceKey ? `?serviceKey=${serviceKey}` : ''}`),
    testTrigger: (payload) => api.post('/webhooks/test-trigger', payload),
  },

  // Analytics API
  analytics: {
    getMetrics: () => api.get('/analytics/metrics'),
  },
};
