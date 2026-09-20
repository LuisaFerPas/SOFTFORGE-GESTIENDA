import { Router } from 'express';
import { verifyToken, requireRole } from '../../usuarios/presentacion/authMiddleware.js';

export function crearReportesRoutes(reporteController) {
  const router = Router();

  // Exclusivo para Administrador (HU-0105 / RS-03)
  router.use(verifyToken, requireRole(['ADMINISTRADOR']));

  router.get('/resumen', (req, res) => reporteController.verResumen(req, res));
  router.get('/ganancias', (req, res) => reporteController.verGanancias(req, res));
  router.get('/categorias', (req, res) => reporteController.verPorCategoria(req, res));

  return router;
}
