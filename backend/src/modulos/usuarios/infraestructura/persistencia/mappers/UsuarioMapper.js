import { Usuario } from '../../../dominio/Usuario.js';

/**
 * Data Mapper: Traduce entre el esquema relacional de SQLite (tabla `users`) y la Entidad de Dominio `Usuario`.
 * Aísla completamente el Dominio de los nombres de columnas de base de datos.
 */
export class UsuarioMapper {
  /**
   * Convierte un registro de SQLite a una instancia de Dominio `Usuario`.
   * @param {Object} filaSql 
   * @returns {Usuario|null}
   */
  static aDominio(filaSql) {
    if (!filaSql) return null;
    return new Usuario({
      id: filaSql.id,
      username: filaSql.username,
      passwordHash: filaSql.password_hash,
      rol: filaSql.role,
      estado: filaSql.status,
      fechaCreacion: filaSql.created_at
    });
  }

  /**
   * Convierte una entidad `Usuario` a formato de parámetros para persistencia SQL.
   * @param {Usuario} usuario 
   * @returns {Object}
   */
  static aPersistencia(usuario) {
    return {
      id: usuario.id,
      username: usuario.username,
      password_hash: usuario.passwordHash,
      role: usuario.rol,
      status: usuario.estado,
      created_at: usuario.fechaCreacion
    };
  }
}
