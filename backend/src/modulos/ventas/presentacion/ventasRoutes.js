import { Router } from 'express';
import { verifyToken } from '../../usuarios/presentacion/authMiddleware.js';

export function crearVentasRoutes(ventaController) {
  const router = Router();

  router.use(verifyToken);

  router.post('/', (req, res) => ventaController.crearVenta(req, res));
  router.get('/pagos-del-dia', (req, res) => ventaController.verPagosDelDia(req, res));
  router.post('/:id/reimprimir', (req, res) => ventaController.reimprimirFactura(req, res));

  return router;
}
