import { Result } from '../../../shared/Result.js';
import { Venta } from '../dominio/Venta.js';
import { DetalleVenta } from '../dominio/DetalleVenta.js';

const MEDIOS = new Set(['EFECTIVO', 'NEQUI', 'OTRO', 'MIXTO']);
const dineroValido = (valor) => valor !== '' && valor !== null && valor !== undefined &&
  Number.isFinite(Number(valor)) && Number(valor) >= 0;

/** SD-112: reglas de negocio; nunca confiar en el precio enviado por el cliente. */
export class VentaService {
  constructor(ventaRepository, eventBus, stockService = null) {
    this.ventaRepository = ventaRepository;
    this.eventBus = eventBus;
    this.stockService = stockService;
  }

  async registrarVenta(payload = {}, usuarioId) {
    try {
      const uid = Number(usuarioId);
      if (!Number.isSafeInteger(uid) || uid <= 0) return Result.fail('Usuario inválido.');
      if (!Array.isArray(payload?.items) || payload.items.length === 0) {
        return Result.fail('La venta requiere al menos un producto.');
      }
      if (!MEDIOS.has(payload.medioPago)) return Result.fail('Medio de pago no válido.');

      // El mismo producto se registra una sola vez en el detalle de la venta.
      const cantidades = new Map();
      for (const item of payload.items) {
        const id = Number(item?.productoId);
        const cantidad = Number(item?.cantidad);
        if (!Number.isSafeInteger(id) || id <= 0 ||
            !Number.isSafeInteger(cantidad) || cantidad <= 0) {
          return Result.fail('Los IDs y cantidades deben ser enteros positivos.');
        }
        const agrupada = (cantidades.get(id) ?? 0) + cantidad;
        if (!Number.isSafeInteger(agrupada)) return Result.fail('Cantidad de productos fuera de rango.');
        cantidades.set(id, agrupada);
      }

      // Los precios del body (precioUnitario) son informativos; la BD es la fuente autorizada.
      const productos = await this.ventaRepository.obtenerProductosParaVenta([...cantidades.keys()]);
      const porId = new Map(productos.map((p) => [Number(p.id), p]));
      const detalles = [...cantidades].map(([productoId, cantidad]) => {
        const producto = porId.get(productoId);
        if (!producto) throw new Error(`Producto ${productoId} no encontrado o inactivo.`);
        return new DetalleVenta({
          productoId,
          cantidad,
          codigoProducto: producto.codigoInterno,
          descripcion: producto.nombre,
          precioUnitario: producto.precioVentaUnitario
        });
      });

      const venta = new Venta({ usuarioId: uid, items: detalles });
      const total = venta.calcularTotal();
      if (!Number.isFinite(total) || total <= 0) return Result.fail('El total de la venta debe ser mayor a cero.');
      venta.total = total;
      venta.subtotal = total;

      if (payload.medioPago === 'EFECTIVO' &&
          (!dineroValido(payload.montoRecibido) || Number(payload.montoRecibido) < total)) {
        return Result.fail('El monto recibido es insuficiente');
      }
      if (payload.medioPago === 'MIXTO') {
        const { montoEfectivo, montoNequi } = payload;
        if (!dineroValido(montoEfectivo) || !dineroValido(montoNequi) ||
            Number(montoEfectivo) <= 0 || Number(montoNequi) <= 0 ||
            Math.abs(Number(montoEfectivo) + Number(montoNequi) - total) > 0.01) {
          return Result.fail('En pago mixto, el efectivo y Nequi deben ser positivos y sumar el total exacto.');
        }
      }

      const pago = {
        medioPago: payload.medioPago,
        montoRecibido: payload.montoRecibido,
        montoEfectivo: payload.montoEfectivo,
        montoNequi: payload.montoNequi
      };
      const repo = this.ventaRepository;
      const guardar = typeof repo.guardar === 'function' ? repo.guardar.bind(repo)
        : repo.guardarVenta.bind(repo); // compatibilidad con las pruebas del Sprint 2
      // SD-116: la función se ejecuta DESPUÉS de persistir la venta y sus
      // ítems, pero ANTES del COMMIT, dentro de la transacción del repositorio.
      const registrarSalida = this.stockService
        ? (productoId, cantidad, ventaId) =>
            this.stockService.registrarSalida(productoId, cantidad, ventaId, uid)
        : undefined; // compatibilidad con pruebas/repositorios anteriores
      const guardada = await guardar(venta, detalles, pago, registrarSalida);
      return Result.ok(guardada);
    } catch (error) {
      return Result.fail(error.message || 'No se pudo registrar la venta.');
    }
  }

  async procesarVenta(payload = {}, usuarioId) {
    return this.registrarVenta(payload, usuarioId);
  }

  async consultarPagosDelDia(fecha = new Date().toISOString().slice(0, 10)) {
    try {
      const repo = this.ventaRepository;
      const listar = typeof repo.listarDelDia === 'function'
        ? repo.listarDelDia.bind(repo) : repo.listarVentasDelDia.bind(repo);
      return Result.ok(await listar(fecha));
    } catch (error) {
      return Result.fail(error.message);
    }
  }
}
