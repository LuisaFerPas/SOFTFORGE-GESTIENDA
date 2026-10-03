export const EstadoApartado = Object.freeze({
  ACTIVO: 'ACTIVO',
  COMPLETADO: 'COMPLETADO',
  CANCELADO: 'CANCELADO'
});

export class Apartado {
  constructor({ id, codigo, clienteNombre, clienteTelefono, usuarioId, montoTotal, saldoPendiente, fechaCreacion, fechaLimite, estado, items = [] }) {
    this.id = id;
    this.codigo = codigo;
    this.clienteNombre = clienteNombre;
    this.clienteTelefono = clienteTelefono;
    this.usuarioId = usuarioId;
    this.montoTotal = montoTotal;
    this.saldoPendiente = saldoPendiente;
    this.fechaCreacion = fechaCreacion;
    this.fechaLimite = fechaLimite;
    this.estado = estado;
    this.items = items;
  }
}

export class DetalleApartado {
  constructor({ id, apartadoId, productoId, cantidad, precioUnitario, subtotal }) {
    this.id = id;
    this.apartadoId = apartadoId;
    this.productoId = productoId;
    this.cantidad = cantidad;
    this.precioUnitario = precioUnitario;
    this.subtotal = subtotal;
  }
}

export class AbonoApartado {
  constructor({ id, apartadoId, usuarioId, montoAbono, medioPago, fechaHora, saldoRestante }) {
    this.id = id;
    this.apartadoId = apartadoId;
    this.usuarioId = usuarioId;
    this.montoAbono = montoAbono;
    this.medioPago = medioPago;
    this.fechaHora = fechaHora;
    this.saldoRestante = saldoRestante;
  }
}
