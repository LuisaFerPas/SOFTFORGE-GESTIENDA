import { Result } from '../../../shared/Result.js';
import { TipoMovimientoStock } from '../dominio/MovimientoStock.js';

/**
 * Servicio de aplicación: movimientos de stock.
 * SD-116: las salidas de venta se delegan al repositorio compatible con
 * transacción externa; StockService NO inicia/termina la transacción de ventas.
 */
export class StockService {
  constructor(productoRepository) {
    this.productoRepository = productoRepository;
  }

  /**
   * SD-116: llamado por VentaService dentro de SQLiteVentaRepository.guardar().
   * Es deliberadamente síncrono porque node:sqlite utiliza DatabaseSync y
   * no debe ceder el control del event loop dentro de la transacción.
   */
  registrarSalida(productoId, cantidad, ventaId, usuarioId = null) {
    try {
      const id = Number(productoId);
      const unidades = Number(cantidad);
      const idVenta = Number(ventaId);
      if (!Number.isSafeInteger(id) || id <= 0 ||
          !Number.isSafeInteger(unidades) || unidades <= 0 ||
          !Number.isSafeInteger(idVenta) || idVenta <= 0) {
        return Result.fail('Producto, cantidad o venta inválidos para registrar la salida.');
      }
      if (typeof this.productoRepository.registrarSalidaVenta !== 'function') {
        return Result.fail('El repositorio de salidas de venta no está configurado.');
      }
      const salida = this.productoRepository.registrarSalidaVenta(id, unidades, idVenta, usuarioId);
      return Result.ok(salida);
    } catch (error) {
      return Result.fail(error.message || 'No se pudo registrar la salida del inventario.');
    }
  }

  // Funcionalidades anteriores del módulo de inventario, preservadas.
  async registrarEntrada(datosEntrada, usuarioId) {
    try {
      const { productoId, cantidad, costoUnitario, motivo } = datosEntrada;
      if (!productoId) return Result.fail('El ID del producto es obligatorio.');
      const cantNum = Number(cantidad);
      if (isNaN(cantNum) || cantNum <= 0 || !Number.isInteger(cantNum)) {
        return Result.fail('La cantidad ingresada debe ser un número entero positivo mayor a cero.');
      }
      if (costoUnitario !== undefined && (isNaN(Number(costoUnitario)) || Number(costoUnitario) < 0)) {
        return Result.fail('El costo de compra no puede ser un número negativo.');
      }
      const resultadoTransaccion = await this.productoRepository.registrarMovimientoEnTransaccion({
        productoId, tipo: TipoMovimientoStock.ENTRADA, cantidad: cantNum,
        costoUnitario: costoUnitario ? Number(costoUnitario) : 0, motivo, usuarioId
      });
      return Result.ok({ message: 'Entrada de stock registrada exitosamente', data: resultadoTransaccion });
    } catch (error) {
      console.error('Error en StockService.registrarEntrada:', error);
      return Result.fail(error.message || 'Error interno al registrar la entrada.');
    }
  }

  async consultarHistorialEntradas(filtros) {
    try {
      const movimientos = await this.productoRepository.listarMovimientos({
        productoId: filtros.productoId,
        limite: filtros.limite || 100,
        fechaInicio: filtros.fechaInicio,
        fechaFin: filtros.fechaFin
      });
      const entradas = movimientos.filter(m => m.tipo === TipoMovimientoStock.ENTRADA);
      return Result.ok(entradas);
    } catch (error) {
      console.error('Error en StockService.consultarHistorialEntradas:', error);
      return Result.fail('Error al consultar el historial de entradas.');
    }
  }
}
