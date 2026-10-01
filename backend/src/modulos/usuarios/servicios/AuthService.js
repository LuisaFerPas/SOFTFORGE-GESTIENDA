import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Result } from '../../../shared/Result.js';
import { JWT_SECRET } from '../presentacion/authMiddleware.js';

const MENSAJE_CREDENCIALES_INVALIDAS = 'Usuario o contraseña inválidos';
const DURACION_TOKEN = '8h';

/**
 * Servicio de Autenticación y Sesión (HE-02)
 */
export class AuthService {
  constructor(usuarioRepository) {
    this.usuarioRepository = usuarioRepository;
  }

  async login(username, password) {
    if (!username || !password) {
      return Result.fail(MENSAJE_CREDENCIALES_INVALIDAS);
    }

    const usuario = await this.usuarioRepository.buscarPorUsername(username.trim());
    if (!usuario) {
      return Result.fail(MENSAJE_CREDENCIALES_INVALIDAS);
    }

    const passwordValida = bcrypt.compareSync(password, usuario.passwordHash);
    if (!passwordValida) {
      return Result.fail(MENSAJE_CREDENCIALES_INVALIDAS);
    }

    if (usuario.estado !== 'ACTIVO') {
      return Result.fail('El usuario se encuentra inactivo');
    }

    const token = jwt.sign(
      { id: usuario.id, username: usuario.username, role: usuario.rol },
      JWT_SECRET,
      { expiresIn: DURACION_TOKEN }
    );

    const datosUsuario = {
      id: usuario.id,
      username: usuario.username,
      role: usuario.rol,
      status: usuario.estado
    };

    return Result.ok({ token, user: datosUsuario });
  }

  /**
   * HU-0203: Cambio Rápido de Cajero
   * Autentica un nuevo usuario sin cerrar la sesión del sistema.
   * Reutiliza exactamente la misma lógica de validación que login().
   */
  async cambiarUsuario(nuevoUsername, nuevoPassword) {
    // Reutilizamos login() — valida credenciales, estado ACTIVO y genera nuevo JWT
    return this.login(nuevoUsername, nuevoPassword);
  }
}
