/**
 * Controlador de Autenticación (Cristian)
 */
export class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  async login(req, res) {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Usuario y contraseña son obligatorios'
      });
    }

    const resultado = await this.authService.login(username, password);

    if (resultado.isFailure) {
      return res.status(401).json({
        success: false,
        message: resultado.error
      });
    }

    return res.json({
      success: true,
      data: resultado.getValue()
    });
  }

  async cambiarUsuario(req, res) {
    // TODO: Manejar petición POST /api/auth/switch-user
  }
}
