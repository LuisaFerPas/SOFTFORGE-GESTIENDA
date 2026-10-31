/**
 * Constantes de estado para la entidad Factura.
 * HU-0300.4
 */
export const EstadoFactura = Object.freeze({
  EMITIDA: 'EMITIDA',
  ANULADA: 'ANULADA',
});

/**
 * Entidad de dominio Factura.
 * HU-0300.4 — Documento asociado a una venta. El consecutivo sigue el
 * formato 'F-XXXX' (ej. 'F-0001') y es generado por la BD / repositorio.
 */
export class Factura {
  /**
   * @param {object} datos
   * @param {number|null}  datos.id             - ID generado por la BD (null al crear).
   * @param {number}       datos.ventaId        - FK obligatoria a la venta.
   * @param {string|null}  datos.consecutivo    - Ej. 'F-0001'. Null al crear (lo asigna el repo).
   * @param {string}       [datos.nombreCliente] - Nombre del cliente. Default 'Consumidor Final'.
   * @param {string}       [datos.fechaEmision]  - ISO string. Default ahora.
   * @param {string}       [datos.estado]        - EstadoFactura. Default EMITIDA.
   */
  constructor({ id, ventaId, consecutivo, nombreCliente, fechaEmision, estado }) {
    // --- Invariantes de dominio ---
    if (!ventaId || Number(ventaId) <= 0) {
      throw new Error('Factura: ventaId es obligatorio y debe ser un entero positivo.');
    }
    if (estado !== undefined && !Object.values(EstadoFactura).includes(estado)) {
      throw new Error(`Factura: estado inválido '${estado}'. Use EstadoFactura.`);
    }

    this.id            = id ?? null;
    this.ventaId       = Number(ventaId);
    this.consecutivo   = consecutivo ?? null;
    this.nombreCliente = nombreCliente || 'Consumidor Final';
    this.fechaEmision  = fechaEmision  ?? new Date().toISOString();
    this.estado        = estado        ?? EstadoFactura.EMITIDA;
  }

  /**
   * Anula la factura.
   * @throws {Error} Si ya está anulada.
   */
  anular() {
    if (this.estado === EstadoFactura.ANULADA) {
      throw new Error('Factura: la factura ya está anulada.');
    }
    this.estado = EstadoFactura.ANULADA;
  }

  /**
   * Retorna un objeto plano apto para serialización / persistencia.
   * @returns {object}
   */
  aObjetoPlano() {
    return {
      id:            this.id,
      ventaId:       this.ventaId,
      consecutivo:   this.consecutivo,
      nombreCliente: this.nombreCliente,
      fechaEmision:  this.fechaEmision,
      estado:        this.estado,
    };
  }
}
