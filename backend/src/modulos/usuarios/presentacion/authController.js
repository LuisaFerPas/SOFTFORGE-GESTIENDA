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

  /**
   * HU-0203: Cambio Rápido de Cajero
   * POST /api/auth/switch-user
   * Body: { username, password }
   */
  async cambiarUsuario(req, res) {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Usuario y contraseña son obligatorios'
      });
    }

    const resultado = await this.authService.cambiarUsuario(username, password);

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
}
