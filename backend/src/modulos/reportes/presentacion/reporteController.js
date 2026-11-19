/**
 * Controlador de Estadísticas y Reportes
 */
export class ReporteController {
  constructor(estadisticasService) {
    this.estadisticasService = estadisticasService;
  }

  /** HU-0903.1: Endpoint solo para administradores (middleware de rutas). */
  async verResumenFinanciero(req, res) {
    try {
      const data = await this.estadisticasService.consultarResumenFinanciero(req.query.periodo || 'MES');
      return res.status(200).json({ success: true, data });
    } catch (error) {
      if (error instanceof RangeError) return res.status(400).json({ success: false, message: error.message });
      console.error('Error en ReporteController.verResumenFinanciero:', error);
      return res.status(500).json({ success: false, message: 'No se pudo obtener el resumen financiero.' });
    }
  }

  async verResumen(req, res) { /* TODO */ }
  async verGanancias(req, res) { /* TODO */ }
  async verPorCategoria(req, res) { /* TODO */ }

  /**
   * HU-0901.1: Maneja GET /api/estadisticas/ventas?periodo=DIA|SEMANA|MES|AÑO
   */
  async verVentasPorPeriodo(req, res) {
    try {
      const periodo = req.query.periodo || 'MES';
      const data = await this.estadisticasService.consultarVentasPorPeriodo(periodo);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('Error en ReporteController.verVentasPorPeriodo:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener las ventas por período.' });
    }
  }

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