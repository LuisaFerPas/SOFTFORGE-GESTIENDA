import { esCategoriaValida, normalizarCategoria } from './CategoriaProducto.js';

/**
 * Entidad de Dominio: Producto (Rich Domain Model)
 * Encapsula las reglas de negocio, invariantes y cálculos de la mercancía en Don Mati.
 */
export class Producto {
  constructor({
    id = null,
    codigoInterno,
    codigoBarras = null,
    nombre,
    categoria,
    subcategoria = null,
    marca = null,
    costoCompra = 0,
    precioVentaUnitario = 0,
    precioVentaMayor = 0,
    ivaPorcentaje = 0,
    stockActual = 0,
    stockMinimoAlerta = 10,
    fechaUltimaCompra = null,
    fechaUltimaVenta = null,
    activo = 1
  }) {
    this._validarInvariantes({ codigoInterno, nombre, categoria, costoCompra, precioVentaUnitario, stockActual, stockMinimoAlerta });

    this.id = id;
    this.codigoInterno = String(codigoInterno).trim();
    this.codigoBarras = codigoBarras ? String(codigoBarras).trim() : null;
    this.nombre = String(nombre).trim();
    this.categoria = normalizarCategoria(categoria) || categoria;
    this.subcategoria = subcategoria ? String(subcategoria).trim() : null;
    this.marca = marca ? String(marca).trim() : null;
    this.costoCompra = Number(costoCompra) || 0;
    this.precioVentaUnitario = Number(precioVentaUnitario) || 0;
    this.precioVentaMayor = Number(precioVentaMayor) || 0;
    this.ivaPorcentaje = Number(ivaPorcentaje) || 0;
    this.stockActual = Number(stockActual) || 0;
    this.stockMinimoAlerta = stockMinimoAlerta !== undefined && stockMinimoAlerta !== null ? Number(stockMinimoAlerta) : 10;
    this.fechaUltimaCompra = fechaUltimaCompra;
    this.fechaUltimaVenta = fechaUltimaVenta;
    this.activo = activo ? 1 : 0;
  }

  _validarInvariantes({ codigoInterno, nombre, categoria, costoCompra, precioVentaUnitario, stockActual, stockMinimoAlerta }) {
    if (!codigoInterno || !String(codigoInterno).trim()) {
      throw new Error('El código interno del producto es obligatorio.');
    }
    if (!nombre || !String(nombre).trim()) {
      throw new Error('El nombre del producto es obligatorio.');
    }
    if (!categoria || !esCategoriaValida(categoria)) {
      throw new Error(`La categoría "${categoria}" no es válida. Debe ser una de las 5 categorías oficiales.`);
    }
    if (costoCompra < 0) {
      throw new Error('El costo de compra no puede ser negativo.');
    }
    if (precioVentaUnitario < 0) {
      throw new Error('El precio de venta no puede ser negativo.');
    }
    // RV-15: el inventario puede quedar negativo cuando se registra una venta informativa.
    if (!Number.isInteger(Number(stockActual)) || !Number.isFinite(Number(stockActual))) {
      throw new Error('El stock debe ser un número entero.');
    }
    if (stockMinimoAlerta < 0) {
      throw new Error('El umbral de stock mínimo no puede ser negativo.');
    }
  }

  /**
   * Calcula el margen de utilidad en porcentaje.
   * @returns {number} Porcentaje de margen (ej. 35.5%)
   */
  calcularMargenUtilidad() {
    if (this.costoCompra <= 0) {
      return this.precioVentaUnitario > 0 ? 100 : 0;
    }
    const ganancia = this.precioVentaUnitario - this.costoCompra;
    return Number(((ganancia / this.costoCompra) * 100).toFixed(2));
  }

  /**
   * Calcula la ganancia unitaria en pesos colombianos.
   * @returns {number}
   */
  calcularGananciaUnitaria() {
    return Math.max(0, this.precioVentaUnitario - this.costoCompra);
  }

  /**
   * Determina si el producto está en nivel crítico de stock bajo.
   * @returns {boolean}
   */
  tieneStockBajo() {
    return this.stockActual > 0 && this.stockActual <= this.stockMinimoAlerta;
  }

  /**
   * Determina si el producto está totalmente agotado.
   * @returns {boolean}
   */
  estaAgotado() {
    return this.stockActual <= 0;
  }

  /**
   * Sanitiza el objeto de producto para el perfil VENDEDOR (HU-0607).
   * Oculta datos sensibles de stock y costos por regla de seguridad de Don Mati.
   * @returns {Object}
   */
  sanitizarParaVendedor() {
    return {
      id: this.id,
      codigoInterno: this.codigoInterno,
      codigoBarras: this.codigoBarras,
      nombre: this.nombre,
      categoria: this.categoria,
      subcategoria: this.subcategoria,
      marca: this.marca,
      precioVentaUnitario: this.precioVentaUnitario,
      precioVentaMayor: this.precioVentaMayor,
      ivaPorcentaje: this.ivaPorcentaje,
      activo: this.activo
      // NOTA: Se excluyen intencionalmente costoCompra, stockActual y stockMinimoAlerta
    };
  }

  /**
   * Retorna la representación completa de la entidad en formato plano.
   * @returns {Object}
   */
  aObjetoPlano() {
    return {
      id: this.id,
      codigoInterno: this.codigoInterno,
      codigoBarras: this.codigoBarras,
      nombre: this.nombre,
      categoria: this.categoria,
      subcategoria: this.subcategoria,
      marca: this.marca,
      costoCompra: this.costoCompra,
      precioVentaUnitario: this.precioVentaUnitario,
      precioVentaMayor: this.precioVentaMayor,
      ivaPorcentaje: this.ivaPorcentaje,
      stockActual: this.stockActual,
      stockMinimoAlerta: this.stockMinimoAlerta,
      margenUtilidadPorcentaje: this.calcularMargenUtilidad(),
      gananciaUnitaria: this.calcularGananciaUnitaria(),
      tieneStockBajo: this.tieneStockBajo(),
      estaAgotado: this.estaAgotado(),
      fechaUltimaCompra: this.fechaUltimaCompra,
      fechaUltimaVenta: this.fechaUltimaVenta,
      activo: this.activo
    };
  }
}
