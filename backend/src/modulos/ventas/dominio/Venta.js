/**
 * Agregado Venta
 */
export class Venta {
  constructor({ id, numeroFactura, clienteNombre, usuarioId, subtotal, ivaTotal, total, fechaHora, estado, items = [] }) {
    this.id = id;
    this.numeroFactura = numeroFactura;
    this.clienteNombre = clienteNombre || 'Consumidor Final';
    this.usuarioId = usuarioId;
    this.subtotal = subtotal;
    this.ivaTotal = ivaTotal;
    this.total = total;
    this.fechaHora = fechaHora;
    this.estado = estado;
    this.items = items;
  }
}
