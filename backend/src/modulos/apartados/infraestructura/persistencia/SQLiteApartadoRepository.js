import { IApartadoRepository } from '../../dominio/puertos/IApartadoRepository.js';
import { ApartadoMapper } from '../mappers/ApartadoMapper.js';
import { EstadoApartado } from '../../dominio/Apartado.js';

/**
 * Adaptador de persistencia SQLite (node:sqlite nativo) para Apartados.
 * HU-0700.4 — Con transacciones atómicas completas.
 */
export class SQLiteApartadoRepository extends IApartadoRepository {
  /**
   * @param {import('node:sqlite').DatabaseSync} db
   */
  constructor(db) {
    super();
    this.db = db;
  }

  /**
   * Genera el siguiente consecutivo de apartado: 'AP-0001', 'AP-0002', etc.
   * @private
   */
  _generarSiguienteCodigo() {
    const row = this.db.prepare(`
      SELECT codigo FROM apartados
      ORDER BY id DESC LIMIT 1
    `).get();

    if (!row || !row.codigo) {
      return 'AP-0001';
    }

    const matches = row.codigo.match(/^AP-(\d+)$/);
    if (!matches) {
      return `AP-${Date.now().toString().slice(-4)}`;
    }

    const num = parseInt(matches[1], 10) + 1;
    return `AP-${num.toString().padStart(4, '0')}`;
  }

