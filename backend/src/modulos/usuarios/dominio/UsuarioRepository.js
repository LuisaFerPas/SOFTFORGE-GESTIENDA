/**
 * Contrato de persistencia para el módulo de Usuarios
 */
export class UsuarioRepository {
  async buscarPorId(id) { throw new Error('Método no implementado'); }
  async buscarPorUsername(username) { throw new Error('Método no implementado'); }
  async listarTodos(filtros) { throw new Error('Método no implementado'); }
  async guardar(usuario) { throw new Error('Método no implementado'); }
  async actualizar(usuario) { throw new Error('Método no implementado'); }
}
