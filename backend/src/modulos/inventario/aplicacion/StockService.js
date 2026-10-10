import { Result } from '../../../shared/Result.js';

/**
 * Servicio de Aplicación: Movimientos de Stock y Entradas de Mercancía (HE-06)
 * 
 * NOTA DE ARQUITECTURA:
 * La lógica detallada de las entradas y reabastecimiento será completada por Juliana
 * durante el desarrollo de las Historias de Usuario HU-0601, HU-0602 y HU-0603.
 */
export class StockService {
  constructor(productoRepository) {
    this.productoRepository = productoRepository;
  }

  async registrarEntrada(datosEntrada) {
    // TODO: Implementar por Juliana (HU-0601, HU-0602)
    return Result.fail('Endpoint de entradas pendiente de implementación por Juliana');
  }

  async consultarHistorialEntradas(filtros) {
    // TODO: Implementar por Juliana (HU-0603)
    return Result.fail('Endpoint de historial pendiente de implementación por Juliana');
  }
}
