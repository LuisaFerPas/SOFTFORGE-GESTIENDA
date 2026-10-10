import { RolUsuario, EstadoUsuario } from './RolUsuario.js';

/**
 * Entidad de Dominio: Usuario (DDD Puro)
 * Encapsula las reglas de acceso, roles y estados de los usuarios del sistema.
 */
export class Usuario {
  constructor({
    id = null,
    username,
    passwordHash,
    rol = RolUsuario.VENDEDOR,
    estado = EstadoUsuario.ACTIVO,
    fechaCreacion = null
  }) {
    this._validarInvariantes({ username, passwordHash, rol, estado });

    this.id = id;
    this.username = String(username).trim();
    this.passwordHash = passwordHash;
    this.rol = rol;
    this.estado = estado;
    this.fechaCreacion = fechaCreacion;
  }

  _validarInvariantes({ username, passwordHash, rol, estado }) {
    if (!username || !String(username).trim()) {
      throw new Error('El nombre de usuario es obligatorio.');
    }
    if (!passwordHash) {
      throw new Error('El hash de la contraseña es obligatorio.');
    }
    if (!Object.values(RolUsuario).includes(rol)) {
      throw new Error(`Rol inválido: "${rol}".`);
    }
    if (!Object.values(EstadoUsuario).includes(estado)) {
      throw new Error(`Estado inválido: "${estado}".`);
    }
  }

  esAdministrador() {
    return this.rol === RolUsuario.ADMINISTRADOR;
  }

  esAdminPrincipal() {
    return this.username.toLowerCase() === 'admin1';
  }

  estaActivo() {
    return this.estado === EstadoUsuario.ACTIVO;
  }

  desactivar() {
    this.estado = EstadoUsuario.INACTIVO;
  }

  activar() {
    this.estado = EstadoUsuario.ACTIVO;
  }

  aObjetoPlano() {
    return {
      id: this.id,
      username: this.username,
      rol: this.rol,
      estado: this.estado,
      fechaCreacion: this.fechaCreacion
    };
  }
}