  /**
   * Guarda un nuevo apartado de forma transaccional.
   * Inserta en `apartados`, `apartado_productos` y el primer registro en `apartado_abonos`.
   * @param {import('../../dominio/Apartado.js').Apartado} apartado
   * @returns {Promise<number>} ID asignado al nuevo apartado.
   */
  async guardar(apartado) {
    const db = this.db;
    db.exec('BEGIN TRANSACTION');

    try {
      const codigoFinal = apartado.codigo || this._generarSiguienteCodigo();
      const now = apartado.fechaCreacion || new Date().toISOString();

      const stmtApartado = db.prepare(`
        INSERT INTO apartados (
          codigo, cliente_nombre, cliente_telefono, usuario_id,
          total_productos, abono_inicial, saldo_pendiente,
          fecha_creacion, fecha_limite, estado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const resApartado = stmtApartado.run(
        codigoFinal,
        apartado.clienteNombre,
        apartado.clienteTelefono || null,
        apartado.usuarioId,
        apartado.totalProductos,
        apartado.abonoInicial,
        apartado.saldoPendiente,
        now,
        apartado.fechaLimite || null,
        apartado.estado || EstadoApartado.ACTIVO
      );

      const apartadoId = Number(resApartado.lastInsertRowid);

      // Inserción de productos asociados
      if (apartado.productos && apartado.productos.length > 0) {
        const stmtProducto = db.prepare(`
          INSERT INTO apartado_productos (
            apartado_id, producto_id, cantidad, precio_unitario, subtotal
          ) VALUES (?, ?, ?, ?, ?)
        `);

        for (const prod of apartado.productos) {
          stmtProducto.run(
            apartadoId,
            prod.productoId,
            prod.cantidad,
            prod.precioUnitario,
            prod.subtotal
          );
        }
      }

      // Inserción del abono inicial en la tabla de abonos
      const stmtAbono = db.prepare(`
        INSERT INTO apartado_abonos (
          apartado_id, usuario_id, monto, medio_pago, saldo_restante, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmtAbono.run(
        apartadoId,
        apartado.usuarioId,
        apartado.abonoInicial,
        'EFECTIVO',
        apartado.saldoPendiente,
        now
      );

      db.exec('COMMIT');
      return apartadoId;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * Busca un apartado por su ID con sus productos y abonos.
   * @param {number} id
   * @returns {Promise<import('../../dominio/Apartado.js').Apartado | null>}
   */
  async buscarPorId(id) {
    const fila = this.db.prepare('SELECT * FROM apartados WHERE id = ?').get(Number(id));
    if (!fila) return null;

    const productos = this.db.prepare(`
      SELECT ap.*, p.nombre
      FROM apartado_productos ap
      LEFT JOIN products p ON ap.producto_id = p.id
      WHERE ap.apartado_id = ?
    `).all(Number(id));

    const abonos = this.db.prepare(`
      SELECT * FROM apartado_abonos
      WHERE apartado_id = ?
      ORDER BY id ASC
    `).all(Number(id));

    // Excluimos el primer abono de abonosAdicionales ya que representa el abono_inicial
    const abonosAdicionales = abonos.slice(1);

    return ApartadoMapper.aEntidad(fila, productos, abonosAdicionales);
  }

  /**
   * Busca un apartado por su código consecutivo.
   * @param {string} codigo
   * @returns {Promise<import('../../dominio/Apartado.js').Apartado | null>}
   */
  async buscarPorCodigo(codigo) {
    const fila = this.db.prepare('SELECT * FROM apartados WHERE codigo = ?').get(codigo);
    if (!fila) return null;
    return this.buscarPorId(fila.id);
  }

  /**
   * Lista todos los apartados con estado ACTIVO.
   * @returns {Promise<Array<import('../../dominio/Apartado.js').Apartado>>}
   */
  async listarActivos() {
    const filas = this.db.prepare(`
      SELECT * FROM apartados
      WHERE estado = 'ACTIVO'
      ORDER BY fecha_creacion DESC
    `).all();

    const resultados = [];
    for (const f of filas) {
      const ap = await this.buscarPorId(f.id);
      if (ap) resultados.push(ap);
    }
    return resultados;
  }

  /**
   * Lista todos los apartados registrados.
   * @returns {Promise<Array<import('../../dominio/Apartado.js').Apartado>>}
   */
  async listarTodos() {
    const filas = this.db.prepare(`
      SELECT * FROM apartados
      ORDER BY fecha_creacion DESC
    `).all();

    const resultados = [];
    for (const f of filas) {
      const ap = await this.buscarPorId(f.id);
      if (ap) resultados.push(ap);
    }
    return resultados;
  }

  /**
   * Actualiza los datos de un apartado existente.
   * @param {import('../../dominio/Apartado.js').Apartado} apartado
   */
  async actualizar(apartado) {
    this.db.prepare(`
      UPDATE apartados
      SET cliente_nombre = ?, cliente_telefono = ?, saldo_pendiente = ?, estado = ?, fecha_limite = ?
      WHERE id = ?
    `).run(
      apartado.clienteNombre,
      apartado.clienteTelefono || null,
      apartado.saldoPendiente,
      apartado.estado,
      apartado.fechaLimite || null,
      Number(apartado.id)
    );
  }

  /**
   * Registra un abono adicional y actualiza el saldo del apartado de forma atómica.
   * @param {number} apartadoId
   * @param {{ usuarioId: number, monto: number, medioPago?: string, saldoRestante: number }} datosAbono
   * @returns {Promise<number>} ID del abono insertado.
   */
  async registrarAbono(apartadoId, datosAbono) {
    const db = this.db;
    db.exec('BEGIN TRANSACTION');

    try {
      const now = new Date().toISOString();
      const resAbono = db.prepare(`
        INSERT INTO apartado_abonos (
          apartado_id, usuario_id, monto, medio_pago, saldo_restante, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        Number(apartadoId),
        Number(datosAbono.usuarioId),
        Number(datosAbono.monto),
        datosAbono.medioPago || 'EFECTIVO',
        Number(datosAbono.saldoRestante),
        now
      );

      const nuevoEstado = Number(datosAbono.saldoRestante) <= 0
        ? EstadoApartado.COMPLETADO
        : EstadoApartado.ACTIVO;

      db.prepare(`
        UPDATE apartados
        SET saldo_pendiente = ?, estado = ?
        WHERE id = ?
      `).run(
        Number(datosAbono.saldoRestante),
        nuevoEstado,
        Number(apartadoId)
      );

      db.exec('COMMIT');
      return Number(resAbono.lastInsertRowid);
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * Actualiza únicamente el estado de un apartado.
   * @param {number} id
   * @param {string} nuevoEstado
   */
  async actualizarEstado(id, nuevoEstado) {
    this.db.prepare(`
      UPDATE apartados
      SET estado = ?
      WHERE id = ?
    `).run(nuevoEstado, Number(id));
  }

  /**
   * HU-0703.2: Cancela un apartado activo y devuelve el stock de cada producto
   * al inventario en una única transacción atómica.
   * @param {number} id - ID del apartado a cancelar.
   * @returns {{ cancelado: boolean, productosDevueltos: number[] }}
   */
  cancelarConDevolucionStock(id) {
    const db = this.db;
    const idNum = Number(id);

    // 1. Verificar que el apartado existe y está ACTIVO
    const fila = db.prepare('SELECT id, estado FROM apartados WHERE id = ?').get(idNum);
    if (!fila) {
      const err = new Error('Apartado no encontrado.');
      err.status = 404;
      throw err;
    }
    if (fila.estado !== 'ACTIVO') {
      const err = new Error(`Solo se puede cancelar un apartado ACTIVO. Estado actual: ${fila.estado}.`);
      err.status = 409;
      throw err;
    }

    // 2. Leer los productos reservados
    const productos = db.prepare(`
      SELECT producto_id, cantidad
      FROM apartado_productos
      WHERE apartado_id = ?
    `).all(idNum);

    // 3. Transacción atómica: cambiar estado + devolver stock
    db.exec('BEGIN TRANSACTION');
    try {
      // Cancelar el apartado
      db.prepare(`
        UPDATE apartados SET estado = 'CANCELADO' WHERE id = ?
      `).run(idNum);

      // Devolver stock y registrar movimiento en inventario
      const stmtStockActual = db.prepare('SELECT stock_actual FROM products WHERE id = ?');
      const stmtStock = db.prepare(
        'UPDATE products SET stock_actual = stock_actual + ? WHERE id = ?'
      );
      const stmtMovimiento = db.prepare(`
        INSERT INTO stock_movements
          (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, created_at)
        VALUES (?, 'ENTRADA', ?, ?, ?, 'Devolucion por cancelacion de apartado', ?)
      `);

      const ahora = new Date().toISOString();
      for (const prod of productos) {
        const pId = Number(prod.producto_id);
        const cant = Number(prod.cantidad);
        const filaStock = stmtStockActual.get(pId);
        const stockAnterior = filaStock ? Number(filaStock.stock_actual) : 0;
        stmtStock.run(cant, pId);
        stmtMovimiento.run(pId, cant, stockAnterior, stockAnterior + cant, ahora);
      }

      db.exec('COMMIT');
      return { cancelado: true, productosDevueltos: productos.map(p => p.producto_id) };
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
}
