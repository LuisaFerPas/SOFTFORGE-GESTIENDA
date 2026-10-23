/**
 * Puerto de salida — contrato de persistencia para el agregado Venta.
 * HU-0300.1 · Patrón hexagonal / Data Mapper.
 *
 * Toda implementación concreta (SQLite, en memoria, etc.) debe extender
 * esta clase e implementar los cuatro métodos declarados.
 * Si un método no se implementa, lanzará un error descriptivo en tiempo
 * de ejecución, evitando fallos silenciosos.
 */
export class IVentaRepository {
  /**
   * Persiste una venta completa de forma transaccional.
   * @param {import('../Venta.js').Venta} venta          - Agregado raíz de la venta.
   * @param {Array<{productoId: number, cantidad: number}>} detalles - Ítems de la venta.
   * @param {{ medioPago: string, montoRecibido?: number, montoEfectivo?: number, montoNequi?: number }} pago
   * @returns {Promise<{ id: number, total: number, medioPago: string, cambio: number, advertencias: Array }>}
   */
  async guardar(venta, detalles, pago) {
    throw new Error('IVentaRepository.guardar() no implementado.');
  }

  /**
   * Busca una venta por su ID.
   * @param {number} id
   * @returns {Promise<import('../Venta.js').Venta | null>}
   */
  async buscarPorId(id) {
    throw new Error('IVentaRepository.buscarPorId() no implementado.');
  }

  /**
   * Lista todas las ventas de un día específico.
   * @param {string} fecha - Formato 'YYYY-MM-DD'.
   * @returns {Promise<Array<import('../Venta.js').Venta>>}
   */
  async listarDelDia(fecha) {
    throw new Error('IVentaRepository.listarDelDia() no implementado.');
  }

  /**
   * Busca una factura por su número consecutivo (ej. 'F-0001').
   * @param {string} consecutivo
   * @returns {Promise<import('../Factura.js').Factura | null>}
   */
  async buscarFacturaPorConsecutivo(consecutivo) {
    throw new Error('IVentaRepository.buscarFacturaPorConsecutivo() no implementado.');
  }
}
