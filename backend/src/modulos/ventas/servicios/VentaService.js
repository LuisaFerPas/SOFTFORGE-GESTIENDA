
import { Result } from '../../../shared/Result.js';
import { Venta } from '../dominio/Venta.js';

export class VentaService {
  constructor(ventaRepository, eventBus) {
    this.ventaRepository = ventaRepository;
    this.eventBus = eventBus;
  }

  // SD-112 / HU-0304.2
  async registrarVenta(datosVenta = {}, usuarioId) {
    try {
      // 1. Validar el usuario autenticado
      const idUsuario = Number(usuarioId);

      if (!Number.isSafeInteger(idUsuario) || idUsuario <= 0) {
        return Result.fail('Usuario inválido.');
      }

      // 2. Verificar que existan productos
      if (!Array.isArray(datosVenta.items) ||
          datosVenta.items.length === 0) {
        return Result.fail('La venta requiere al menos un producto.');
      }

      // 3. Validar y agrupar los productos
      const cantidades = new Map();

      for (const item of datosVenta.items) {
        const id = Number(item.productoId);
        const cantidad = Number(item.cantidad);

        if (!Number.isSafeInteger(id) || id <= 0 ||
            !Number.isSafeInteger(cantidad) || cantidad <= 0) {
          return Result.fail(
            'Los IDs y cantidades deben ser enteros positivos.'
          );
        }

        const acumulado = (cantidades.get(id) || 0) + cantidad;

        if (!Number.isSafeInteger(acumulado)) {
          return Result.fail('Cantidad de productos fuera de rango.');
        }

        cantidades.set(id, acumulado);
      }

      // 4. Validar el medio de pago
      const medioPago = datosVenta.medioPago;

      if (!['EFECTIVO', 'NEQUI', 'MIXTO'].includes(medioPago)) {
        return Result.fail('Medio de pago no válido.');
      }

      // 5. Preparar los detalles
      const detalle = [...cantidades].map(
        ([productoId, cantidad]) => ({
          productoId,
          cantidad
        })
      );

      // 6. Construir el agregado de dominio Venta
      const venta = new Venta({
        usuarioId: idUsuario,
        items: detalle
      });

      // 7. Preparar los datos del pago
      const pago = {
        medioPago,
        montoRecibido: datosVenta.montoRecibido,
        montoEfectivo: datosVenta.montoEfectivo,
        montoNequi: datosVenta.montoNequi
      };

      // 8. Registrar mediante el repositorio actual
      // Compatibilidad con los repositorios de ventas
        const guardar = typeof this.ventaRepository.guardar === 'function'
          ? this.ventaRepository.guardar.bind(this.ventaRepository)
          : this.ventaRepository.guardarVenta.bind(this.ventaRepository);

        const datos = await guardar(
          venta,
          detalle,
          pago
        );

      return Result.ok(datos);

    } catch (error) {
      return Result.fail(
        error.message || 'No se pudo registrar la venta.'
      );
    }
  }

  // Compatibilidad con el Sprint 2 y el controlador actual
  async procesarVenta(datosVenta = {}, usuarioId) {
      return this.registrarVenta(datosVenta, usuarioId);
    }

    async consultarPagosDelDia(
    fecha = new Date().toISOString().slice(0, 10)
  ) {
    try {
      const listar = typeof this.ventaRepository.listarDelDia === 'function'
        ? this.ventaRepository.listarDelDia.bind(this.ventaRepository)
        : this.ventaRepository.listarVentasDelDia.bind(this.ventaRepository);

      return Result.ok(await listar(fecha));

    } catch (error) {
      return Result.fail(error.message);
    }
  }
}
