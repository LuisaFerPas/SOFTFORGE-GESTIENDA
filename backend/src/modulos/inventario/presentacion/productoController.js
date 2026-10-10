/**
 * Controlador HTTP para el Módulo de Inventario y Catálogo de Productos.
 */
export class ProductoController {
  constructor(productoService, stockService) {
    this.productoService = productoService;
    this.stockService = stockService;
  }

  async listar(req, res) {
    const { search, categoria, estadoStock } = req.query;
    const rolUsuario = req.user?.role || 'ADMINISTRADOR';

    const resultado = await this.productoService.listarProductos({
      filtros: { search, categoria, estadoStock },
      rolUsuario
    });

    if (resultado.isFailure) {
      return res.status(400).json({ success: false, message: resultado.error });
    }

    return res.status(200).json({
      success: true,
      data: resultado.getValue()
    });
  }

  async obtenerPorId(req, res) {
    const { id } = req.params;
    const rolUsuario = req.user?.role || 'ADMINISTRADOR';

    const resultado = await this.productoService.obtenerPorId(id, rolUsuario);
    if (resultado.isFailure) {
      return res.status(404).json({ success: false, message: resultado.error });
    }

    return res.status(200).json({
      success: true,
      data: resultado.getValue()
    });
  }

  async obtenerPorCodigo(req, res) {
    const { codigo } = req.params;
    const rolUsuario = req.user?.role || 'ADMINISTRADOR';

    const resultado = await this.productoService.obtenerPorCodigo(codigo, rolUsuario);
    if (resultado.isFailure) {
      return res.status(404).json({ success: false, message: resultado.error });
    }

    return res.status(200).json({
      success: true,
      data: resultado.getValue()
    });
  }

  /**
   * HU-0607: Endpoint para consultar stock actual (Solo Administrador)
   */
  async consultarStock(req, res) {
    const { id } = req.params;
    const rolUsuario = req.user?.role;

    const resultado = await this.productoService.consultarStockActual(id, rolUsuario);
    if (resultado.isFailure) {
      return res.status(403).json({ success: false, message: resultado.error });
    }

    return res.status(200).json({
      success: true,
      data: resultado.getValue()
    });
  }

  /**
   * HU-0604: Alertas de stock bajo y agotados
   */
  async obtenerAlertas(req, res) {
    const rolUsuario = req.user?.role || 'ADMINISTRADOR';

    const resultado = await this.productoService.obtenerAlertasStock(rolUsuario);
    if (resultado.isFailure) {
      return res.status(403).json({ success: false, message: resultado.error });
    }

    return res.status(200).json({
      success: true,
      data: resultado.getValue()
    });
  }
}
