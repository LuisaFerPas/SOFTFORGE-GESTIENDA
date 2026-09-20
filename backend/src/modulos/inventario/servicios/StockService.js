/**
 * Servicio de Control de Stock y Entradas (Juan Camilo)
 */
export class StockService {
  constructor(productoRepository) {
    this.productoRepository = productoRepository;
  }

  async registrarEntradaMercancia(datosEntrada) {
    // TODO: Registrar entrada e incrementar stock
  }

  async obtenerProductosStockBajo() {
    // TODO: Listar productos que alcanzaron su stock mínimo
  }
}
