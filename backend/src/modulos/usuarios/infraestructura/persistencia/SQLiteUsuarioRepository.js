import { IUsuarioRepository } from '../../dominio/IUsuarioRepository.js';
import { UsuarioMapper } from './mappers/UsuarioMapper.js';

/**
 * Implementación de persistencia para el módulo de Usuarios usando SQLite nativo (`node:sqlite`).
 * Cumple con el contrato `IUsuarioRepository` y utiliza `UsuarioMapper` para desacoplar el Dominio.
 */
export class SQLiteUsuarioRepository extends IUsuarioRepository {
  constructor(db) {
    super();
    this.db = db;
  }

  async buscarPorId(id) {
    const fila = this.db.prepare('SELECT * FROM users WHERE id = ?').get(Number(id));
    return UsuarioMapper.aDominio(fila);
  }

  async buscarPorUsername(username) {
    if (!username) return null;
    const fila = this.db
      .prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE')
      .get(String(username).trim());
    return UsuarioMapper.aDominio(fila);
  }

  async listarTodos(filtros = {}) {
    const condiciones = [];
    const parametros = [];

    if (filtros.rol) {
      condiciones.push('role = ?');
      parametros.push(filtros.rol);
    }
    if (filtros.estado) {
      condiciones.push('status = ?');
      parametros.push(filtros.estado);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const filas = this.db
      .prepare(`SELECT * FROM users ${where} ORDER BY created_at ASC`)
      .all(...parametros);

    return filas.map((fila) => UsuarioMapper.aDominio(fila));
  }

  async guardar(usuario) {
    const datos = UsuarioMapper.aPersistencia(usuario);
    const info = this.db
      .prepare(`
        INSERT INTO users (username, password_hash, role, status)
        VALUES (?, ?, ?, ?)
      `)
      .run(datos.username, datos.password_hash, datos.role, datos.status || 'ACTIVO');

    return Number(info.lastInsertRowid);
  }

  async actualizar(usuario) {
    const datos = UsuarioMapper.aPersistencia(usuario);
    const info = this.db
      .prepare(`
        UPDATE users
        SET username = ?, password_hash = ?, role = ?, status = ?
        WHERE id = ?
      `)
      .run(datos.username, datos.password_hash, datos.role, datos.status, datos.id);

    return Number(info.changes);
  }

  /**
   * Actualiza únicamente la contraseña (hasheada con bcrypt) de un usuario.
   */
  async actualizarPassword(username, hashedPassword) {
    const info = this.db
      .prepare(`
        UPDATE users
        SET password_hash = ?
        WHERE username = ? COLLATE NOCASE
      `)
      .run(hashedPassword, String(username).trim());

    return Number(info.changes);
  }
}
