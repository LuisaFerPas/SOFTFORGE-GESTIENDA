/**
 * Constantes de estado para el agregado Venta.
 * HU-0300.2
 */
export const EstadoVenta = Object.freeze({
  PENDIENTE:  'PENDIENTE',
  COMPLETADA: 'COMPLETADA',
  ANULADA:    'ANULADA',
});

/**
 * Agregado raíz Venta.
 * HU-0300.2 — Enriquecido con invariantes, estados y calcularTotal().
 */
export class Venta {
  constructor({ id, numeroFactura, clienteNombre, usuarioId, subtotal, ivaTotal, total, fechaHora, estado, items = [] }) {
    // --- Invariantes de dominio ---
    if (!usuarioId || Number(usuarioId) <= 0) {
      throw new Error('Venta: usuarioId es obligatorio y debe ser un entero positivo.');
    }
    if (!Array.isArray(items) || items.length === 0) {
      // Permitimos construir sin ítems solo cuando viene de la BD (total ya calculado)
      // La validación fuerte se aplica al crear una venta nueva (total no provisto).
      if (total === undefined || total === null) {
        throw new Error('Venta: debe contener al menos un ítem.');
      }
    }
    if (total !== undefined && total !== null && Number(total) <= 0) {
      throw new Error('Venta: el total debe ser mayor a cero.');
    }
    if (estado !== undefined && !Object.values(EstadoVenta).includes(estado)) {
      throw new Error(`Venta: estado inválido '${estado}'. Use EstadoVenta.`);
    }

    this.id             = id;
    this.numeroFactura  = numeroFactura ?? null;
    this.clienteNombre  = clienteNombre || 'Consumidor Final';
    this.usuarioId      = Number(usuarioId);
    this.subtotal       = subtotal   ?? null;
    this.ivaTotal       = ivaTotal   ?? 0;
    this.total          = total      ?? null;
    this.fechaHora      = fechaHora  ?? new Date().toISOString();
    this.estado         = estado     ?? EstadoVenta.COMPLETADA;
    this.items          = items;
  }

  /**
   * Calcula el total sumando los subtotales de los ítems.
   * Requiere que cada ítem exponga la propiedad `subtotal`.
   * @returns {number}
   */
  calcularTotal() {
    if (!this.items || this.items.length === 0) return this.total ?? 0;
    return this.items.reduce((acc, item) => acc + Number(item.subtotal ?? 0), 0);
  }

  /**
   * Retorna un objeto plano apto para serialización / persistencia.
   * @returns {object}
   */
  aObjetoPlano() {
    return {
      id:            this.id,
      numeroFactura: this.numeroFactura,
      clienteNombre: this.clienteNombre,
      usuarioId:     this.usuarioId,
      subtotal:      this.subtotal,
      ivaTotal:      this.ivaTotal,
      total:         this.total,
      fechaHora:     this.fechaHora,
      estado:        this.estado,
      items:         this.items,
    };
  }
}
