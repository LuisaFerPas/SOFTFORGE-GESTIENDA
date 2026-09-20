/**
 * Contrato de persistencia para Ventas y Pagos
 */
export class VentaRepository {
  async guardarVenta(venta, detalleItems, pago) { throw new Error('Método no implementado'); }
  async buscarPorId(id) { throw new Error('Método no implementado'); }
  async buscarPorNumeroFactura(numero) { throw new Error('Método no implementado'); }
  async listarVentasDelDia(fecha) { throw new Error('Método no implementado'); }
  async obtenerSiguienteConsecutivo() { throw new Error('Método no implementado'); }
}
