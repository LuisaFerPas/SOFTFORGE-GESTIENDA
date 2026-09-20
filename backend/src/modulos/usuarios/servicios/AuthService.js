/**
 * Servicio de Autenticación y Sesión (HE-02)
 */
export class AuthService {
  constructor(usuarioRepository) {
    this.usuarioRepository = usuarioRepository;
  }

  async login(username, password) {
    // TODO: Implementar validación y retorno de token
  }

  async cambiarUsuario(nuevoUsername, nuevoPassword) {
    // TODO: Implementar cambio rápido de cajero (HU-0303)
  }
}
