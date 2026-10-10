/**
 * Contrato / Interfaz de Persistencia para el Módulo de Inventario (Capa de Dominio).
 * Define las operaciones que el negocio de Don Mati requiere sobre el inventario,
 * manteniendo el Dominio 100% agnóstico a la tecnología de base de datos.
 */
export class IProductoRepository {
  async buscarPorId(id) {
    throw new Error('Método no implementado');
  }

  async buscarPorCodigoInterno(codigoInterno) {
    throw new Error('Método no implementado');
  }

  async buscarPorCodigoBarras(codigoBarras) {
    throw new Error('Método no implementado');
  }

  async buscarPorCodigo(codigo) {
    throw new Error('Método no implementado');
  }

  async listarTodos(filtros = {}) {
    throw new Error('Método no implementado');
  }

  async guardar(producto) {
    throw new Error('Método no implementado');
  }

  async actualizar(producto) {
    throw new Error('Método no implementado');
  }

  async desactivar(id) {
    throw new Error('Método no implementado');
  }

  async registrarMovimientoEnTransaccion(datosMovimiento) {
    throw new Error('Método no implementado');
  }

  async listarMovimientos(filtros = {}) {
    throw new Error('Método no implementado');
  }
}
