import { apiFetch } from '../../../compartido/servicios/apiCliente.js';

export async function listarProductosApi(filtros = {}) {
  return apiFetch('/inventario/productos');
}

export async function registrarProductoApi(datos) {
  return apiFetch('/inventario/productos', {
    method: 'POST',
    body: JSON.stringify(datos)
  });
}
