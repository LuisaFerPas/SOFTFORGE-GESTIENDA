/**
 * Servicio para consultar pagos del día (HU-0801).
 * Consulta ventas y abonos de apartados en la fecha actual (UTC-5 Colombia).
 */
export class PagosService {
  /**
   * @param {import('node:sqlite').DatabaseSync} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Fecha actual en America/Bogota con formato YYYY-MM-DD.
   * @returns {string}
   */
  static hoyBogota() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  }

  /**
   * Consulta todos los pagos registrados durante el día actual.
   * @param {string} [fechaBogota] Fecha en formato YYYY-MM-DD.
   * @returns {Promise<Array<{
   *   id: number,
   *   hora: string,
   *   fechaHora: string,
   *   monto: number,
   *   medioPago: string,
   *   tipo: 'VENTA' | 'APARTADO',
   *   referenciaId: number
   * }>>}
   */
  async consultarPagosDelDia(fechaBogota = PagosService.hoyBogota()) {
    const query = `
      SELECT 
        id,
        total AS monto,
        medio_pago AS medioPago,
        created_at AS fechaHora,
        time(created_at, '-5 hours') AS hora,
        'VENTA' AS tipo,
        id AS referenciaId
      FROM sales
      WHERE date(created_at, '-5 hours') = ?

      UNION ALL

      SELECT 
        id,
        monto,
        medio_pago AS medioPago,
        created_at AS fechaHora,
        time(created_at, '-5 hours') AS hora,
        'APARTADO' AS tipo,
        apartado_id AS referenciaId
      FROM apartado_abonos
      WHERE date(created_at, '-5 hours') = ?

      ORDER BY fechaHora DESC
    `;

    const filas = this.db.prepare(query).all(fechaBogota, fechaBogota);

    return filas.map(f => ({
      id: Number(f.id),
      hora: f.hora || '',
      fechaHora: f.fechaHora,
      monto: Number(f.monto),
      medioPago: f.medioPago,
      tipo: f.tipo,
      referenciaId: Number(f.referenciaId)
    }));
  }
}
