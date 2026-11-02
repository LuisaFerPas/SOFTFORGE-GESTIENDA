/**
 * Adaptador específico para las salidas de stock originadas por ventas.
 * SD-116: usa la MISMA DatabaseSync que SQLiteVentaRepository.
 * NO inicia BEGIN/COMMIT/ROLLBACK; el dueño es SQLiteVentaRepository.guardar().
 * Mantiene intacto el repositorio de productos utilizado por las entradas.
 */
export class SQLiteSalidaVentaStockRepository {
  constructor(db) {
    this.db = db;
  }

  registrarSalidaVenta(productoId, cantidad, ventaId, usuarioId = null) {
    if (!this.db.isTransaction) {
      throw new Error('La salida de stock debe registrarse dentro de la transacción de venta.');
    }

    const producto = this.db.prepare(`
      SELECT id, nombre, stock_actual
      FROM products WHERE id = ? AND activo = 1
    `).get(productoId);
    if (!producto) throw new Error(`Producto ${productoId} no encontrado o inactivo.`);

    // SD-117: stock NULL equivale a cero. Nunca bloquear por stock insuficiente.
    const stockAnterior = Number(producto.stock_actual ?? 0);
    if (!Number.isFinite(stockAnterior)) {
      throw new Error(`Stock inválido para el producto ${productoId}.`);
    }
    const stockNuevo = stockAnterior - cantidad;
    const ahora = new Date().toISOString();

    const actualizado = this.db.prepare(`
      UPDATE products SET stock_actual = ?, fecha_ultima_venta = ?
      WHERE id = ? AND activo = 1
    `).run(stockNuevo, ahora, productoId);
    if (Number(actualizado.changes) !== 1) {
      throw new Error(`No se pudo actualizar el stock del producto ${productoId}.`);
    }

    const info = this.db.prepare(`
      INSERT INTO stock_movements
        (producto_id, tipo, cantidad, stock_anterior, stock_nuevo,
         motivo, usuario_id, created_at)
      VALUES (?, 'SALIDA_VENTA', ?, ?, ?, ?, ?, ?)
    `).run(productoId, cantidad, stockAnterior, stockNuevo,
      `Venta #${ventaId}`, usuarioId, ahora);

    return {
      movimientoId: Number(info.lastInsertRowid),
      productoId, nombre: producto.nombre,
      stockAnterior, stockNuevo, cantidadVendida: cantidad
    };
  }
}
