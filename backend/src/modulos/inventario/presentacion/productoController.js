/**
 * Controlador de Inventario y Productos
 */
export class ProductoController {
  constructor(productoService, stockService) {
    this.productoService = productoService;
    this.stockService = stockService;
  }

  async registrar(req, res) { /* TODO */ }
  async listar(req, res) { /* TODO */ }
  async editar(req, res) { /* TODO */ }
  async eliminar(req, res) { /* TODO */ }
  async registrarEntrada(req, res) { /* TODO */ }
  async obtenerStockBajo(req, res) { /* TODO */ }
}
