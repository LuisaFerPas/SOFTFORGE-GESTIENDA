import { Result } from '../../../shared/Result.js';

export class VentaService {
  constructor(ventaRepository, eventBus) {
    this.ventaRepository = ventaRepository;
    this.eventBus = eventBus;
  }

  async procesarVenta(datosVenta = {}, usuarioId) {
    try {
      if (!Number.isInteger(Number(usuarioId)) || Number(usuarioId) <= 0) {
        return Result.fail('Usuario inválido.');
      }
      if (!Array.isArray(datosVenta.items) || datosVenta.items.length === 0) {
        return Result.fail('La venta requiere al menos un producto.');
      }
      const cantidades = new Map();
      for (const item of datosVenta.items) {
        const id = Number(item.productoId);
        const cantidad = Number(item.cantidad);
        if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(cantidad) || cantidad <= 0) {
          return Result.fail('Los IDs y cantidades deben ser enteros positivos.');
        }
        cantidades.set(id, (cantidades.get(id) || 0) + cantidad);
      }
      const medioPago = datosVenta.medioPago;
      if (!['EFECTIVO', 'NEQUI', 'MIXTO'].includes(medioPago)) {
        return Result.fail('Medio de pago no válido.');
      }
      const detalle = [...cantidades].map(([productoId, cantidad]) => ({ productoId, cantidad }));
      const datos = await this.ventaRepository.guardarVenta({ usuarioId: Number(usuarioId) }, detalle, {
        medioPago, montoRecibido: datosVenta.montoRecibido,
        montoEfectivo: datosVenta.montoEfectivo, montoNequi: datosVenta.montoNequi
      });
      return Result.ok(datos);
    } catch (error) {
      return Result.fail(error.message || 'No se pudo registrar la venta.');
    }
  }

  async consultarPagosDelDia(fecha = new Date().toISOString().slice(0, 10)) {
    try { return Result.ok(await this.ventaRepository.listarVentasDelDia(fecha)); }
    catch (e) { return Result.fail(e.message); }
  }
}
