/**
 * Controlador de Autenticación (Cristian)
 */
export class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  async login(req, res) {
    // TODO: Manejar petición POST /api/auth/login
  }

  async cambiarUsuario(req, res) {
    // TODO: Manejar petición POST /api/auth/switch-user
  }
}
