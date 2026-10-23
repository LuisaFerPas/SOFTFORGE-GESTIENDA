import { apiFetch } from '../../../compartido/servicios/apiCliente.js';

// ─────────────────────────────────────────────────────────────────────────────
// Productos (usados desde el módulo de ventas para búsqueda en caja)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Busca un producto por código de barras o código interno.
 * HU-0300.8
 * @param {string} codigo
 */
export async function buscarProductoPorCodigo(codigo) {
  return apiFetch(`/inventario/productos/codigo/${encodeURIComponent(codigo)}`);
}

/**
 * Busca productos por nombre (autocompletado en caja).
 * HU-0300.8
 * @param {string} nombre
 */
export async function buscarProductosPorNombre(nombre) {
  return apiFetch(`/inventario/productos/buscar?q=${encodeURIComponent(nombre)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Ventas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registra una venta nueva.
 * HU-0300.8 — alias semántico de crearVentaApi.
 * @param {{ items: Array, medioPago: string, montoRecibido?: number, montoEfectivo?: number, montoNequi?: number }} datosVenta
 */
export async function registrarVenta(datosVenta) {
  return apiFetch('/ventas', {
    method: 'POST',
    body: JSON.stringify(datosVenta),
  });
}

/**
 * Alias mantenido por compatibilidad con el código existente de Camilo.
 * @param {object} datosVenta
 */
export async function crearVentaApi(datosVenta) {
  return registrarVenta(datosVenta);
}

// ─────────────────────────────────────────────────────────────────────────────
// Facturación
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Genera (o asocia) una factura a una venta existente.
 * HU-0300.8 — stub; la lógica real la implementa el equipo en HE-04.
 * @param {number} ventaId
 * @param {{ nombreCliente?: string }} [datosFactura={}]
 */
export async function generarFactura(ventaId, datosFactura = {}) {
  return apiFetch(`/ventas/${ventaId}/factura`, {
    method: 'POST',
    body: JSON.stringify(datosFactura),
  });
}

/**
 * Solicita la reimpresión de la factura de una venta.
 * HU-0300.8 — stub; la lógica real (impresora térmica) la implementa el equipo.
 * @param {number} ventaId
 */
export async function reimprimirFactura(ventaId) {
  return apiFetch(`/ventas/${ventaId}/reimprimir`, {
    method: 'POST',
  });
}

/**
 * Edita los datos de una factura ya emitida (ej. nombre del cliente).
 * HU-0300.8 — stub; la lógica real la implementa el equipo en HE-04.
 * @param {number} ventaId
 * @param {{ nombreCliente?: string, estado?: string }} datos
 */
export async function editarFactura(ventaId, datos) {
  return apiFetch(`/ventas/${ventaId}/factura`, {
    method: 'PATCH',
    body: JSON.stringify(datos),
  });
}

