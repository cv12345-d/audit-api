// src/lib/api.js — Client API ThesisMatch

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : '/api';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('thesismatch_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.erreur || data.message || `Erreur HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

// ─────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────

export const auth = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/auth/me'),
};

// ─────────────────────────────────────────────
// Promoteurs
// ─────────────────────────────────────────────

export const promoteurs = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/promoteurs${qs ? `?${qs}` : ''}`);
  },
  get: (id) => request(`/promoteurs/${id}`),
  create: (data) => request('/promoteurs', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/promoteurs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/promoteurs/${id}`, { method: 'DELETE' }),
};

// ─────────────────────────────────────────────
// Étudiants
// ─────────────────────────────────────────────

export const etudiants = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/etudiants${qs ? `?${qs}` : ''}`);
  },
  get: (id) => request(`/etudiants/${id}`),
  create: (data) => request('/etudiants', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/etudiants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/etudiants/${id}`, { method: 'DELETE' }),
};

// ─────────────────────────────────────────────
// Matching
// ─────────────────────────────────────────────

export const matching = {
  suggestions: (etudiantId) => request(`/matching/${etudiantId}`),
  assigner: (etudiantId, promoteurId) =>
    request('/matching/assigner', {
      method: 'POST',
      body: JSON.stringify({ etudiantId, promoteurId }),
    }),
  desassigner: (etudiantId) =>
    request(`/matching/desassigner/${etudiantId}`, { method: 'DELETE' }),
};

// ─────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────

export const stats = {
  global: () => request('/stats'),
  promoteurs: () => request('/stats/promoteurs'),
  domaines: () => request('/stats/domaines'),
};

// ─────────────────────────────────────────────
// Workflow
// ─────────────────────────────────────────────

export const workflow = {
  etapes: () => request('/workflow/etapes'),
  avancerEtape: (etudiantId, etape, statut) =>
    request(`/workflow/etudiant/${etudiantId}/etape`, {
      method: 'PUT',
      body: JSON.stringify({ etape, statut }),
    }),
};
