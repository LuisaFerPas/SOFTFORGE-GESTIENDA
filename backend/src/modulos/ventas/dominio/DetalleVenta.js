/**
 * Ítem individual dentro de una venta.
 * HU-0300.3 — Enriquecido con invariantes y calcularSubtotal().
 */
export class DetalleVenta {
  constructor({ id, ventaId, productoId, codigoProducto, descripcion, cantidad, precioUnitario, ivaPorcentaje, subtotal }) {
    // --- Invariantes de dominio ---
    if (!Number.isInteger(Number(cantidad)) || Number(cantidad) <= 0) {
      throw new Error('DetalleVenta: la cantidad debe ser un entero positivo.');
    }
    if (!Number.isFinite(Number(precioUnitario)) || Number(precioUnitario) <= 0) {
      throw new Error('DetalleVenta: el precio unitario debe ser un número positivo.');
    }

    this.id              = id ?? null;
    this.ventaId         = ventaId ?? null;
    this.productoId      = Number(productoId);
    this.codigoProducto  = codigoProducto ?? null;
    this.descripcion     = descripcion ?? null;
    this.cantidad        = Number(cantidad);
    this.precioUnitario  = Number(precioUnitario);
    this.ivaPorcentaje   = Number(ivaPorcentaje ?? 0);
    // Si ya viene calculado (ej. al reconstruir desde BD), se respeta.
    // Si no, se calcula automáticamente.
    this.subtotal        = subtotal !== undefined && subtotal !== null
      ? Number(subtotal)
      : this.calcularSubtotal();
  }

  /**
   * Calcula el subtotal del ítem (sin IVA).
   * @returns {number}
   */
  calcularSubtotal() {
    return this.cantidad * this.precioUnitario;
  }

  /**
   * Retorna un objeto plano apto para serialización / persistencia.
   * @returns {object}
   */
  aObjetoPlano() {
    return {
      id:             this.id,
      ventaId:        this.ventaId,
      productoId:     this.productoId,
      codigoProducto: this.codigoProducto,
      descripcion:    this.descripcion,
      cantidad:       this.cantidad,
      precioUnitario: this.precioUnitario,
      ivaPorcentaje:  this.ivaPorcentaje,
      subtotal:       this.subtotal,
    };
  }
}

/**
 * Registro de pago asociado a una venta.
 * (Sin cambios en lógica — se mantiene como estaba.)
 */
export class Pago {
  constructor({ id, ventaId, medioPago, montoRecibido, montoTotal, cambioEntregado, fechaHora }) {
    this.id              = id;
    this.ventaId         = ventaId;
    this.medioPago       = medioPago;
    this.montoRecibido   = montoRecibido;
    this.montoTotal      = montoTotal;
    this.cambioEntregado = cambioEntregado;
    this.fechaHora       = fechaHora;
  }
}
