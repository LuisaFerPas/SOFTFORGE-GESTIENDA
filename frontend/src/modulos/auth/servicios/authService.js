import { apiFetch } from '../../../compartido/servicios/apiCliente.js';

export async function loginApi(username, password) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

export async function switchUserApi(username, password) {
  return apiFetch('/auth/switch-user', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}
