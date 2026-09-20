/**
 * Controlador de Ventas
 */
export class VentaController {
  constructor(ventaService, facturacionService) {
    this.ventaService = ventaService;
    this.facturacionService = facturacionService;
  }

  async crearVenta(req, res) { /* TODO */ }
  async verPagosDelDia(req, res) { /* TODO */ }
  async reimprimirFactura(req, res) { /* TODO */ }
}
