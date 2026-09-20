import { RolUsuario, EstadoUsuario } from './RolUsuario.js';

/**
 * Entidad de Dominio: Usuario
 */
export class Usuario {
  constructor({ id, username, passwordHash, rol, estado, fechaCreacion }) {
    this.id = id;
    this.username = username;
    this.passwordHash = passwordHash;
    this.rol = rol;
    this.estado = estado;
    this.fechaCreacion = fechaCreacion;
  }
}
