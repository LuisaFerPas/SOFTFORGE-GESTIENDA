import { Result } from '../../../shared/Result.js';
import { Factura } from '../dominio/Factura.js';

/** SD-119 / HU-0401.1: genera el registro de factura, no la impresión. */
export class FacturacionService {
  constructor(ventaRepository, impresoraAdapter) {
    this.ventaRepository = ventaRepository;
    this.impresoraAdapter = impresoraAdapter;
  }

  /**
   * Emite una factura vinculada a una venta existente.
   * El repositorio asigna el consecutivo de manera transaccional.
   * @returns {Promise<Result>}
   */
  async generarFactura(ventaId, nombreCliente = 'Consumidor Final') {
    try {
      const id = Number(ventaId);
      if (!Number.isSafeInteger(id) || id <= 0) {
        return Result.fail('El ID de la venta debe ser un entero positivo.');
      }
      if (nombreCliente !== null && nombreCliente !== undefined && typeof nombreCliente !== 'string') {
        return Result.fail('El nombre del cliente debe ser un texto.');
      }
      const nombre = (nombreCliente ?? '').trim() || 'Consumidor Final';
      if (nombre.length > 150) {
        return Result.fail('El nombre del cliente no puede superar 150 caracteres.');
      }
      const venta = await this.ventaRepository.buscarPorId(id);
      if (!venta) return Result.fail('La venta indicada no existe.');

      const factura = new Factura({ ventaId: id, nombreCliente: nombre });
      const registrada = await this.ventaRepository.guardarFactura(factura);
      return Result.ok(registrada);
    } catch (error) {
      return Result.fail(error.message || 'No fue posible generar la factura.');
    }
  }

  /**
   * SD-122 / HU-0405.1 — Obtiene los datos de una factura para reimpresión.
   * No envía nada a la impresora: el adaptador ESC/POS todavía es un stub.
   * La interfaz podrá utilizar estos datos para iniciar la impresión en SD-124.
   * @returns {Promise<Result>}
   */
  async prepararReimpresion(consecutivo) {
    try {
      if (typeof consecutivo !== 'string') {
        return Result.fail('El consecutivo debe tener el formato F-0001.');
      }
      const numero = consecutivo.trim().toUpperCase();
      if (!/^F-[0-9]{4,}$/.test(numero)) {
        return Result.fail('El consecutivo debe tener el formato F-0001.');
      }

      const factura = await this.ventaRepository.buscarFacturaPorConsecutivo(numero);
      if (!factura) {
        return Result.fail(`No se encontró una factura con el consecutivo ${numero}.`);
      }
      if (factura.estado !== 'EMITIDA') {
        return Result.fail('No se puede reimprimir una factura anulada.');
      }

      const venta = await this.ventaRepository.buscarPorId(factura.ventaId);
      if (!venta) {
        return Result.fail('No fue posible recuperar la venta asociada a la factura.');
      }

      const detalles = (venta.items ?? []).map(item => {
        const productoId = Number(item.productoId ?? item.producto_id);
        return {
          productoId,
          descripcion: item.descripcion ?? `Producto #${productoId}`,
          cantidad: Number(item.cantidad),
          precioUnitario: Number(item.precioUnitario ?? item.precio_unitario),
          subtotal: Number(item.subtotal)
        };
      });

      return Result.ok({
        factura: typeof factura.aObjetoPlano === 'function'
          ? factura.aObjetoPlano() : factura,
        venta: {
          id: venta.id,
          total: Number(venta.total),
          fechaHora: venta.fechaHora,
          items: detalles
        },
        impresionRealizada: false,
        estadoImpresion: 'PENDIENTE'
      });
    } catch (error) {
      console.error('[Facturación] No fue posible preparar la reimpresión:', error);
      return Result.fail('No fue posible preparar la reimpresión.');
    }
  }

  async imprimirFactura(ventaId) {
    // SD-121: la impresión física se implementará en una tarea posterior.
    throw new Error('La impresión de facturas aún no está implementada.');
  }
}
