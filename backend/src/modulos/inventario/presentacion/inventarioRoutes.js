import { Router } from 'express';
import { verifyToken, requireRole } from '../../usuarios/presentacion/authMiddleware.js';

export function crearInventarioRoutes(productoController) {
  const router = Router();

  router.use(verifyToken);

  router.get('/productos', (req, res) => productoController.listar(req, res));
  router.get('/stock-bajo', requireRole(['ADMINISTRADOR']), (req, res) => productoController.obtenerStockBajo(req, res));

  // Rutas exclusivas de Administrador
  router.post('/productos', requireRole(['ADMINISTRADOR']), (req, res) => productoController.registrar(req, res));
  router.put('/productos/:id', requireRole(['ADMINISTRADOR']), (req, res) => productoController.editar(req, res));
  router.delete('/productos/:id', requireRole(['ADMINISTRADOR']), (req, res) => productoController.eliminar(req, res));
  router.post('/stock/entradas', requireRole(['ADMINISTRADOR']), (req, res) => productoController.registrarEntrada(req, res));

  return router;
}
