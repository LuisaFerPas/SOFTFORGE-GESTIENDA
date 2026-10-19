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

    const alertas = resultado.getValue();
    return res.status(200).json({
      success: true,
      data: alertas,
      resumen: { total: alertas.length, bajos: alertas.filter(p => p.stockActual > 0).length, agotados: alertas.filter(p => p.stockActual <= 0).length }
    });
  }

  /**
   * Registra un nuevo producto en el catálogo (Exclusivo Administrador).
   */
  async registrar(req, res) {
    const resultado = await this.productoService.registrarProducto(req.body);
    if (resultado.isFailure) {
      return res.status(400).json({ success: false, message: resultado.error });
    }

    return res.status(201).json({
      success: true,
      message: 'Producto registrado exitosamente.',
      data: resultado.getValue()
    });
  }

  /**
   *Modifica los datos de un producto existente (Exclusivo Administrador).
   */
  async editar(req, res) {
    const { id } = req.params;
    const resultado = await this.productoService.modificarProducto(id, req.body);
    if (resultado.isFailure) {
      const status = resultado.error.toLowerCase().includes('no encontrado') ? 404 : 400;
      return res.status(status).json({ success: false, message: resultado.error });
    }

    return res.status(200).json({
      success: true,
      message: 'Producto modificado exitosamente.',
      data: resultado.getValue()
    });
  }

  /**
   * Da de baja (desactiva) un producto del catálogo (Exclusivo Administrador).
   */
  async eliminar(req, res) {
    const { id } = req.params;
    const resultado = await this.productoService.darDeBajaProducto(id);
    if (resultado.isFailure) {
      const status = resultado.error.toLowerCase().includes('no encontrado') ? 404 : 400;
      return res.status(status).json({ success: false, message: resultado.error });
    }

    return res.status(200).json({
      success: true,
      message: 'Producto dado de baja exitosamente.',
      data: resultado.getValue()
    });
  }
}

