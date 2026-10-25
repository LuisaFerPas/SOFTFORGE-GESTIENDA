export class VentaController {
  constructor(ventaService, facturacionService) {
    this.ventaService = ventaService;
    this.facturacionService = facturacionService;
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

  /**
   * SD-120 / HU-0401.2 — Emite la factura de una venta existente.
   * POST /api/ventas/facturas
   * Body: { ventaId: number, nombreCliente?: string }
   * La impresión física corresponde a la historia SD-121.
   */
  async crearFactura(req, res) {
    try {
      const { ventaId, nombreCliente } = req.body ?? {};

      // Se acepta un entero o su representación decimal sin caracteres extra.
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
        // No exponer a los clientes los detalles de errores internos de SQLite.
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
}
