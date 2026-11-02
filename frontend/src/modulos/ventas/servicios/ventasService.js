import { apiFetch } from '../../../compartido/servicios/apiCliente.js';

/** Busca un producto por código de barras o interno. */
export async function buscarProductoPorCodigo(codigo) {
  return apiFetch(`/inventario/productos/codigo/${encodeURIComponent(codigo)}`);
}

/** Busca productos por nombre. Se conserva el contrato existente. */
export async function buscarProductosPorNombre(nombre) {
  return apiFetch(`/inventario/productos/buscar?q=${encodeURIComponent(nombre)}`);
}

/** Registra una venta nueva. */
export async function registrarVenta(datosVenta) {
  return apiFetch('/ventas', {
    method: 'POST',
    body: JSON.stringify(datosVenta),
  });
}

/** Alias de compatibilidad para la pantalla antigua de ventas. */
export async function crearVentaApi(datosVenta) {
  return registrarVenta(datosVenta);
}

/**
 * SD-121 / HU-0401.3: genera una factura SOLO después del consentimiento del cajero.
 * Reutiliza SD-120: POST /api/ventas/facturas con JWT gestionado por apiFetch.
 *
 * @param {number} ventaId - ID obtenido del POST /api/ventas.
 * @param {string|{nombreCliente?:string}} nombreCliente - Nombre opcional.
 * @returns {Promise<{success:boolean,data:object}>}
 */
export async function generarFactura(ventaId, nombreCliente = 'Consumidor Final') {
  const datos = typeof nombreCliente === 'string'
    ? { nombreCliente }
    : (nombreCliente ?? {});

  return apiFetch('/ventas/facturas', {
    method: 'POST',
    body: JSON.stringify({ ventaId, nombreCliente: datos.nombreCliente ?? 'Consumidor Final' }),
  });
}

/**
 * SD-123 / HU-0405.2: solicita los datos de una factura por consecutivo.
 * Endpoint: POST /api/ventas/facturas/:consecutivo/reimprimir.
 *
 * apiFetch adjunta el JWT e informa errores HTTP mediante excepciones.
 * El endpoint actual devuelve los datos para reimpresión, pero NO imprime
 * físicamente: revisa data.impresionRealizada antes de informar al cajero.
 *
 * @param {string} consecutivo - Ejemplo: "F-0001".
 * @returns {Promise<{success: boolean, message?: string, data: object}>}
 */
export async function reimprimirFactura(consecutivo) {
  if (typeof consecutivo !== 'string') {
    throw new Error('El consecutivo debe tener el formato F-0001.');
  }

  const numero = consecutivo.trim().toUpperCase();
  if (!/^F-[0-9]{4,}$/.test(numero)) {
    throw new Error('El consecutivo debe tener el formato F-0001.');
  }

  return apiFetch(`/ventas/facturas/${encodeURIComponent(numero)}/reimprimir`, {
    method: 'POST',
  });
}

/** HU-0404 Fase A: corrige el nombre del cliente de una factura emitida. */
export async function editarFactura(consecutivo, { nombreCliente } = {}) {
  if (typeof consecutivo !== 'string') {
    throw new Error('El consecutivo debe tener el formato F-0001.');
  }

  const numero = consecutivo.trim().toUpperCase();
  if (!/^F-[0-9]{4,}$/.test(numero)) {
    throw new Error('El consecutivo debe tener el formato F-0001.');
  }

  return apiFetch(`/ventas/facturas/${encodeURIComponent(numero)}`, {
    method: 'PUT',
    body: JSON.stringify({ nombreCliente }),
  });
}

/** HU-0404 Fase B: anula la venta/factura y devuelve los ítems para el POS. */
export async function anularYCargarCarrito(consecutivo) {
  if (typeof consecutivo !== 'string') {
    throw new Error('El consecutivo debe tener el formato F-0001.');
  }

  const numero = consecutivo.trim().toUpperCase();
  if (!/^F-[0-9]{4,}$/.test(numero)) {
    throw new Error('El consecutivo debe tener el formato F-0001.');
  }

  return apiFetch(`/ventas/facturas/${encodeURIComponent(numero)}/reutilizar`, {
    method: 'POST',
  });
}

// ── HU-0302: Búsqueda de productos por nombre desde módulo de ventas ──────────
export async function buscarProductosPorNombreApi(nombre) {
  const q = encodeURIComponent((nombre || '').trim());
  return apiFetch(`/ventas/productos/buscar?nombre=${q}`);
}

// ── HU-0403: Facturación con nombre de cliente opcional ───────────────────────
export async function generarFacturaApi(ventaId, nombreCliente = null) {
  return apiFetch('/ventas/facturas', {
    method: 'POST',
    body: JSON.stringify({ ventaId, nombreCliente: nombreCliente || 'Consumidor Final' })
  });
}

export async function buscarFacturaApi(consecutivo) {
  return apiFetch(`/ventas/facturas/${encodeURIComponent(consecutivo)}`);
}

// ── HU-0402: Impresión física directa ─────────────────────────────────────────
export async function generarEImprimirFacturaApi(ventaId, nombreCliente = 'Consumidor Final') {
  return apiFetch('/ventas/facturas/imprimir', {
    method: 'POST',
    body: JSON.stringify({ ventaId, nombreCliente: nombreCliente || 'Consumidor Final' }),
  });
}
