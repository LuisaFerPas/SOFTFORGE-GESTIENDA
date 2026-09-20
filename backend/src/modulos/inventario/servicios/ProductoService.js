/**
 * Servicio de Catálogo de Productos (Juliana)
 */
export class ProductoService {
  constructor(productoRepository) {
    this.productoRepository = productoRepository;
  }

  async registrarProducto(datos) {
    // TODO: Implementar registro con 5 categorías fijas
  }

  async editarProducto(id, datos) {
    // TODO: Implementar edición
  }

  async eliminarProducto(id) {
    // TODO: Implementar eliminación
  }

  async buscarProductos(criterio) {
    // TODO: Búsqueda por código o nombre
  }
}
