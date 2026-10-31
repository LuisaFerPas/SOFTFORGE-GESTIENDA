/**
 * Puerto de salida de ventas: contrato de persistencia del agregado Venta.
 * Las implementaciones (SQLite y otras) deben obtener los precios del catálogo
 * antes de construir el detalle, nunca del cuerpo HTTP.
 */
export class IVentaRepository {
  /**
   * Consulta los productos activos que se van a vender (precio autoritativo).
   * @param {number[]} ids
   * @returns {Promise<Array<{id:number,codigoInterno:string,nombre:string,precioVentaUnitario:number}>>}
   */
  async obtenerProductosParaVenta(ids) {
    throw new Error('IVentaRepository.obtenerProductosParaVenta() no implementado.');
  }

  /** @param {import('../Venta.js').Venta} venta */
  async guardar(venta, detalles, pago) {
    throw new Error('IVentaRepository.guardar() no implementado.');
  }

  async buscarPorId(id) {
    throw new Error('IVentaRepository.buscarPorId() no implementado.');
  }

  async listarDelDia(fecha) {
    throw new Error('IVentaRepository.listarDelDia() no implementado.');
  }

  /** Emite una factura con consecutivo asignado por la persistencia. */
  async guardarFactura(factura) {
    throw new Error('IVentaRepository.guardarFactura() no implementado.');
  }

  async buscarFacturaPorConsecutivo(consecutivo) {
    throw new Error('IVentaRepository.buscarFacturaPorConsecutivo() no implementado.');
  }
}
