import { Router } from 'express';

export function crearAuthRoutes(authController) {
  const router = Router();

  router.post('/login', (req, res) => authController.login(req, res));
  router.post('/switch-user', (req, res) => authController.cambiarUsuario(req, res));

  return router;
}
