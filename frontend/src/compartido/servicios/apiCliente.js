const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const API_BASE_URL = `http://${host}:3000/api`;

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

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Se canceló la solicitud. Puedes volver a intentarlo.');
    }
    throw new Error('No hay conexión con el servidor de Gestienda. Comprueba que el backend esté iniciado en el puerto 3000 y vuelve a intentar.');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Una sesión vencida debe cerrar el acceso de toda la app; no solo fallar en un panel.
    // Un intento de login incorrecto no debe cerrar otra sesión ni emitir este evento.
    if (response.status === 401 && !endpoint.startsWith('/auth/login')) {
      localStorage.removeItem('gestienda_token');
      localStorage.removeItem('gestienda_user');
      if (typeof window !== 'undefined') {
        try { sessionStorage.setItem('gestienda_sesion_expirada', '1'); } catch { /* almacenamiento deshabilitado */ }
        window.dispatchEvent(new Event('gestienda:sesion-expirada'));
      }
      throw new Error('La sesión expiró. Inicia sesión nuevamente para continuar.');
    }
    throw new Error(data.message || `Error en la petición HTTP: ${response.status}`);
  }

  return data;
}
