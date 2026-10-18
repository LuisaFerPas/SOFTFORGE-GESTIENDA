import { Producto } from '../../../dominio/Producto.js';

/**
 * Data Mapper: Traduce entre el esquema relacional de SQLite (tabla `products`) y la Entidad `Producto`.
 * Aísla completamente el Dominio de las columnas SQL y tipos de almacenamiento.
 */
export class ProductoMapper {
  /**
   * Mapea una fila de base de datos a una entidad de dominio `Producto`.
   * @param {Object} filaSql 
   * @returns {Producto|null}
   */
  static aDominio(filaSql) {
    if (!filaSql) return null;
    return new Producto({
      id: filaSql.id,
      codigoInterno: filaSql.codigo_interno,
      codigoBarras: filaSql.codigo_barras,
      nombre: filaSql.nombre,
      categoria: filaSql.categoria,
      subcategoria: filaSql.subcategoria,
      marca: filaSql.marca,
      costoCompra: filaSql.costo_compra,
      precioVentaUnitario: filaSql.precio_venta_unitario,
      precioVentaMayor: filaSql.precio_venta_mayor,
      ivaPorcentaje: filaSql.iva_porcentaje,
      stockActual: filaSql.stock_actual,
      stockMinimoAlerta: filaSql.stock_minimo_alerta,
      fechaUltimaCompra: filaSql.fecha_ultima_compra,
      fechaUltimaVenta: filaSql.fecha_ultima_venta,
      activo: filaSql.activo !== undefined ? filaSql.activo : 1
    });
  }

  /**
   * Mapea una entidad `Producto` a un objeto con nombres de columnas para persistencia SQL.
   * @param {Producto} producto 
   * @returns {Object}
   */
  static aPersistencia(producto) {
    return {
      id: producto.id,
      codigo_interno: producto.codigoInterno,
      codigo_barras: producto.codigoBarras,
      nombre: producto.nombre,
      categoria: producto.categoria,
      subcategoria: producto.subcategoria,
      marca: producto.marca,
      costo_compra: producto.costoCompra,
      precio_venta_unitario: producto.precioVentaUnitario,
      precio_venta_mayor: producto.precioVentaMayor,
      iva_porcentaje: producto.ivaPorcentaje,
      stock_actual: producto.stockActual,
      stock_minimo_alerta: producto.stockMinimoAlerta,
      fecha_ultima_compra: producto.fechaUltimaCompra,
      fecha_ultima_venta: producto.fechaUltimaVenta,
      activo: producto.activo
    };
  }
}
