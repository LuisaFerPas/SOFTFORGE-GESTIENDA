import { IVentaRepository } from '../../dominio/puertos/IVentaRepository.js';
import { VentaMapper } from '../mappers/VentaMapper.js';
import { FacturaMapper } from '../mappers/FacturaMapper.js';

/**
 * Implementación SQLite (node:sqlite nativo) del repositorio de ventas.
 * HU-0300.6 — Extiende IVentaRepository y usa los Data Mappers.
 *
 * SD-70 / RV-15: se permite vender con stock cero, insuficiente o negativo.
 * No implementa facturación térmica (historia separada del equipo).
 *
 * IMPORTANTE: usar db.exec('BEGIN TRANSACTION') / COMMIT / ROLLBACK.
 * NO usar db.transaction() — es de better-sqlite3, no de node:sqlite nativo.
 */
export class SQLiteVentaRepository extends IVentaRepository {
  /** @param {import('node:sqlite').DatabaseSync} db */
  constructor(db) {
    super();
    this.db = db;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // guardar
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Persiste una venta completa de forma transaccional.
   * Reutiliza la lógica validada de VentaRepository (Camilo) adaptada
   * a los mappers y la interfaz de esta capa.
   *
   * @param {{ usuarioId: number }} venta
   * @param {Array<{ productoId: number, cantidad: number }>} detalles
   * @param {{ medioPago: string, montoRecibido?: number, montoEfectivo?: number, montoNequi?: number }} pago
   * @returns {Promise<{ id: number, total: number, medioPago: string, cambio: number, advertencias: Array }>}
   */
  async guardar(venta, detalles, pago) {
    const db = this.db;
    db.exec('BEGIN TRANSACTION');
    try {
      const buscarProducto = db.prepare(
        'SELECT id, nombre, stock_actual, precio_venta_unitario FROM products WHERE id = ? AND activo = 1'
      );

      const items = detalles.map(item => {
        const producto = buscarProducto.get(item.productoId);
        if (!producto) throw new Error(`Producto ${item.productoId} no encontrado o inactivo.`);
        return {
          ...item,
          nombre:          producto.nombre,
          stockAnterior:   producto.stock_actual,
          precioUnitario:  Number(producto.precio_venta_unitario),
          subtotal:        Number(producto.precio_venta_unitario) * item.cantidad,
        };
      });

      const total      = items.reduce((acc, p) => acc + p.subtotal, 0);
      const efectivo   = pago.medioPago === 'EFECTIVO' ? Number(pago.montoRecibido)
                       : pago.medioPago === 'MIXTO'    ? Number(pago.montoEfectivo) : 0;
      const nequi      = pago.medioPago === 'NEQUI'    ? total
                       : pago.medioPago === 'MIXTO'    ? Number(pago.montoNequi)    : 0;
      const cambio     = pago.medioPago === 'EFECTIVO' ? efectivo - total           : 0;

      if (
        !Number.isFinite(efectivo) || !Number.isFinite(nequi) ||
        efectivo < 0 || nequi < 0 || cambio < 0 ||
        (pago.medioPago === 'MIXTO' && Math.abs(efectivo + nequi - total) > 0.01)
      ) {
        throw new Error('El pago no cubre el total de la venta.');
      }

      const now = new Date().toISOString();

      const { lastInsertRowid } = db.prepare(`
        INSERT INTO sales (usuario_id, total, medio_pago, monto_efectivo, monto_nequi, cambio, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(venta.usuarioId, total, pago.medioPago, efectivo, nequi, cambio, now);

      const ventaId = Number(lastInsertRowid);

      const insertarItem       = db.prepare('INSERT INTO sale_items (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)');
      const actualizarStock    = db.prepare('UPDATE products SET stock_actual = ?, fecha_ultima_venta = ? WHERE id = ?');
      const insertarMovimiento = db.prepare(`
        INSERT INTO stock_movements (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id, created_at)
        VALUES (?, 'SALIDA_VENTA', ?, ?, ?, ?, ?, ?)
      `);

      const advertencias = [];

      for (const item of items) {
        const stockNuevo = item.stockAnterior - item.cantidad;
        insertarItem.run(ventaId, item.productoId, item.cantidad, item.precioUnitario, item.subtotal);
        actualizarStock.run(stockNuevo, now, item.productoId);
        insertarMovimiento.run(
          item.productoId, item.cantidad, item.stockAnterior,
          stockNuevo, `Venta #${ventaId}`, venta.usuarioId, now
        );
        if (item.stockAnterior < item.cantidad) {
          advertencias.push({
            productoId:      item.productoId,
            nombre:          item.nombre,
            stockAnterior:   item.stockAnterior,
            cantidadVendida: item.cantidad,
            stockNuevo,
            mensaje:         'Venta registrada con existencias insuficientes; revisar inventario.',
          });
        }
      }

      db.exec('COMMIT');
      return { id: ventaId, total, medioPago: pago.medioPago, cambio, advertencias };
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // buscarPorId
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Busca una venta por ID junto con sus ítems.
   * @param {number} id
   * @returns {Promise<import('../../dominio/Venta.js').Venta | null>}
   */
  async buscarPorId(id) {
    const fila = this.db
      .prepare('SELECT * FROM sales WHERE id = ?')
      .get(Number(id));

    if (!fila) return null;

    const items = this.db
      .prepare('SELECT * FROM sale_items WHERE venta_id = ?')
      .all(Number(id));

    return VentaMapper.aEntidad(fila, items);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // listarDelDia
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Lista las ventas de un día específico (sin ítems por rendimiento).
   * @param {string} fecha - Formato 'YYYY-MM-DD'.
   * @returns {Promise<Array<import('../../dominio/Venta.js').Venta>>}
   */
  async listarDelDia(fecha) {
    const filas = this.db
      .prepare("SELECT * FROM sales WHERE substr(created_at, 1, 10) = ? ORDER BY created_at DESC")
      .all(fecha);

    return filas.map(fila => VentaMapper.aEntidad(fila));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // buscarFacturaPorConsecutivo
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Busca una factura por su número consecutivo (ej. 'F-0001').
   * @param {string} consecutivo
   * @returns {Promise<import('../../dominio/Factura.js').Factura | null>}
   */
  async buscarFacturaPorConsecutivo(consecutivo) {
    const fila = this.db
      .prepare("SELECT * FROM facturas WHERE consecutivo = ?")
      .get(consecutivo);

    return fila ? FacturaMapper.aEntidad(fila) : null;
  }
}
