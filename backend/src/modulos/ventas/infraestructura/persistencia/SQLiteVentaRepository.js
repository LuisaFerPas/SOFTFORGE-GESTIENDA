import { IVentaRepository } from '../../dominio/puertos/IVentaRepository.js';
import { VentaMapper } from '../mappers/VentaMapper.js';
import { FacturaMapper } from '../mappers/FacturaMapper.js';
import { StockService } from '../../../inventario/aplicacion/StockService.js';
import { SQLiteSalidaVentaStockRepository } from './SQLiteSalidaVentaStockRepository.js';

/** Persistencia atómica; SD-70 permite stock negativo (con advertencia). */
export class SQLiteVentaRepository extends IVentaRepository {
  constructor(db, stockService = null) {
    super();
    this.db = db;
    // Instancia alternativa para integraciones que usan directamente el repositorio.
    this.stockService = stockService ?? new StockService(new SQLiteSalidaVentaStockRepository(db));
  }

  async obtenerProductosParaVenta(ids) {
    const buscar = this.db.prepare(`
      SELECT id, codigo_interno, nombre, precio_venta_unitario
      FROM products WHERE id = ? AND activo = 1
    `);
    return ids.map((id) => buscar.get(id)).filter(Boolean).map((p) => ({
      id: p.id,
      codigoInterno: p.codigo_interno,
      nombre: p.nombre,
      precioVentaUnitario: p.precio_venta_unitario
    }));
  }

