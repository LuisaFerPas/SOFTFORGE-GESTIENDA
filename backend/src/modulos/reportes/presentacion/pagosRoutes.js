import { Router } from 'express';
import { verifyToken } from '../../usuarios/presentacion/authMiddleware.js';
import { PagosService } from '../servicios/PagosService.js';

/**
 * Rutas para listado de pagos del día (HU-0801).
 * Accesible para ADMINISTRADOR y VENDEDOR (con verifyToken).
 * @param {import('node:sqlite').DatabaseSync} db
 */
export function crearPagosRoutes(db) {
  const router = Router();
  const pagosService = new PagosService(db);

  router.use(verifyToken);

  /**
   * GET /api/pagos/dia
   * Retorna la lista de todos los pagos registrados durante el día actual.
   */
  router.get('/dia', async (req, res) => {
    try {
      const data = await pagosService.consultarPagosDelDia();
      return res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Error en GET /api/pagos/dia:', error);
      return res.status(500).json({
        success: false,
        message: 'No se pudieron consultar los pagos del día.'
      });
    }
  });

  return router;
}
