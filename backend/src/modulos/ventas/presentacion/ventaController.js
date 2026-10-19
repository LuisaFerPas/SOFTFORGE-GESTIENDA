export class VentaController {
  constructor(ventaService, facturacionService) {
    this.ventaService = ventaService;
    this.facturacionService = facturacionService;
  }

  async crearVenta(req, res) {
    const resultado = await this.ventaService.procesarVenta(req.body, req.user?.id);
    if (resultado.isFailure) return res.status(400).json({ success: false, message: resultado.error });
    const datos = resultado.getValue();
    // No revelar cantidades de stock al VENDEDOR (restricción HU-0607).
    if (req.user?.role === 'VENDEDOR') {
      datos.advertencias = datos.advertencias.map(({ productoId, nombre, mensaje }) => ({ productoId, nombre, mensaje }));
    }
    return res.status(201).json({ success: true, data: datos });
  }

  async verPagosDelDia(req, res) {
    const fecha = new Date().toISOString().slice(0,10);
    const resultado = await this.ventaService.consultarPagosDelDia(fecha);
    if (resultado.isFailure) return res.status(400).json({ success: false, message: resultado.error });
    return res.status(200).json({ success: true, data: resultado.getValue() });
  }

  async reimprimirFactura(req, res) {
    return res.status(501).json({ success: false, message: 'Reimpresión pendiente del módulo de facturación.' });
  }
}
