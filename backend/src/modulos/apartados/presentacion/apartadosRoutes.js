import { Router } from 'express';
import { verifyToken } from '../../usuarios/presentacion/authMiddleware.js';

export function crearApartadosRoutes(apartadoController) {
  const router = Router();

  router.use(verifyToken);

  router.post('/', (req, res) => apartadoController.crear(req, res));
  router.get('/', (req, res) => apartadoController.listar(req, res));
  router.post('/:id/abonos', (req, res) => apartadoController.abonar(req, res));
  router.patch('/:id/cancelar', (req, res) => apartadoController.cancelar(req, res));

  return router;
}
