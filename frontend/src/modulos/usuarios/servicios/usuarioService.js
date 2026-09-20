import { apiFetch } from '../../../compartido/servicios/apiCliente.js';

export async function listarUsuariosApi(filtros = {}) {
  return apiFetch('/usuarios');
}

export async function registrarUsuarioApi(datos) {
  return apiFetch('/usuarios', {
    method: 'POST',
    body: JSON.stringify(datos)
  });
}

export async function editarUsuarioApi(id, datos) {
  return apiFetch(`/usuarios/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos)
  });
}

export async function cambiarEstadoUsuarioApi(id, estado) {
  return apiFetch(`/usuarios/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado })
  });
}
