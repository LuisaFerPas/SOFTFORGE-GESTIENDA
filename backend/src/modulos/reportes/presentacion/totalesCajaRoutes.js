import { Router } from 'express';
import { verifyToken } from '../../usuarios/presentacion/authMiddleware.js';
import { TotalesCajaService } from '../servicios/TotalesCajaService.js';

/**
 * Rutas de totales de caja del día (HU-0802).
 * Se monta en /api/pagos/dia/totales.
 * @param {import('node:sqlite').DatabaseSync} db
 */
export function crearTotalesCajaRoutes(db) {
  const router = Router();
  const totalesCajaService = new TotalesCajaService(db);

  router.use(verifyToken);

  router.get('/', async (req, res) => {
    try {
      const data = await totalesCajaService.totalesDelDia();
      return res.json({ success: true, data });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'No se pudieron calcular los totales de caja.'
      });
    }
  });

  return router;
}
