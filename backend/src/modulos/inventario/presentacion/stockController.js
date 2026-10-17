import { StockService } from '../aplicacion/StockService.js';

export class StockController {
  constructor(stockService) {
    this.stockService = stockService;
  }

  /**
   * Maneja POST /api/inventario/stock/entrada (HU-0601)
   */
  async registrarEntrada(req, res) {
    try {
      const datosEntrada = req.body;
      // req.user viene del authMiddleware
      const usuarioId = req.user ? req.user.id : null; 

      const resultado = await this.stockService.registrarEntrada(datosEntrada, usuarioId);

      if (resultado.isFailure) {
        return res.status(400).json({ message: resultado.error });
      }

      return res.status(201).json(resultado.getValue());
    } catch (error) {
      console.error('Error en StockController.registrarEntrada:', error);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  /**
   * Maneja GET /api/inventario/stock/entradas (HU-0603)
   */
  async listarEntradas(req, res) {
    try {
      const filtros = {
        productoId: req.query.productoId,
        limite: req.query.limite
      };

      const resultado = await this.stockService.consultarHistorialEntradas(filtros);

      if (resultado.isFailure) {
        return res.status(400).json({ message: resultado.error });
      }

      return res.status(200).json(resultado.getValue());
    } catch (error) {
      console.error('Error en StockController.listarEntradas:', error);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
}