// Archivo: backend/src/modulos/usuarios/presentacion/usuarioController.js
import { UsuarioService } from '../servicios/UsuarioService.js';
import { UsuarioRepository } from '../dominio/UsuarioRepository.js';
import { db } from '../../../infraestructura/database/conexion.js';

export class UsuarioController {
  constructor(usuarioService) {
    this.usuarioService = usuarioService;
  }

  async cambiarPassword(req, res) {
    try {
      const { targetUsername, newPassword } = req.body;
      // req.user viene inyectado por el authMiddleware después de verificar el JWT
      const adminUsername = req.user.username;

      // Llamamos al servicio
      const resultado = await this.usuarioService.cambiarPassword(
        adminUsername,
        targetUsername,
        newPassword
      );

      if (resultado.isFailure) {
        // Si es error de permisos, 403. Si es error de datos, 400.
        const status = resultado.error.includes('Acceso denegado') ? 403 : 400;
        return res.status(status).json({ message: resultado.error });
      }

      return res.status(200).json(resultado.getValue());
    } catch (error) {
      console.error('Error en usuarioController.cambiarPassword:', error);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
}