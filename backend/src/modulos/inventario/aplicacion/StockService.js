import { Result } from '../../../shared/Result.js';
import { TipoMovimientoStock } from '../dominio/MovimientoStock.js';

/**
 * Servicio de Aplicación: Movimientos de Stock y Entradas de Mercancía (HE-06)
 */
export class StockService {
  constructor(productoRepository) {
    this.productoRepository = productoRepository;
  }

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
        productoId,
        tipo: TipoMovimientoStock.ENTRADA,
        cantidad: cantNum,
        costoUnitario: costoUnitario ? Number(costoUnitario) : 0,
        motivo,
        usuarioId
      });

      return Result.ok({
        message: 'Entrada de stock registrada exitosamente',
        data: resultadoTransaccion
      });

    } catch (error) {
      console.error('Error en StockService.registrarEntrada:', error);
      return Result.fail(error.message || 'Error interno al registrar la entrada.');
    }
  }

  async consultarHistorialEntradas(filtros) {
    try {
      // Pasamos los filtros de fecha al repositorio
      const movimientos = await this.productoRepository.listarMovimientos({
        productoId: filtros.productoId,
        limite: filtros.limite || 100, // Traemos más por si acaso
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