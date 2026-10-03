import bcrypt from 'bcryptjs';
import { Result } from '../../../shared/Result.js';

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

  /**
   * Cambia la contraseña de un usuario objetivo.
   * @param {string} adminUsername - Usuario que ejecuta la acción (debe ser 'admin1')
   * @param {string} targetUsername - Usuario al que se le cambiará la contraseña
   * @param {string} newPassword - Nueva contraseña en texto plano
   * @returns {Promise<Result>} Resultado de la operación
   */
  async cambiarPassword(adminUsername, targetUsername, newPassword) {
    // 1. Regla de negocio estricta: Solo el Administrador 1 puede hacer esto
    if (adminUsername !== 'admin1') {
      return Result.fail('Acceso denegado: solo el Administrador 1 puede cambiar contraseñas');
    }

    // 2. Validar que el usuario destino esté en la lista permitida
    const usuariosPermitidos = ['admin1', 'admin2', 'vendedor'];
    if (!usuariosPermitidos.includes(targetUsername)) {
      return Result.fail('Usuario destino no válido. Solo se permite admin1, admin2 o vendedor');
    }

    // 3. Validación de longitud mínima (por seguridad, aunque el frontend también valide)
    if (!newPassword || newPassword.length < 6) {
      return Result.fail('La contraseña debe tener al menos 6 caracteres');
    }

    // 4. Verificar que el usuario destino realmente exista en la base de datos
    // (Usamos await porque tu repositorio usa async/await internamente)
    const usuarioDestino = await this.usuarioRepository.buscarPorUsername(targetUsername);
    if (!usuarioDestino) {
      return Result.fail(`El usuario ${targetUsername} no existe en el sistema`);
    }

    // 5. Hashear la nueva contraseña 
    const saltRounds = 10;
    const hashedPassword = bcrypt.hashSync(newPassword, saltRounds);

    // 6. Persistir el cambio en el repositorio (SQLite)
    // Tu repositorio devuelve el número de filas modificadas (info.changes)
    const filasModificadas = await this.usuarioRepository.actualizarPassword(
      targetUsername, 
      hashedPassword
    );

    // Si no se modificó ninguna fila, el usuario no existía o hubo un error
    if (filasModificadas === 0) {
      return Result.fail('Error interno: no se pudo actualizar la contraseña en la base de datos');
    }

    // 7. Retornar éxito
    return Result.ok({ 
      message: `Contraseña de ${targetUsername} actualizada exitosamente` 
    });
  }
}