/**
 * HU-0303.2 — Lógica pura del carrito.
 * Sin React: se prueba con `node --test`.
 */

export const MENSAJE_CANTIDAD_INVALIDA =
  'La cantidad debe ser un número entero mayor que 0.';

/**
 * Valida una cantidad escrita por el cajero.
 * @param {string|number} valor
 * @returns {{ valida: boolean, cantidad?: number, error?: string }}
 */
export function validarCantidad(valor) {
  if (typeof valor === 'string') {
    const texto = valor.trim();
    if (!/^\d+$/.test(texto)) {
      return { valida: false, error: MENSAJE_CANTIDAD_INVALIDA };
    }
    const cantidad = Number(texto);
    if (!Number.isSafeInteger(cantidad) || cantidad < 1) {
      return { valida: false, error: MENSAJE_CANTIDAD_INVALIDA };
    }
    return { valida: true, cantidad };
  }

  if (typeof valor === 'number') {
    if (!Number.isSafeInteger(valor) || valor < 1) {
      return { valida: false, error: MENSAJE_CANTIDAD_INVALIDA };
    }
    return { valida: true, cantidad: valor };
  }

  return { valida: false, error: MENSAJE_CANTIDAD_INVALIDA };
}

/**
 * Subtotal de una línea del carrito.
 * @param {{ precioVentaUnitario?: number|string, cantidad?: number|string }} item
 * @returns {number}
 */
export function subtotalLinea(item) {
  const { valida, cantidad } = validarCantidad(item?.cantidad);
  const precio = Number(item?.precioVentaUnitario);
  if (!valida || !Number.isFinite(precio)) return 0;
  return precio * cantidad;
}

/**
 * Total del carrito: suma de los subtotales.
 * @param {Array<object>} items
 * @returns {number}
 */
export function totalCarrito(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((total, item) => total + subtotalLinea(item), 0);
}
