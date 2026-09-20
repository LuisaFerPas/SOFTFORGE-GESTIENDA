/**
 * Controlador de Usuarios (Juliana & Juan Camilo)
 */
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
}
