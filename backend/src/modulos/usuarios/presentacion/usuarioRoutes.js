import { Router } from 'express';
import { verifyToken, requireRole } from './authMiddleware.js';

export function crearUsuarioRoutes(usuarioController) {
  const router = Router();

  // Rutas protegidas exclusivas para Administrador
  router.use(verifyToken, requireRole(['ADMINISTRADOR']));

  router.post('/', (req, res) => usuarioController.registrar(req, res));
  router.get('/', (req, res) => usuarioController.listar(req, res));
  router.put('/:id', (req, res) => usuarioController.editar(req, res));
  router.patch('/:id/estado', (req, res) => usuarioController.cambiarEstado(req, res));

  return router;
}
