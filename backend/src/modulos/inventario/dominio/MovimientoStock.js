/**
 * Entidad de Dominio: Movimiento de Stock (Entradas y Ajustes)
 */
export class MovimientoStock {
  constructor({ id, productoId, usuarioId, tipo, cantidad, costoUnitario, fechaHora, motivo }) {
    this.id = id;
    this.productoId = productoId;
    this.usuarioId = usuarioId;
    this.tipo = tipo;
    this.cantidad = cantidad;
    this.costoUnitario = costoUnitario;
    this.fechaHora = fechaHora;
    this.motivo = motivo;
  }
}
