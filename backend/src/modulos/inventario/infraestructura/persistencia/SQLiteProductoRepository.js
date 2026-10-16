import { IProductoRepository } from '../../dominio/IProductoRepository.js';
import { ProductoMapper } from './mappers/ProductoMapper.js';
import { MovimientoStockMapper } from './mappers/MovimientoStockMapper.js';
import { TipoMovimientoStock } from '../../dominio/MovimientoStock.js';

/**
 * Implementación de persistencia para el módulo de Inventario y Productos usando SQLite nativo (`node:sqlite`).
 * Cumple con el contrato `IProductoRepository` y utiliza Data Mappers para mantener el Dominio desacoplado.
 */
export class SQLiteProductoRepository extends IProductoRepository {
  constructor(db) {
    super();
    this.db = db;
  }

  async buscarPorId(id) {
    const fila = this.db.prepare('SELECT * FROM products WHERE id = ?').get(Number(id));
    return ProductoMapper.aDominio(fila);
  }

  async buscarPorCodigoInterno(codigoInterno) {
    const fila = this.db
      .prepare('SELECT * FROM products WHERE codigo_interno = ? COLLATE NOCASE')
      .get(String(codigoInterno).trim());
    return ProductoMapper.aDominio(fila);
  }

  async buscarPorCodigoBarras(codigoBarras) {
    if (!codigoBarras) return null;
    const fila = this.db
      .prepare('SELECT * FROM products WHERE codigo_barras = ? COLLATE NOCASE')
      .get(String(codigoBarras).trim());
    return ProductoMapper.aDominio(fila);
  }

  async buscarPorCodigo(codigo) {
    if (!codigo) return null;
    const limpio = String(codigo).trim();
    const fila = this.db
      .prepare(`
        SELECT * FROM products 
        WHERE (codigo_interno = ? COLLATE NOCASE OR codigo_barras = ? COLLATE NOCASE)
        LIMIT 1
      `)
      .get(limpio, limpio);
    return ProductoMapper.aDominio(fila);
  }

   async listarTodos(filtros = {}) {
     const condiciones = [];
     const parametros = [];
     let orden = 'nombre ASC';
     let parametrosOrden = [];

     if (filtros.categoria) {
       condiciones.push('categoria = ? COLLATE NOCASE');
       parametros.push(filtros.categoria.trim());
     }

     if (filtros.search && filtros.search.trim()) {
       const { construirBusqueda } = await import('./consultas/busquedaProductosSql.js');
       const b = construirBusqueda(filtros.search);
       condiciones.push(b.condicion);
       parametros.push(...b.parametros);
       orden = b.orden;
       parametrosOrden = b.parametrosOrden;
     }

     if (filtros.estadoStock === 'bajo') {
       condiciones.push('stock_actual > 0 AND stock_actual <= stock_minimo_alerta');
     } else if (filtros.estadoStock === 'agotado') {
       condiciones.push('stock_actual <= 0');
     } else if (filtros.estadoStock === 'con_stock') {
       condiciones.push('stock_actual > 0');
     }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const filas = this.db
      .prepare(`SELECT * FROM products ${where} ORDER BY ${orden}`)
      .all(...parametros, ...parametrosOrden);

    return filas.map((fila) => ProductoMapper.aDominio(fila));
  }

