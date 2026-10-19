/** Adaptador de persistencia SQLite transaccional para ventas básicas.
 * SD-70 / RV-15: se permite vender con stock cero, insuficiente o negativo.
 * No implementa facturación térmica (historia separada del equipo).
 */
export class VentaRepository {
  constructor(db) { this.db = db; }

  async guardarVenta(venta, detalleItems, pago) {
    const db = this.db;
    db.exec('BEGIN TRANSACTION');
    try {
      const buscar = db.prepare('SELECT id, nombre, stock_actual, precio_venta_unitario FROM products WHERE id = ? AND activo = 1');
      const items = detalleItems.map(item => {
        const producto = buscar.get(item.productoId);
        if (!producto) throw new Error(`Producto ${item.productoId} no encontrado o inactivo.`);
        return { ...item, nombre: producto.nombre, stockAnterior: producto.stock_actual,
          precioUnitario: Number(producto.precio_venta_unitario),
          subtotal: Number(producto.precio_venta_unitario) * item.cantidad };
      });
      const total = items.reduce((acc, p) => acc + p.subtotal, 0);
      const efectivo = pago.medioPago === 'EFECTIVO' ? Number(pago.montoRecibido) : pago.medioPago === 'MIXTO' ? Number(pago.montoEfectivo) : 0;
      const nequi = pago.medioPago === 'NEQUI' ? total : pago.medioPago === 'MIXTO' ? Number(pago.montoNequi) : 0;
      const cambio = pago.medioPago === 'EFECTIVO' ? efectivo - total : 0;
      if (!Number.isFinite(efectivo) || !Number.isFinite(nequi) || efectivo < 0 || nequi < 0 || cambio < 0 ||
        (pago.medioPago === 'MIXTO' && Math.abs(efectivo + nequi - total) > 0.01)) {
        throw new Error('El pago no cubre el total de la venta.');
      }
      const now = new Date().toISOString();
      const info = db.prepare(`INSERT INTO sales
        (usuario_id,total,medio_pago,monto_efectivo,monto_nequi,cambio,created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(venta.usuarioId, total, pago.medioPago, efectivo, nequi, cambio, now);
      const ventaId = Number(info.lastInsertRowid);
      const insertarItem = db.prepare(`INSERT INTO sale_items (venta_id,producto_id,cantidad,precio_unitario,subtotal) VALUES (?,?,?,?,?)`);
      const stockUpdate = db.prepare('UPDATE products SET stock_actual = ?, fecha_ultima_venta = ? WHERE id = ?');
      const insertarMovimiento = db.prepare(`INSERT INTO stock_movements
        (producto_id,tipo,cantidad,stock_anterior,stock_nuevo,motivo,usuario_id,created_at)
        VALUES (?, 'SALIDA_VENTA', ?, ?, ?, ?, ?, ?)`);
      const advertencias = [];
      for (const item of items) {
        // Las cantidades ya se agruparon por producto en el servicio.
        const stockNuevo = item.stockAnterior - item.cantidad;
        insertarItem.run(ventaId, item.productoId, item.cantidad, item.precioUnitario, item.subtotal);
        stockUpdate.run(stockNuevo, now, item.productoId);
        insertarMovimiento.run(item.productoId, item.cantidad, item.stockAnterior,
          stockNuevo, `Venta #${ventaId}`, venta.usuarioId, now);
        if (item.stockAnterior < item.cantidad) advertencias.push({
          productoId: item.productoId,
          nombre: item.nombre,
          stockAnterior: item.stockAnterior,
          cantidadVendida: item.cantidad,
          stockNuevo,
          mensaje: 'Venta registrada con existencias insuficientes; revisar inventario.'
        });
      }
      db.exec('COMMIT');
      return { id: ventaId, total, medioPago: pago.medioPago, cambio, advertencias };
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  async buscarPorId(id) {
    return this.db.prepare('SELECT * FROM sales WHERE id = ?').get(Number(id)) || null;
  }
  async buscarPorNumeroFactura() {
    // El consecutivo y la facturación térmica están fuera de SD-70.
    throw new Error('Facturación pendiente de la HU correspondiente.');
  }
  async listarVentasDelDia(fecha) {
    return this.db.prepare('SELECT * FROM sales WHERE substr(created_at,1,10) = ? ORDER BY created_at DESC')
      .all(fecha);
  }
  async obtenerSiguienteConsecutivo() {
    throw new Error('Facturación pendiente de la HU correspondiente.');
  }
}
