import { MovimientoStock } from '../../../dominio/MovimientoStock.js';

/**
 * Data Mapper: Traduce entre el esquema de auditoría de SQLite (tabla `stock_movements`) y la Entidad `MovimientoStock`.
 */
export class MovimientoStockMapper {
  /**
   * Convierte una fila de base de datos a una entidad `MovimientoStock`.
   * @param {Object} filaSql 
   * @returns {MovimientoStock|null}
   */
  static aDominio(filaSql) {
    if (!filaSql) return null;
    return new MovimientoStock({
      id: filaSql.id,
      productoId: filaSql.producto_id,
      tipo: filaSql.tipo,
      cantidad: filaSql.cantidad,
      stockAnterior: filaSql.stock_anterior,
      stockNuevo: filaSql.stock_nuevo,
      costoUnitario: filaSql.costo_unitario,
      motivo: filaSql.motivo,
      usuarioId: filaSql.usuario_id,
      createdAt: filaSql.created_at
    });
  }

  /**
   * Convierte una entidad `MovimientoStock` a formato de parámetros para persistencia SQL.
   * @param {MovimientoStock} movimiento 
   * @returns {Object}
   */
  static aPersistencia(movimiento) {
    return {
      id: movimiento.id,
      producto_id: movimiento.productoId,
      tipo: movimiento.tipo,
      cantidad: movimiento.cantidad,
      stock_anterior: movimiento.stockAnterior,
      stock_nuevo: movimiento.stockNuevo,
      costo_unitario: movimiento.costoUnitario,
      motivo: movimiento.motivo,
      usuario_id: movimiento.usuarioId,
      created_at: movimiento.createdAt
    };
  }
}
