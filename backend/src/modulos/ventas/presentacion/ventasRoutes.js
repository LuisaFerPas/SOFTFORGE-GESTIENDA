import { Router } from 'express';
import { verifyToken } from '../../usuarios/presentacion/authMiddleware.js';

export function crearVentasRoutes(ventaController) {
  const router = Router();
  router.use(verifyToken);
  router.post('/', (req, res) => ventaController.crearVenta(req, res));
  // SD-120: router.use(verifyToken) protege también esta operación.
  router.post('/facturas', (req, res) => ventaController.crearFactura(req, res));
  router.get('/pagos-del-dia', (req, res) => ventaController.verPagosDelDia(req, res));
  // SD-122: debe ir protegida por el middleware JWT del router.
  router.post('/facturas/:consecutivo/reimprimir', (req, res) => ventaController.reimprimirFactura(req, res));
  return router;
}
