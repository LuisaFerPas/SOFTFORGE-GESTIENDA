/**
 * Servicio de totales de caja del día (HU-0802).
 * Suma ventas y abonos de apartados por medio de pago, usando el día
 * calendario de Colombia (UTC-5) para no cortar el día a las 7 p. m.
 */
export class TotalesCajaService {
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
   * Redondea a dos decimales para evitar ruido de punto flotante.
   * @private
   */
  static _redondear(valor) {
    return Math.round((Number(valor) + Number.EPSILON) * 100) / 100;
  }

  /**
   * Totales del día agrupados por medio de pago.
   * @param {string} [fechaBogota] Día calendario en Colombia (YYYY-MM-DD).
   * @returns {Promise<{
   *   fecha: string,
   *   totalDia: number,
   *   totalEfectivo: number,
   *   totalNequi: number,
   *   totalOtro: number,
   *   desglose: {
   *     ventas: { efectivo: number, nequi: number, otro: number },
   *     apartados: { efectivo: number, nequi: number, otro: number }
   *   }
   * }>}
   */
  async totalesDelDia(fechaBogota = TotalesCajaService.hoyBogota()) {
    const ventas = this.db.prepare(`
      SELECT
        COALESCE(SUM(monto_efectivo - cambio), 0) AS efectivo,
        COALESCE(SUM(monto_nequi), 0) AS nequi,
        COALESCE(SUM(monto_otro), 0) AS otro
      FROM sales
      WHERE date(created_at, '-5 hours') = ?
    `).get(fechaBogota);

    const abonos = this.db.prepare(`
      SELECT medio_pago, COALESCE(SUM(monto), 0) AS total
      FROM apartado_abonos
      WHERE date(created_at, '-5 hours') = ?
      GROUP BY medio_pago
    `).all(fechaBogota);

    const ventasPorMedio = {
      efectivo: Number(ventas.efectivo) || 0,
      nequi: Number(ventas.nequi) || 0,
      otro: Number(ventas.otro) || 0
    };

    const abonosPorMedio = { efectivo: 0, nequi: 0, otro: 0 };
    for (const abono of abonos) {
      const total = Number(abono.total) || 0;
      if (abono.medio_pago === 'EFECTIVO') {
        abonosPorMedio.efectivo += total;
      } else if (abono.medio_pago === 'NEQUI') {
        abonosPorMedio.nequi += total;
      } else {
        // Cualquier medio desconocido se contabiliza como OTRO.
        abonosPorMedio.otro += total;
      }
    }

    const totalEfectivo = TotalesCajaService._redondear(
      ventasPorMedio.efectivo + abonosPorMedio.efectivo
    );
    const totalNequi = TotalesCajaService._redondear(
      ventasPorMedio.nequi + abonosPorMedio.nequi
    );
    const totalOtro = TotalesCajaService._redondear(
      ventasPorMedio.otro + abonosPorMedio.otro
    );

    return {
      fecha: fechaBogota,
      totalDia: TotalesCajaService._redondear(totalEfectivo + totalNequi + totalOtro),
      totalEfectivo,
      totalNequi,
      totalOtro,
      desglose: {
        ventas: {
          efectivo: TotalesCajaService._redondear(ventasPorMedio.efectivo),
          nequi: TotalesCajaService._redondear(ventasPorMedio.nequi),
          otro: TotalesCajaService._redondear(ventasPorMedio.otro)
        },
        apartados: {
          efectivo: TotalesCajaService._redondear(abonosPorMedio.efectivo),
          nequi: TotalesCajaService._redondear(abonosPorMedio.nequi),
          otro: TotalesCajaService._redondear(abonosPorMedio.otro)
        }
      }
    };
  }
}
