/**
 * Servicio de Ventas (Carrito, cobro, descuento de inventario)
 */
export class VentaService {
  constructor(ventaRepository, eventBus) {
    this.ventaRepository = ventaRepository;
    this.eventBus = eventBus;
  }

  async procesarVenta(datosVenta) {
    // TODO: Validar items, calcular totales, guardar venta y emitir evento
  }

  async consultarPagosDelDia(fecha) {
    // TODO: Cuadre de caja diario por medio de pago
  }
}
