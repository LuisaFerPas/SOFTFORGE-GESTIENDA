/**
 * Controlador de Estadísticas y Reportes
 */
export class ReporteController {
  constructor(estadisticasService) {
    this.estadisticasService = estadisticasService;
  }

  async verResumen(req, res) { /* TODO */ }
  async verGanancias(req, res) { /* TODO */ }
  async verPorCategoria(req, res) { /* TODO */ }

  /**
   * HU-0902.1: Maneja GET /api/reportes/productos
   */
  async verDesempenioProductos(req, res) {
    try {
      const data = await this.estadisticasService.consultarDesempenioProductos();
      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('Error en ReporteController.verDesempenioProductos:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener el desempeño de productos.' });
    }
  }
}