const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Cliente HTTP base para llamadas a la API REST de Gestienda
 */
export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('gestienda_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Error en la petición HTTP: ${response.status}`);
  }

  return data;
}
