/**
 * Repositorio de persistencia para el módulo de Usuarios (SQLite).
 * Traduce entre las columnas de la tabla `users` y la entidad de dominio Usuario.
 */
export class UsuarioRepository {
  constructor(db) {
    this.db = db;
  }

  _mapearFila(fila) {
    if (!fila) return null;
    return {
      id: fila.id,
      username: fila.username,
      passwordHash: fila.password_hash,
      rol: fila.role,
      estado: fila.status,
      fechaCreacion: fila.created_at
    };
  }

  async buscarPorId(id) {
    const fila = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return this._mapearFila(fila);
  }

  async buscarPorUsername(username) {
    const fila = this.db
      .prepare(`SELECT * FROM users WHERE username COLLATE NOCASE = ?`)
      .get(username);
    return this._mapearFila(fila);
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
    return filas.map((fila) => this._mapearFila(fila));
  }

  async guardar(usuario) {
    const info = this.db
      .prepare(`
        INSERT INTO users (username, password_hash, role, status)
        VALUES (?, ?, ?, ?)
      `)
      .run(
        usuario.username,
        usuario.passwordHash,
        usuario.rol,
        usuario.estado || 'ACTIVO'
      );
    return info.lastInsertRowid;
  }

  async actualizar(usuario) {
    const info = this.db
      .prepare(`
        UPDATE users
        SET username = ?, password_hash = ?, role = ?, status = ?
        WHERE id = ?
      `)
      .run(
        usuario.username,
        usuario.passwordHash,
        usuario.rol,
        usuario.estado,
        usuario.id
      );
    return info.changes;
  }

  /**
   * Actualiza únicamente la contraseña (hasheada) de un usuario.
   * @param {string} username - Nombre de usuario destino
   * @param {string} hashedPassword - Contraseña ya encriptada con bcrypt
   * @returns {Promise<number>} Número de filas modificadas (1 si fue exitoso, 0 si no)
   */
  async actualizarPassword(username, hashedPassword) {
    const info = this.db
      .prepare(`
        UPDATE users
        SET password_hash = ?
        WHERE username COLLATE NOCASE = ?
      `)
      .run(hashedPassword, username);
    
    return info.changes;
  }
}