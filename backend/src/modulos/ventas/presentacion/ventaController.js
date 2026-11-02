export class VentaController {
  constructor(ventaService, facturacionService, productoRepository, productoService = null, db = null) {
    this.ventaService = ventaService;
    this.facturacionService = facturacionService;
    this.productoRepository = productoRepository;
    this.productoService = productoService;
    this.db = db;
  }

  // SD-111/112: POST /api/ventas con el usuario autenticado por verifyToken.
  async crearVenta(req, res) {
    const resultado = await this.ventaService.registrarVenta(req.body, req.user?.id);
    if (resultado.isFailure) {
      return res.status(400).json({ success: false, message: resultado.error });
    }
    const datos = resultado.getValue();
    if (req.user?.role === 'VENDEDOR') {
      datos.advertencias = (datos.advertencias ?? []).map(({ productoId, nombre, mensaje }) => ({
        productoId, nombre, mensaje
      }));
    }
    return res.status(201).json({ success: true, data: datos });
  }

  async crearFactura(req, res) {
    try {
      const { ventaId, nombreCliente } = req.body ?? {};

      const idValido =
        (typeof ventaId === 'number' && Number.isSafeInteger(ventaId) && ventaId > 0) ||
        (typeof ventaId === 'string' && /^[1-9]\d*$/.test(ventaId) &&
          Number.isSafeInteger(Number(ventaId)));
      if (!idValido) {
        return res.status(400).json({
          success: false, message: 'El ID de la venta debe ser un entero positivo.'
        });
      }
      if (nombreCliente != null &&
          (typeof nombreCliente !== 'string' || nombreCliente.trim().length > 150)) {
        return res.status(400).json({
          success: false, message: 'El nombre del cliente debe ser un texto de máximo 150 caracteres.'
        });
      }

      const resultado = await this.facturacionService.generarFactura(
        Number(ventaId), nombreCliente
      );
      if (resultado.isFailure) {
        if (resultado.error === 'La venta indicada no existe.') {
          return res.status(404).json({ success: false, message: resultado.error });
        }
        if (resultado.error === 'La venta ya tiene una factura registrada.') {
          return res.status(409).json({ success: false, message: resultado.error });
        }
        return res.status(500).json({
          success: false, message: 'No fue posible generar la factura. Intenta nuevamente.'
        });
      }
      const factura = resultado.getValue();
      return res.status(201).json({
        success: true,
        data: typeof factura.aObjetoPlano === 'function' ? factura.aObjetoPlano() : factura
      });
    } catch (error) {
      console.error('[Facturación] Error al crear factura:', error);
      return res.status(500).json({
        success: false, message: 'Error interno al generar la factura.'
      });
    }
  }

  async verPagosDelDia(req, res) {
    const fecha = new Date().toISOString().slice(0, 10);
    const resultado = await this.ventaService.consultarPagosDelDia(fecha);
    if (resultado.isFailure) {
      return res.status(400).json({ success: false, message: resultado.error });
    }
    return res.status(200).json({ success: true, data: resultado.getValue() });
  }

  /** SD-122: consulta segura de factura por consecutivo; NO imprime físicamente. */
  async reimprimirFactura(req, res) {
    try {
      const consecutivo = req.params?.consecutivo;
      if (typeof consecutivo !== 'string' ||
          !/^F-[0-9]{4,}$/.test(consecutivo.trim().toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: 'El consecutivo debe tener el formato F-0001.'
        });
      }

      const resultado = await this.facturacionService.prepararReimpresion(consecutivo);
      if (resultado.isFailure) {
        if (resultado.error.startsWith('No se encontró una factura')) {
          return res.status(404).json({ success: false, message: resultado.error });
        }
        if (resultado.error === 'No se puede reimprimir una factura anulada.') {
          return res.status(409).json({ success: false, message: resultado.error });
        }
        return res.status(500).json({
          success: false,
          message: 'No fue posible preparar la reimpresión de la factura.'
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Factura localizada. La impresión física todavía no se ha realizado.',
        data: resultado.getValue()
      });
    } catch (error) {
      console.error('[Facturación] Error en reimprimirFactura:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno al consultar la factura para reimpresión.'
      });
    }
  }

  /**
   * HU-0301.1: Buscar un producto por código.
   * GET /api/ventas/productos/:codigo
   */
  async buscarProductoPorCodigo(req, res) {
    try {
      const { codigo } = req.params;
      
      // Usamos el repositorio de inventario para buscar
      const producto = await this.productoRepository.buscarPorCodigo(codigo);

      if (!producto) {
        return res.status(404).json({ success: false, message: 'Producto no encontrado' });
      }

      // Devolvemos solo los campos necesarios para el frontend
      return res.status(200).json({ 
        success: true, 
        data: {
          id: producto.id,
          nombre: producto.nombre,
          codigoInterno: producto.codigoInterno,
          codigoBarras: producto.codigoBarras,
          precioVentaUnitario: producto.precioVentaUnitario,
          stockActual: producto.stockActual
        } 
      });
    } catch (error) {
      console.error('Error al buscar producto:', error);
      return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }

  /**
   * HU-0402.4: Generar factura e imprimir directamente.
   * POST /api/ventas/facturas/imprimir
   */
  async generarEImprimirFactura(req, res) {
    try {
      const { ventaId, nombreCliente } = req.body ?? {};

      if (!ventaId) {
        return res.status(400).json({ success: false, message: 'El ID de la venta es obligatorio.' });
      }

      const resultado = await this.facturacionService.generarEImprimirFactura(Number(ventaId), nombreCliente);

      if (resultado.isFailure) {
        return res.status(400).json({ success: false, message: resultado.error });
      }

      return res.status(201).json({ success: true, data: resultado.getValue() });
    } catch (error) {
      console.error('[Facturación] Error al imprimir:', error);
      return res.status(500).json({ success: false, message: 'Error interno al imprimir la factura.' });
    }
  }

  /**
   * HU-0302: Búsqueda de productos por nombre para el módulo de ventas.
   * GET /api/ventas/productos/buscar?nombre=X
   */
  async buscarProductosPorNombre(req, res) {
    const { nombre = '' } = req.query;
    const rolUsuario = req.user?.role || 'VENDEDOR';

    if (!nombre.trim()) {
      return res.status(200).json({ success: true, data: [] });
    }

    if (!this.productoService) {
      return res.status(500).json({ success: false, message: 'ProductoService no disponible.' });
    }

    const resultado = await this.productoService.listarProductos({
      filtros: { search: nombre.trim() },
      rolUsuario
    });

    if (resultado.isFailure) {
      return res.status(400).json({ success: false, message: resultado.error });
    }

    return res.status(200).json({ success: true, data: resultado.getValue() });
  }

  /**
   * HU-0403: Generar factura con nombre de cliente opcional.
   * POST /api/ventas/facturas
   */
  async generarFactura(req, res) {
    return this.crearFactura(req, res);
  }

  /**
   * HU-0403: Buscar factura ya emitida por consecutivo.
   * GET /api/ventas/facturas/:consecutivo
   */
  async buscarFactura(req, res) {
    const { consecutivo } = req.params;
    const resultado = await this.facturacionService.prepararReimpresion(consecutivo);
    if (resultado.isFailure) {
      return res.status(404).json({ success: false, message: resultado.error });
    }
    return res.status(200).json({ success: true, data: resultado.getValue().factura });
  }
}