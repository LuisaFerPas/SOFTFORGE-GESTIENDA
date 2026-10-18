/**
 * Re-export para compatibilidad: apunta a la implementación concreta de infraestructura
 */
export { SQLiteUsuarioRepository as UsuarioRepository } from '../infraestructura/persistencia/SQLiteUsuarioRepository.js';
export { IUsuarioRepository } from './IUsuarioRepository.js';