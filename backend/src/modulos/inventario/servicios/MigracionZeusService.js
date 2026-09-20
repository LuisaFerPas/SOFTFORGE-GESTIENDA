/**
 * Servicio de Importación de Datos Legados desde Zeus 0.1
 */
export class MigracionZeusService {
  constructor(productoRepository) {
    this.productoRepository = productoRepository;
  }

  async importarDesdeArchivo(rutaArchivo) {
    // TODO: Parsear CSV/Excel e insertar en SQLite
  }
}
