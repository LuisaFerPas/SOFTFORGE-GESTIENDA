import { Router } from 'express';
import { verifyToken } from '../../usuarios/presentacion/authMiddleware.js';

export function crearVentasRoutes(ventaController) {
  const router = Router();
  router.use(verifyToken);
  
  // Rutas existentes
  router.post('/', (req, res) => ventaController.crearVenta(req, res));
  router.post('/facturas', (req, res) => ventaController.crearFactura(req, res));
  router.get('/pagos-del-dia', (req, res) => ventaController.verPagosDelDia(req, res));
  router.post('/facturas/:consecutivo/reimprimir', (req, res) => ventaController.reimprimirFactura(req, res));
  
  // HU-0301.1: Búsqueda rápida por código de barras / interno
  router.get('/productos/:codigo', (req, res) => ventaController.buscarProductoPorCodigo(req, res));

  // HU-0402.4: Generar factura e imprimir directamente
  router.post('/facturas/imprimir', (req, res) => ventaController.generarEImprimirFactura(req, res));

  return router;
}