  async guardar(producto) {
    const datos = ProductoMapper.aPersistencia(producto);
    const info = this.db
      .prepare(`
        INSERT INTO products (
          codigo_interno, codigo_barras, nombre, categoria, subcategoria, marca,
          costo_compra, precio_venta_unitario, precio_venta_mayor, iva_porcentaje,
          stock_actual, stock_minimo_alerta, fecha_ultima_compra, fecha_ultima_venta, activo
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        datos.codigo_interno,
        datos.codigo_barras,
        datos.nombre,
        datos.categoria,
        datos.subcategoria,
        datos.marca,
        datos.costo_compra,
        datos.precio_venta_unitario,
        datos.precio_venta_mayor,
        datos.iva_porcentaje,
        datos.stock_actual,
        datos.stock_minimo_alerta,
        datos.fecha_ultima_compra,
        datos.fecha_ultima_venta,
        datos.activo
      );

    return Number(info.lastInsertRowid);
  }

  async actualizar(producto) {
    const datos = ProductoMapper.aPersistencia(producto);
    const info = this.db
      .prepare(`
        UPDATE products
        SET nombre = ?, categoria = ?, subcategoria = ?, marca = ?,
            costo_compra = ?, precio_venta_unitario = ?, precio_venta_mayor = ?,
            iva_porcentaje = ?, stock_minimo_alerta = ?, activo = ?
        WHERE id = ?
      `)
      .run(
        datos.nombre,
        datos.categoria,
        datos.subcategoria,
        datos.marca,
        datos.costo_compra,
        datos.precio_venta_unitario,
        datos.precio_venta_mayor,
        datos.iva_porcentaje,
        datos.stock_minimo_alerta,
        datos.activo,
        datos.id
      );

    return Number(info.changes);
  }

  async desactivar(id) {
    const info = this.db
      .prepare('UPDATE products SET activo = 0 WHERE id = ?')
      .run(Number(id));
    return Number(info.changes);
  }

  /**
   * Registra un movimiento de stock de forma atómica con transacciones nativas SQLite.
   */
  async registrarMovimientoEnTransaccion({
    productoId,
    tipo,
    cantidad,
    costoUnitario = 0,
    motivo = null,
    usuarioId = null
  }) {
    const id = Number(productoId);
    const cant = Number(cantidad);

    const filaActual = this.db.prepare('SELECT stock_actual, costo_compra FROM products WHERE id = ?').get(id);
    if (!filaActual) {
      throw new Error(`Producto con ID ${id} no encontrado.`);
    }

    const stockAnterior = Number(filaActual.stock_actual) || 0;
    let stockNuevo = stockAnterior;

    if (tipo === TipoMovimientoStock.ENTRADA || tipo === TipoMovimientoStock.AJUSTE_POSITIVO) {
      stockNuevo = stockAnterior + cant;
    } else if (
      tipo === TipoMovimientoStock.SALIDA_VENTA ||
      tipo === TipoMovimientoStock.AJUSTE_NEGATIVO ||
      tipo === TipoMovimientoStock.MERMA
    ) {
      stockNuevo = Math.max(0, stockAnterior - cant);
    }

    const ahora = new Date().toISOString();

    this.db.exec('BEGIN TRANSACTION;');
    try {
      if (tipo === TipoMovimientoStock.ENTRADA) {
        this.db.prepare(`
          UPDATE products
          SET stock_actual = ?, costo_compra = CASE WHEN ? > 0 THEN ? ELSE costo_compra END, fecha_ultima_compra = ?
          WHERE id = ?
        `).run(stockNuevo, costoUnitario, costoUnitario, ahora, id);
      } else {
        this.db.prepare(`
          UPDATE products
          SET stock_actual = ?
          WHERE id = ?
        `).run(stockNuevo, id);
      }

      const resMov = this.db.prepare(`
        INSERT INTO stock_movements (
          producto_id, tipo, cantidad, stock_anterior, stock_nuevo, costo_unitario, motivo, usuario_id, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, tipo, cant, stockAnterior, stockNuevo, costoUnitario, motivo, usuarioId, ahora);

      this.db.exec('COMMIT;');
      return {
        movimientoId: Number(resMov.lastInsertRowid),
        productoId: id,
        stockAnterior,
        stockNuevo
      };
    } catch (error) {
      this.db.exec('ROLLBACK;');
      throw error;
    }
  }

  async listarMovimientos({ productoId = null, limite = 50 } = {}) {
    let query = `
      SELECT m.*, p.nombre as producto_nombre, p.codigo_interno, u.username as usuario_nombre
      FROM stock_movements m
      JOIN products p ON m.producto_id = p.id
      LEFT JOIN users u ON m.usuario_id = u.id
    `;
    const params = [];

    if (productoId) {
      query += ' WHERE m.producto_id = ?';
      params.push(Number(productoId));
    }

    query += ' ORDER BY m.created_at DESC LIMIT ?';
    params.push(Number(limite));

    const filas = this.db.prepare(query).all(...params);
    return filas;
  }
}
