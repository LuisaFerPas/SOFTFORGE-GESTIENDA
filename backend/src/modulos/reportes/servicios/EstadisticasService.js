/**
 * Servicio de Estadísticas y Reportes (HE-08, HE-09 - Exclusivo Administrador)
 */
export class EstadisticasService {
  constructor(db) {
    this.db = db;
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