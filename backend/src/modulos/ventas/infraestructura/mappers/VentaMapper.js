import { Venta, EstadoVenta } from '../../dominio/Venta.js';

/**
 * Data Mapper entre filas de la tabla `sales` / `sale_items` y la entidad Venta.
 * HU-0300.6
 */
export class VentaMapper {
  /**
   * Convierte una fila plana de la BD (tabla `sales`) en una entidad Venta.
   * Los ítems son opcionales: si se pasan, se incluyen en la entidad.
   *
   * @param {object}   fila        - Fila raw de `sales`.
   * @param {Array}    [items=[]]  - Filas raw de `sale_items` asociadas.
   * @returns {Venta}
   */
  static aEntidad(fila, items = []) {
    return new Venta({
      id:            fila.id,
      numeroFactura: fila.numero_factura ?? null,
      clienteNombre: fila.cliente_nombre ?? 'Consumidor Final',
      usuarioId:     fila.usuario_id,
      subtotal:      fila.subtotal      ?? null,
      ivaTotal:      fila.iva_total     ?? 0,
      total:         fila.total,
      fechaHora:     fila.created_at,
      estado:        fila.estado        ?? EstadoVenta.COMPLETADA,
      items,
    });
  }

  /**
   * Convierte una entidad Venta en un objeto plano listo para INSERT en `sales`.
   * No incluye `id` (lo genera la BD).
   *
   * @param {Venta} venta
   * @returns {object}
   */
  static aFilaDB(venta) {
    return {
      usuario_id:     venta.usuarioId,
      total:          venta.total ?? venta.calcularTotal(),
      medio_pago:     venta.medioPago   ?? null,
      monto_efectivo: venta.montoEfectivo ?? 0,
      monto_nequi:    venta.montoNequi   ?? 0,
      cambio:         venta.cambio       ?? 0,
      created_at:     venta.fechaHora    ?? new Date().toISOString(),
    };
  }
}