  async guardar(venta, detalles, pago, registrarSalida = null) {
    const db = this.db;
    db.exec('BEGIN TRANSACTION');
    try {
      const buscar = db.prepare(`
        SELECT id, nombre, stock_actual, precio_venta_unitario
        FROM products WHERE id = ? AND activo = 1
      `);
      const items = detalles.map((item) => {
        const p = buscar.get(item.productoId);
        if (!p) throw new Error(`Producto ${item.productoId} no encontrado o inactivo.`);
        const precio = Number(p.precio_venta_unitario);
        if (!Number.isFinite(precio) || precio <= 0) {
          throw new Error(`El producto ${item.productoId} no tiene un precio válido.`);
        }
        if (Math.abs(Number(item.precioUnitario) - precio) > 0.001) {
          throw new Error('El precio del producto cambió. Actualiza el catálogo y revisa la venta.');
        }
        return {
          ...item,
          nombre: p.nombre,
          stockAnterior: Number(p.stock_actual),
          precioUnitario: precio,
          subtotal: precio * item.cantidad
        };
      });

      const total = items.reduce((acc, item) => acc + item.subtotal, 0);
      if (!Number.isFinite(total) || total <= 0 ||
          Math.abs(Number(venta.total) - total) > 0.01) {
        throw new Error('El total de la venta no es válido.');
      }

      const recibido = Number(pago.montoRecibido);
      const efectivo = pago.medioPago === 'EFECTIVO' ? recibido :
        pago.medioPago === 'MIXTO' ? Number(pago.montoEfectivo) : 0;
      const nequi = pago.medioPago === 'NEQUI' ? total :
        pago.medioPago === 'MIXTO' ? Number(pago.montoNequi) : 0;
      const otro = pago.medioPago === 'OTRO' ? total : 0;
      const cambio = pago.medioPago === 'EFECTIVO' ? efectivo - total : 0;
      if (!['EFECTIVO', 'NEQUI', 'OTRO', 'MIXTO'].includes(pago.medioPago) ||
          !Number.isFinite(efectivo) || !Number.isFinite(nequi) ||
          efectivo < 0 || nequi < 0 || cambio < 0 ||
          (pago.medioPago === 'MIXTO' && (
            efectivo <= 0 || nequi <= 0 || Math.abs(efectivo + nequi - total) > 0.01))) {
        throw new Error('El pago no cubre el total de la venta.');
      }

      // OTRO se guarda en su propia columna para no contabilizarlo como Nequi.
      const now = new Date().toISOString();
      let info;
      if (pago.medioPago === 'OTRO') {
        info = db.prepare(`
          INSERT INTO sales
          (usuario_id,total,medio_pago,monto_efectivo,monto_nequi,monto_otro,cambio,created_at)
          VALUES (?,?,?,?,?,?,?,?)
        `).run(venta.usuarioId, total, pago.medioPago, efectivo, nequi, otro, cambio, now);
      } else {
        info = db.prepare(`
          INSERT INTO sales
          (usuario_id,total,medio_pago,monto_efectivo,monto_nequi,cambio,created_at)
          VALUES (?,?,?,?,?,?,?)
        `).run(venta.usuarioId, total, pago.medioPago, efectivo, nequi, cambio, now);
      }
      const ventaId = Number(info.lastInsertRowid);
      const insertarDetalle = db.prepare(`
        INSERT INTO sale_items (venta_id,producto_id,cantidad,precio_unitario,subtotal)
        VALUES (?,?,?,?,?)
      `);
      // SD-116: la persistencia de stock se delega, nunca se duplica aquí.
      // La función es síncrona para no intercalar solicitudes dentro de la
      // transacción nativa de DatabaseSync.
      const salidaPorVenta = registrarSalida ?? ((productoId, cantidad, idVenta) =>
        this.stockService.registrarSalida(productoId, cantidad, idVenta, venta.usuarioId));

      const advertencias = [];
      for (const item of items) {
        insertarDetalle.run(ventaId, item.productoId, item.cantidad, item.precioUnitario, item.subtotal);
        const resultado = salidaPorVenta(item.productoId, item.cantidad, ventaId);
        if (resultado && typeof resultado.then === 'function') {
          throw new Error('registrarSalida debe ser síncrono dentro de la transacción SQLite.');
        }
        if (!resultado || resultado.isFailure) {
          throw new Error(resultado?.error || `Falló la salida del producto ${item.productoId}.`);
        }
        const salida = typeof resultado.getValue === 'function'
          ? resultado.getValue() : resultado;
        if (!salida || !Number.isFinite(salida.stockAnterior) ||
            !Number.isFinite(salida.stockNuevo)) {
          throw new Error(`Salida de stock inválida para el producto ${item.productoId}.`);
        }
        if (salida.stockAnterior < item.cantidad) {
          advertencias.push({
            productoId: item.productoId, nombre: item.nombre,
            stockAnterior: salida.stockAnterior, cantidadVendida: item.cantidad,
            stockNuevo: salida.stockNuevo,
            mensaje: 'Venta registrada con existencias insuficientes; revisar inventario.'
          });
        }
      }
      db.exec('COMMIT');
      // SD-117: advertencia en el servidor solo tras confirmar la transacción.
      for (const aviso of advertencias) {
        console.warn(`[Inventario] Venta #${ventaId}: stock insuficiente para producto ${aviso.productoId}; stock final ${aviso.stockNuevo}.`);
      }
      return { id: ventaId, total, medioPago: pago.medioPago, cambio, advertencias };
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  async buscarPorId(id) {
    const fila = this.db.prepare('SELECT * FROM sales WHERE id = ?').get(Number(id));
    if (!fila) return null;
    const items = this.db.prepare('SELECT * FROM sale_items WHERE venta_id = ?').all(Number(id));
    return VentaMapper.aEntidad(fila, items);
  }

  async listarDelDia(fecha) {
    return this.db.prepare(`
      SELECT * FROM sales WHERE substr(created_at, 1, 10) = ? ORDER BY created_at DESC
    `).all(fecha).map((fila) => VentaMapper.aEntidad(fila));
  }

  /**
   * SD-119: crea la factura y asigna un consecutivo F-XXXX de forma atómica.
   * BEGIN IMMEDIATE impide que dos emisiones reserven el mismo número.
   * No se imprime ningún documento en este paso.
   */
  async guardarFactura(factura) {
    const db = this.db;
    db.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
      const venta = db.prepare('SELECT id FROM sales WHERE id = ?').get(factura.ventaId);
      if (!venta) throw new Error('La venta indicada no existe.');

      const yaExiste = db.prepare('SELECT id FROM facturas WHERE venta_id = ?')
        .get(factura.ventaId);
      if (yaExiste) throw new Error('La venta ya tiene una factura registrada.');

      // Se toma el mayor consecutivo numérico, no el ID de la venta ni
      // un conteo de facturas, para evitar colisiones ante ventas sin factura.
      const { ultimo } = db.prepare(`
        SELECT COALESCE(MAX(CAST(SUBSTR(consecutivo, 3) AS INTEGER)), 0) AS ultimo
        FROM facturas
        WHERE consecutivo GLOB 'F-[0-9]*'
      `).get();
      const siguiente = Number(ultimo) + 1;
      if (!Number.isSafeInteger(siguiente)) {
        throw new Error('Se agotó el rango de consecutivos de factura.');
      }
      factura.consecutivo = `F-${String(siguiente).padStart(4, '0')}`;
      const fila = FacturaMapper.aFilaDB(factura);
      const { lastInsertRowid } = db.prepare(`
        INSERT INTO facturas
          (venta_id, consecutivo, nombre_cliente, fecha_emision, estado)
        VALUES (?, ?, ?, ?, ?)
      `).run(fila.venta_id, fila.consecutivo, fila.nombre_cliente,
        fila.fecha_emision, fila.estado);
      const guardada = db.prepare('SELECT * FROM facturas WHERE id = ?')
        .get(Number(lastInsertRowid));
      db.exec('COMMIT');
      return FacturaMapper.aEntidad(guardada);
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  async buscarFacturaPorConsecutivo(consecutivo) {
    const fila = this.db.prepare('SELECT * FROM facturas WHERE consecutivo = ?').get(consecutivo);
    return fila ? FacturaMapper.aEntidad(fila) : null;
  }
}
