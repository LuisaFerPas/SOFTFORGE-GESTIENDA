/**
 * Consulta de facturas emitidas. Solo lectura; no altera los consecutivos
 * ni la lógica de emisión/reimpresión existente (SD-119 a SD-124).
 */
export class SQLiteFacturaConsultaRepository {
  constructor(db) {
    this.db = db;
  }

  listar({ pagina = 1, limite = 10, busqueda = '', estado = '' } = {}) {
    const paginaN = Number(pagina);
    const limiteN = Number(limite);
    if (!Number.isSafeInteger(paginaN) || paginaN < 1 ||
        !Number.isSafeInteger(limiteN) || limiteN < 1 || limiteN > 50) {
      throw new Error('Los datos de paginación no son válidos.');
    }
    if (typeof busqueda !== 'string' || busqueda.length > 80 ||
        !['', 'EMITIDA', 'ANULADA'].includes(estado)) {
      throw new Error('Los filtros de facturación no son válidos.');
    }

    const filtro = busqueda.trim();
    const where = `WHERE (? = '' OR instr(upper(f.consecutivo), upper(?)) > 0
      OR instr(upper(f.nombre_cliente), upper(?)) > 0)
      AND (? = '' OR f.estado = ?)`;
    const parametros = [filtro, filtro, filtro, estado, estado];
    const total = this.db.prepare(`
      SELECT COUNT(*) AS cantidad FROM facturas f ${where}
    `).get(...parametros).cantidad;
    const offset = (paginaN - 1) * limiteN;
    const filas = this.db.prepare(`
      SELECT f.id, f.venta_id, f.consecutivo, f.nombre_cliente,
        f.fecha_emision, f.estado, s.total, s.medio_pago, s.created_at AS fecha_venta
      FROM facturas f
      JOIN sales s ON s.id = f.venta_id
      ${where}
      ORDER BY f.id DESC LIMIT ? OFFSET ?
    `).all(...parametros, limiteN, offset);
    return {
      facturas: filas.map(f => this.#mapearFactura(f)),
      paginacion: {
        pagina: paginaN, limite: limiteN, total,
        totalPaginas: Math.max(1, Math.ceil(total / limiteN))
      }
    };
  }

  obtenerPorConsecutivo(consecutivo) {
    if (typeof consecutivo !== 'string' || !/^F-[0-9]{4,}$/.test(consecutivo.trim().toUpperCase())) {
      throw new Error('El consecutivo debe tener el formato F-0001.');
    }
    const numero = consecutivo.trim().toUpperCase();
    const fila = this.db.prepare(`
      SELECT f.id, f.venta_id, f.consecutivo, f.nombre_cliente,
        f.fecha_emision, f.estado, s.total, s.medio_pago,
        s.monto_efectivo, s.monto_nequi, s.monto_otro, s.cambio,
        s.created_at AS fecha_venta
      FROM facturas f
      JOIN sales s ON s.id = f.venta_id
      WHERE f.consecutivo = ?
    `).get(numero);
    if (!fila) return null;

    const items = this.db.prepare(`
      SELECT si.producto_id AS productoId, COALESCE(p.nombre, 'Producto #' || si.producto_id) AS nombre,
        si.cantidad, si.precio_unitario AS precioUnitario, si.subtotal
      FROM sale_items si
      LEFT JOIN products p ON p.id = si.producto_id
      WHERE si.venta_id = ? ORDER BY si.id
    `).all(fila.venta_id);
    return {
      ...this.#mapearFactura(fila),
      pago: {
        medioPago: fila.medio_pago,
        montoEfectivo: Number(fila.monto_efectivo ?? 0),
        montoNequi: Number(fila.monto_nequi ?? 0),
        montoOtro: Number(fila.monto_otro ?? 0),
        cambio: Number(fila.cambio ?? 0)
      },
      items: items.map(item => ({ ...item,
        cantidad: Number(item.cantidad),
        precioUnitario: Number(item.precioUnitario),
        subtotal: Number(item.subtotal) }))
    };
  }

  #mapearFactura(f) {
    return {
      id: Number(f.id), ventaId: Number(f.venta_id),
      consecutivo: f.consecutivo, nombreCliente: f.nombre_cliente,
      fechaEmision: f.fecha_emision, fechaVenta: f.fecha_venta,
      estado: f.estado, total: Number(f.total), medioPago: f.medio_pago
    };
  }
}
