import { Factura, EstadoFactura } from '../../dominio/Factura.js';

/**
 * Data Mapper entre filas de la tabla `facturas` y la entidad Factura.
 * HU-0300.6
 */
export class FacturaMapper {
  /**
   * Convierte una fila plana de la BD (tabla `facturas`) en una entidad Factura.
   *
   * @param {object} fila - Fila raw de `facturas`.
   * @returns {Factura}
   */
  static aEntidad(fila) {
    return new Factura({
      id:            fila.id,
      ventaId:       fila.venta_id,
      consecutivo:   fila.consecutivo,
      nombreCliente: fila.nombre_cliente ?? 'Consumidor Final',
      fechaEmision:  fila.fecha_emision,
      estado:        fila.estado ?? EstadoFactura.EMITIDA,
    });
  }

  /**
   * Convierte una entidad Factura en un objeto plano listo para INSERT en `facturas`.
   * No incluye `id` (lo genera la BD).
   *
   * @param {Factura} factura
   * @returns {object}
   */
  static aFilaDB(factura) {
    return {
      venta_id:       factura.ventaId,
      consecutivo:    factura.consecutivo,
      nombre_cliente: factura.nombreCliente ?? 'Consumidor Final',
      fecha_emision:  factura.fechaEmision  ?? new Date().toISOString(),
      estado:         factura.estado        ?? EstadoFactura.EMITIDA,
    };
  }
}
