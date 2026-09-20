/**
 * Entidad de Dominio: Producto
 */
export class Producto {
  constructor({
    id,
    codigoInterno,
    codigoBarras,
    nombre,
    categoria,
    subcategoria,
    marca,
    costoCompra,
    precioVentaUnitario,
    precioVentaMayor,
    ivaPorcentaje,
    stockActual,
    stockMinimoAlerta,
    fechaUltimaCompra,
    fechaUltimaVenta
  }) {
    this.id = id;
    this.codigoInterno = codigoInterno;
    this.codigoBarras = codigoBarras;
    this.nombre = nombre;
    this.categoria = categoria;
    this.subcategoria = subcategoria;
    this.marca = marca;
    this.costoCompra = costoCompra;
    this.precioVentaUnitario = precioVentaUnitario;
    this.precioVentaMayor = precioVentaMayor;
    this.ivaPorcentaje = ivaPorcentaje;
    this.stockActual = stockActual;
    this.stockMinimoAlerta = stockMinimoAlerta;
    this.fechaUltimaCompra = fechaUltimaCompra;
    this.fechaUltimaVenta = fechaUltimaVenta;
  }
}
