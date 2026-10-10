/**
 * Re-export para compatibilidad: apunta a la implementación concreta de infraestructura
 */
export { SQLiteProductoRepository as ProductoRepository } from '../infraestructura/persistencia/SQLiteProductoRepository.js';
export { IProductoRepository } from './IProductoRepository.js';
