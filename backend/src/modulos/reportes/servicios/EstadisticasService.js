/**
 * Servicio de Estadísticas y Reportes (HE-08, HE-09 - Exclusivo Administrador)
 */
export class EstadisticasService {
  constructor(db) {
    this.db = db;
  }

  /**
   * HU-0901.2: Consulta total de ventas, número de transacciones y ticket promedio por período.
   * @param {'DIA'|'SEMANA'|'MES'|'AÑO'} periodo
   * @returns {Promise<{
   *   periodo: string,
   *   totalVentas: number,
   *   numeroTransacciones: number,
   *   ticketPromedio: number,
   *   fechaInicio: string
   * }>}
   */
  async consultarVentasPorPeriodo(periodo = 'MES') {
    try {
      const periodoNorm = String(periodo || 'MES').toUpperCase().trim();

      // Calcular fecha inicial en base a UTC-5 (Colombia)
      let rowFecha;
      switch (periodoNorm) {
        case 'DIA':
          rowFecha = this.db.prepare("SELECT date('now', '-5 hours') AS fecha").get();
          break;
        case 'SEMANA':
          // Últimos 7 días
          rowFecha = this.db.prepare("SELECT date('now', '-5 hours', '-6 days') AS fecha").get();
          break;
        case 'AÑO':
          rowFecha = this.db.prepare("SELECT date('now', '-5 hours', 'start of year') AS fecha").get();
          break;
        case 'MES':
        default:
          rowFecha = this.db.prepare("SELECT date('now', '-5 hours', 'start of month') AS fecha").get();
          break;
      }

      const fechaInicio = rowFecha?.fecha || '';

      const query = `
        SELECT 
          COUNT(*) AS numeroTransacciones,
          COALESCE(SUM(total), 0) AS totalVentas
        FROM sales
        WHERE date(created_at, '-5 hours') >= ?
      `;

      const fila = this.db.prepare(query).get(fechaInicio);

      const totalVentas = Math.round(((Number(fila?.totalVentas) || 0) + Number.EPSILON) * 100) / 100;
      const numeroTransacciones = Number(fila?.numeroTransacciones) || 0;
      const ticketPromedio = numeroTransacciones > 0
        ? Math.round(((totalVentas / numeroTransacciones) + Number.EPSILON) * 100) / 100
        : 0;

      return {
        periodo: periodoNorm,
        fechaInicio,
        totalVentas,
        numeroTransacciones,
        ticketPromedio
      };
    } catch (error) {
      console.error('Error en consultarVentasPorPeriodo:', error);
      throw new Error('No se pudo obtener el reporte de ventas por período.');
    }
  }

  async obtenerResumenVentasPeriodo(periodo) { /* TODO */ }
  async obtenerGananciaPorProducto() { /* TODO: (P.Venta - P.Compra) * Cantidad */ }
  async obtenerVentasPorCategoria() { /* TODO */ }
  async obtenerTotalesPorMedioPago() { /* TODO */ }

  /**
   * HU-0902.2: Consultar desempeño de productos (Top 10, Categorías, Alertas y Ganancias)
   */
  async consultarDesempenioProductos() {
    try {
      // 1. TOP 10 Productos más vendidos por cantidad
      const masVendidos = this.db.prepare(`
        SELECT 
          p.nombre, 
          SUM(si.cantidad) as total_unidades, 
          SUM(si.subtotal) as ingreso_total
        FROM sale_items si
        JOIN products p ON si.producto_id = p.id
        GROUP BY p.id
        ORDER BY total_unidades DESC
        LIMIT 10
      `).all();

      // 2. Ventas por categoría
      const porCategoria = this.db.prepare(`
        SELECT 
          p.categoria, 
          SUM(si.cantidad) as total_unidades, 
          SUM(si.subtotal) as ingreso_total
        FROM sale_items si
        JOIN products p ON si.producto_id = p.id
        GROUP BY p.categoria
        ORDER BY ingreso_total DESC
      `).all();

      // 3. Alertas de Stock (Agotados y Bajos)
      const alertasStock = this.db.prepare(`
        SELECT nombre, stock_actual, stock_minimo_alerta, 
        CASE 
          WHEN stock_actual <= 0 THEN 'AGOTADO'
          ELSE 'STOCK BAJO'
        END as estado
        FROM products
        WHERE activo = 1 AND stock_actual <= stock_minimo_alerta
        ORDER BY stock_actual ASC
      `).all();

      // 4. Ganancias por producto
      const ganancias = this.db.prepare(`
        SELECT 
          p.nombre,
          (p.precio_venta_unitario - p.costo_compra) as margen_unitario,
          SUM(si.cantidad) as cantidad_vendida,
          SUM((p.precio_venta_unitario - p.costo_compra) * si.cantidad) as ganancia_total
        FROM sale_items si
        JOIN products p ON si.producto_id = p.id
        GROUP BY p.id
        ORDER BY ganancia_total DESC
      `).all();

      return {
        masVendidos,
        porCategoria,
        alertasStock,
        ganancias
      };
    } catch (error) {
      console.error('Error en consultarDesempenioProductos:', error);
      throw new Error('No se pudo obtener el desempeño de productos.');
    }
  }
}