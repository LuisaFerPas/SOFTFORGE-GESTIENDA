/**
 * Servicio de Gestión de Usuarios y Perfiles (HE-01)
 */
export class UsuarioService {
  constructor(usuarioRepository) {
    this.usuarioRepository = usuarioRepository;
  }

  async registrarUsuario(datosUsuario) {
    // TODO: Implementar registro con validaciones (HU-0101)
  }

  async editarUsuario(id, datosActualizados) {
    // TODO: Implementar edición de datos (HU-0102)
  }

  async cambiarEstadoUsuario(id, nuevoEstado, usuarioSolicitanteId) {
    // TODO: Implementar activación/desactivación sin autodesactivación (HU-0103)
  }

  async listarUsuarios(filtros) {
    // TODO: Implementar listado con filtros por rol y estado (HU-0104)
  }
}
