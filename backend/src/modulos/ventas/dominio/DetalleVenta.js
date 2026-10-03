export class DetalleVenta {
  constructor({ id, ventaId, productoId, codigoProducto, descripcion, cantidad, precioUnitario, ivaPorcentaje, subtotal }) {
    this.id = id;
    this.ventaId = ventaId;
    this.productoId = productoId;
    this.codigoProducto = codigoProducto;
    this.descripcion = descripcion;
    this.cantidad = cantidad;
    this.precioUnitario = precioUnitario;
    this.ivaPorcentaje = ivaPorcentaje;
    this.subtotal = subtotal;
  }
}

export class Pago {
  constructor({ id, ventaId, medioPago, montoRecibido, montoTotal, cambioEntregado, fechaHora }) {
    this.id = id;
    this.ventaId = ventaId;
    this.medioPago = medioPago;
    this.montoRecibido = montoRecibido;
    this.montoTotal = montoTotal;
    this.cambioEntregado = cambioEntregado;
    this.fechaHora = fechaHora;
  }
}
