import express from 'express';
import { cambiarPassword } from './usuarioController.js';
import { verifyToken } from './authMiddleware.js'; // Su middleware existente

const router = express.Router();

// RUTA: PUT /api/usuarios/cambiar-password
// El verifyToken se ejecuta ANTES del controlador para asegurar que el usuario esté logueado
router.put('/cambiar-password', verifyToken, cambiarPassword);

export default router;