/**
 * Contrato / Interfaz de Persistencia para el Módulo de Usuarios (Capa de Dominio).
 * Define las operaciones que el dominio requiere sin acoplarse a ninguna tecnología de base de datos.
 */
export class IUsuarioRepository {
  async buscarPorId(id) {
    throw new Error('Método no implementado');
  }

  async buscarPorUsername(username) {
    throw new Error('Método no implementado');
  }

  async listarTodos(filtros = {}) {
    throw new Error('Método no implementado');
  }

  async guardar(usuario) {
    throw new Error('Método no implementado');
  }

  async actualizar(usuario) {
    throw new Error('Método no implementado');
  }

  async actualizarPassword(username, hashedPassword) {
    throw new Error('Método no implementado');
  }
}
