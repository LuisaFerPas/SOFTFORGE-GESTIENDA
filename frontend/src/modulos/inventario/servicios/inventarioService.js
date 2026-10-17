import { apiFetch } from '../../../compartido/servicios/apiCliente.js';

/**
 * Cliente HTTP para el Módulo de Inventario y Catálogo de Productos.
 */

/**
 * Consulta la lista de productos con filtros opcionales.
 * @param {Object} filtros - { search, categoria, estadoStock }
 */
export async function listarProductosApi(filtros = {}) {
  const params = new URLSearchParams();
  if (filtros.search) params.append('search', filtros.search);
  if (filtros.categoria) params.append('categoria', filtros.categoria);
  if (filtros.estadoStock) params.append('estadoStock', filtros.estadoStock);

  const query = params.toString() ? `?${params.toString()}` : '';
  return apiFetch(`/inventario/productos${query}`);
}

/**
 * Obtiene un producto por su identificador único.
 */
export async function obtenerProductoPorIdApi(id) {
  return apiFetch(`/inventario/productos/${id}`);
}

/**
 * Busca un producto por código de barras o código interno.
 */
export async function obtenerProductoPorCodigoApi(codigo) {
  return apiFetch(`/inventario/productos/codigo/${encodeURIComponent(codigo)}`);
}

/**
 * HU-0607: Consulta de stock actual (Exclusivo Administrador).
 */
export async function consultarStockApi(id) {
  return apiFetch(`/inventario/productos/${id}/stock`);
}

/**
 * HU-0604: Consulta de productos en alerta de stock bajo o agotados.
 */
export async function obtenerAlertasApi() {
  return apiFetch('/inventario/alertas');
}

/**
 * HU-0601: Registrar una entrada de stock (reabastecimiento).
 * @param {Object} datos - { productoId, cantidad, costoUnitario, motivo }
 */
export async function registrarEntradaStockApi(datos) {
  return apiFetch('/inventario/stock/entrada', {
    method: 'POST',
    body: JSON.stringify(datos)
  });
}

/**
 * HU-0603: Consultar el historial de entradas.
 * @param {Object} filtros - { productoId, limite }
 */
export async function obtenerHistorialEntradasApi(filtros = {}) {
  const params = new URLSearchParams();
  if (filtros.productoId) params.append('productoId', filtros.productoId);
  if (filtros.limite) params.append('limite', filtros.limite);

  const query = params.toString() ? `?${params.toString()}` : '';
  return apiFetch(`/inventario/stock/entradas${query}`);
}