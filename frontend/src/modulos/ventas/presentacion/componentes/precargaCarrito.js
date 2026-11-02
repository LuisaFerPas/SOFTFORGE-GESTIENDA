/**
 * HU-0404 Fase B — transforma la respuesta de reutilización en líneas del POS.
 * Sin React: se prueba con `node --test`.
 */

const enteroPositivo = (valor) => Number.isSafeInteger(valor) && valor > 0;

export function mapearPrecargaCarrito(precarga) {
  const items = [];
  const porProducto = new Map();

  if (precarga && Array.isArray(precarga.items)) {
    for (const item of precarga.items) {
      const id = Number(item?.productoId);
      const cantidad = Number(item?.cantidad);
      const precio = Number(item?.precioVentaUnitario);
      const nombre = typeof item?.nombre === 'string' ? item.nombre.trim() : '';

      if (!enteroPositivo(id) || !enteroPositivo(cantidad) ||
          !Number.isFinite(precio) || precio <= 0 || !nombre) {
        continue;
      }

      const existente = porProducto.get(id);
      if (existente) {
        existente.cantidad += cantidad;
        continue;
      }

      const linea = {
        id,
        nombre,
        cantidad,
        precioVentaUnitario: precio,
        precioOriginal: Number.isFinite(Number(item?.precioOriginal))
          ? Number(item.precioOriginal)
          : precio
      };
      porProducto.set(id, linea);
      items.push(linea);
    }
  }

  const consecutivo = typeof precarga?.consecutivo === 'string'
    ? precarga.consecutivo.trim().toUpperCase()
    : String(precarga?.facturaAnulada?.consecutivo ?? '').trim().toUpperCase();

  return {
    items,
    consecutivo,
    nombreCliente: typeof precarga?.nombreCliente === 'string' && precarga.nombreCliente.trim()
      ? precarga.nombreCliente.trim()
      : 'Consumidor Final',
    preciosActualizados: Boolean(precarga?.preciosActualizados)
  };
}
