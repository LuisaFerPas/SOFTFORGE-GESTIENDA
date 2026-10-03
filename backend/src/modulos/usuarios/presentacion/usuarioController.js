export class UsuarioController {
  constructor(usuarioService) {
    this.usuarioService = usuarioService;
  }

  async registrar(req, res) {
    // TODO: Manejar POST /api/usuarios
  }

  async editar(req, res) {
    // TODO: Manejar PUT /api/usuarios/:id
  }

  async cambiarEstado(req, res) {
    // TODO: Manejar PATCH /api/usuarios/:id/estado
  }

  async listar(req, res) {
    // TODO: Manejar GET /api/usuarios
  }

  /**
   * Maneja PUT /api/usuarios/cambiar-password
   */
  async cambiarPassword(req, res) {
    try {
      const { targetUsername, newPassword } = req.body;
      // req.user viene inyectado por el authMiddleware
      const adminUsername = req.user.username;

      // Llamamos al servicio
      const resultado = await this.usuarioService.cambiarPassword(
        adminUsername,
        targetUsername,
        newPassword
      );

      if (resultado.isFailure) {
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