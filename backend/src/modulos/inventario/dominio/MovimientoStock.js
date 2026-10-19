/**
 * Tipos oficiales de movimientos de inventario en Gestienda
 */
export const TipoMovimientoStock = Object.freeze({
  ENTRADA: 'ENTRADA',
  SALIDA_VENTA: 'SALIDA_VENTA',
  AJUSTE_POSITIVO: 'AJUSTE_POSITIVO',
  AJUSTE_NEGATIVO: 'AJUSTE_NEGATIVO',
  MERMA: 'MERMA'
});

export const TIPOS_MOVIMIENTO_VALIDOS = Object.freeze(Object.values(TipoMovimientoStock));

/**
 * Entidad de Dominio: Movimiento de Stock (Kardex)
 * Registra y audita cada cambio en las existencias de productos.
 */
export class MovimientoStock {
  constructor({
    id = null,
    productoId,
    tipo,
    cantidad,
    stockAnterior = 0,
    stockNuevo = 0,
    costoUnitario = 0,
    motivo = null,
    usuarioId = null,
    createdAt = null
  }) {
    this._validarInvariantes({ productoId, tipo, cantidad, stockAnterior, stockNuevo });

    this.id = id;
    this.productoId = Number(productoId);
    this.tipo = tipo;
    this.cantidad = Number(cantidad);
    this.stockAnterior = Number(stockAnterior);
    this.stockNuevo = Number(stockNuevo);
    this.costoUnitario = Number(costoUnitario) || 0;
    this.motivo = motivo ? String(motivo).trim() : null;
    this.usuarioId = usuarioId ? Number(usuarioId) : null;
    this.createdAt = createdAt || new Date().toISOString();
  }

  _validarInvariantes({ productoId, tipo, cantidad, stockAnterior, stockNuevo }) {
    if (!productoId || Number(productoId) <= 0) {
      throw new Error('El ID del producto es obligatorio para registrar un movimiento.');
    }
    if (!tipo || !TIPOS_MOVIMIENTO_VALIDOS.includes(tipo)) {
      throw new Error(`Tipo de movimiento inválido: "${tipo}". Tipos permitidos: ${TIPOS_MOVIMIENTO_VALIDOS.join(', ')}`);
    }
    if (!cantidad || Number(cantidad) <= 0) {
      throw new Error('La cantidad del movimiento debe ser un número mayor a cero.');
    }
    if (!Number.isFinite(Number(stockAnterior)) || !Number.isFinite(Number(stockNuevo))) {
      throw new Error('Los valores de stock anterior y nuevo deben ser finitos.');
    }
  }

  esEntrada() {
    return this.tipo === TipoMovimientoStock.ENTRADA || this.tipo === TipoMovimientoStock.AJUSTE_POSITIVO;
  }

  esSalida() {
    return this.tipo === TipoMovimientoStock.SALIDA_VENTA || 
           this.tipo === TipoMovimientoStock.AJUSTE_NEGATIVO || 
           this.tipo === TipoMovimientoStock.MERMA;
  }

  aObjetoPlano() {
    return {
      id: this.id,
      productoId: this.productoId,
      tipo: this.tipo,
      cantidad: this.cantidad,
      stockAnterior: this.stockAnterior,
      stockNuevo: this.stockNuevo,
      costoUnitario: this.costoUnitario,
      motivo: this.motivo,
      usuarioId: this.usuarioId,
      createdAt: this.createdAt
    };
  }
}
