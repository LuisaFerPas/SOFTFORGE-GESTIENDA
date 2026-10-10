import bcrypt from 'bcryptjs';
import { Result } from '../../../shared/Result.js';

/**
 * Servicio de Aplicación: Gestión de Usuarios y Perfiles (HE-01)
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
   * Cambia la contraseña de un usuario objetivo (Exclusivo Admin 1).
   * @param {string} adminUsername - Usuario que ejecuta la acción (debe ser 'admin1')
   * @param {string} targetUsername - Usuario al que se le cambiará la contraseña
   * @param {string} newPassword - Nueva contraseña en texto plano
   * @returns {Promise<Result>} Resultado de la operación
   */
  async cambiarPassword(adminUsername, targetUsername, newPassword) {
    if (adminUsername !== 'admin1') {
      return Result.fail('Acceso denegado: solo el Administrador 1 puede cambiar contraseñas');
    }

    const usuariosPermitidos = ['admin1', 'admin2', 'vendedor'];
    if (!usuariosPermitidos.includes(targetUsername)) {
      return Result.fail('Usuario destino no válido. Solo se permite admin1, admin2 o vendedor');
    }

    if (!newPassword || newPassword.length < 6) {
      return Result.fail('La contraseña debe tener al menos 6 caracteres');
    }

    const usuarioDestino = await this.usuarioRepository.buscarPorUsername(targetUsername);
    if (!usuarioDestino) {
      return Result.fail(`El usuario ${targetUsername} no existe en el sistema`);
    }

    const saltRounds = 10;
    const hashedPassword = bcrypt.hashSync(newPassword, saltRounds);

    const filasModificadas = await this.usuarioRepository.actualizarPassword(
      targetUsername, 
      hashedPassword
    );

    if (filasModificadas === 0) {
      return Result.fail('Error interno: no se pudo actualizar la contraseña en la base de datos');
    }

    return Result.ok({ 
      message: `Contraseña de ${targetUsername} actualizada exitosamente` 
    });
  }
}
