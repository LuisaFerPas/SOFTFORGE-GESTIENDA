import { MedioPago } from './MedioPago.js';

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
