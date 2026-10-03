import express from 'express';
import { verifyToken } from './authMiddleware.js';

export const crearUsuarioRoutes = (usuarioController) => {
  const router = express.Router();

  // RUTA: PUT /api/usuarios/cambiar-password
  router.put('/cambiar-password', verifyToken, (req, res) =>
    usuarioController.cambiarPassword(req, res)
  );

  return router;
};