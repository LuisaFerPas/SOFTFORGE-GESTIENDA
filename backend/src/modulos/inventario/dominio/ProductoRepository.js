/**
 * Contrato de persistencia para Productos e Inventario
 */
export class ProductoRepository {
  async buscarPorId(id) { throw new Error('Método no implementado'); }
  async buscarPorCodigo(codigo) { throw new Error('Método no implementado'); }
  async buscarPorNombre(nombre) { throw new Error('Método no implementado'); }
  async listarTodos(filtros) { throw new Error('Método no implementado'); }
  async guardar(producto) { throw new Error('Método no implementado'); }
  async actualizar(producto) { throw new Error('Método no implementado'); }
  async eliminar(id) { throw new Error('Método no implementado'); }
  async registrarMovimiento(movimiento) { throw new Error('Método no implementado'); }
}
