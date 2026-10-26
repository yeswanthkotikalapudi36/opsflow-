const BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('opsflow_token');
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

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
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
