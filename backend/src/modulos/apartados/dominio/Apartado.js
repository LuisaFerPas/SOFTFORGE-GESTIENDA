/**
 * Constantes de estado para el agregado Apartado.
 * HU-0700.2
 */
export const EstadoApartado = Object.freeze({
  ACTIVO: 'ACTIVO',
  COMPLETADO: 'COMPLETADO',
  CANCELADO: 'CANCELADO'
});

/**
 * Representa un producto individual reservado dentro de un apartado.
 */
export class DetalleApartado {
  constructor({ id, apartadoId, productoId, nombre, cantidad, precioUnitario, subtotal }) {
    if (!productoId || Number(productoId) <= 0) {
      throw new Error('DetalleApartado: productoId debe ser un entero positivo.');
    }
    if (!Number.isInteger(Number(cantidad)) || Number(cantidad) <= 0) {
      throw new Error('DetalleApartado: la cantidad debe ser un entero positivo.');
    }
    if (!Number.isFinite(Number(precioUnitario)) || Number(precioUnitario) < 0) {
      throw new Error('DetalleApartado: el precio unitario no puede ser negativo.');
    }

    this.id             = id ?? null;
    this.apartadoId     = apartadoId ?? null;
    this.productoId     = Number(productoId);
    this.nombre         = nombre ?? '';
    this.cantidad       = Number(cantidad);
    this.precioUnitario = Number(precioUnitario);
    this.subtotal       = subtotal !== undefined && subtotal !== null
      ? Number(subtotal)
      : this.cantidad * this.precioUnitario;
  }

  aObjetoPlano() {
    return {
      id:             this.id,
      apartadoId:     this.apartadoId,
      productoId:     this.productoId,
      nombre:         this.nombre,
      cantidad:       this.cantidad,
      precioUnitario: this.precioUnitario,
      subtotal:       this.subtotal
    };
  }
}

/**
 * Representa un abono realizado a un apartado.
 */
export class AbonoApartado {
  constructor({ id, apartadoId, usuarioId, monto, medioPago, saldoRestante, fechaHora }) {
    if (!Number.isFinite(Number(monto)) || Number(monto) <= 0) {
      throw new Error('AbonoApartado: el monto debe ser un número positivo.');
    }

    this.id            = id ?? null;
    this.apartadoId    = apartadoId ?? null;
    this.usuarioId     = usuarioId ? Number(usuarioId) : null;
    this.monto         = Number(monto);
    this.medioPago     = medioPago ?? 'EFECTIVO';
    this.saldoRestante = saldoRestante !== undefined ? Number(saldoRestante) : 0;
    this.fechaHora     = fechaHora ?? new Date().toISOString();
  }

  aObjetoPlano() {
    return {
      id:            this.id,
      apartadoId:    this.apartadoId,
      usuarioId:     this.usuarioId,
      monto:         this.monto,
      medioPago:     this.medioPago,
      saldoRestante: this.saldoRestante,
      fechaHora:     this.fechaHora
    };
  }
}

/**
 * Agregado raíz Apartado.
 * HU-0700.2 — Con invariantes, validaciones y métodos de ciclo de vida.
 */
export class Apartado {
  constructor({
    id,
    codigo,
    clienteNombre,
    clienteTelefono,
    usuarioId,
    productos = [],
    totalProductos,
    abonoInicial,
    abonosAdicionales = [],
    saldoPendiente,
    fechaCreacion,
    fechaLimite,
    estado
  }) {
    // --- Invariantes de dominio ---
    if (!clienteNombre || !String(clienteNombre).trim()) {
      throw new Error('Apartado: clienteNombre es obligatorio y no puede estar vacío.');
    }
    if (!usuarioId || Number(usuarioId) <= 0) {
      throw new Error('Apartado: usuarioId es obligatorio y debe ser un entero positivo.');
    }

    const items = productos.map(p => p instanceof DetalleApartado ? p : new DetalleApartado(p));
    if (items.length === 0 && (totalProductos === undefined || totalProductos === null)) {
      throw new Error('Apartado: debe incluir al menos un producto.');
    }

    const totalCalc = items.length > 0
      ? items.reduce((acc, it) => acc + it.subtotal, 0)
      : Number(totalProductos ?? 0);

    if (totalCalc <= 0) {
      throw new Error('Apartado: el total de los productos debe ser mayor a cero.');
    }

    const abonoInitNum = Number(abonoInicial ?? 0);
    if (!Number.isFinite(abonoInitNum) || abonoInitNum <= 0) {
      throw new Error('Apartado: abonoInicial debe ser mayor a cero.');
    }
    if (abonoInitNum > totalCalc) {
      throw new Error('Apartado: el abono inicial no puede superar el total de los productos.');
    }

    const abonos = abonosAdicionales.map(a => a instanceof AbonoApartado ? a : new AbonoApartado(a));
    const totalAbonado = abonoInitNum + abonos.reduce((acc, a) => acc + a.monto, 0);
    const saldoCalc = Math.max(0, Math.round((totalCalc - totalAbonado) * 100) / 100);

    if (saldoPendiente !== undefined && saldoPendiente !== null && Number(saldoPendiente) < 0) {
      throw new Error('Apartado: el saldo pendiente no puede ser negativo.');
    }

    const estadoFinal = estado ?? (saldoCalc === 0 ? EstadoApartado.COMPLETADO : EstadoApartado.ACTIVO);
    if (!Object.values(EstadoApartado).includes(estadoFinal)) {
      throw new Error(`Apartado: estado inválido '${estadoFinal}'. Use EstadoApartado.`);
    }

    this.id                = id ?? null;
    this.codigo            = codigo ?? null;
    this.clienteNombre     = String(clienteNombre).trim();
    this.clienteTelefono   = clienteTelefono ? String(clienteTelefono).trim() : null;
    this.usuarioId         = Number(usuarioId);
    this.productos         = items;
    this.totalProductos    = totalCalc;
    this.abonoInicial      = abonoInitNum;
    this.abonosAdicionales = abonos;
    this.saldoPendiente    = saldoPendiente !== undefined && saldoPendiente !== null
      ? Number(saldoPendiente)
      : saldoCalc;
    this.fechaCreacion     = fechaCreacion ?? new Date().toISOString();
    this.fechaLimite       = fechaLimite ?? null;
    this.estado            = estadoFinal;
  }

  /**
   * Recalcula el saldo pendiente a partir del total y todos los abonos.
   * @returns {number}
   */
  calcularSaldo() {
    const totalAbonos = this.abonoInicial + this.abonosAdicionales.reduce((acc, a) => acc + a.monto, 0);
    return Math.max(0, Math.round((this.totalProductos - totalAbonos) * 100) / 100);
  }

  /**
   * Registra un abono adicional reduciendo el saldo pendiente.
   * Si el saldo llega a 0, completa automáticamente el apartado.
   * @param {{ monto: number, usuarioId?: number, medioPago?: string, fechaHora?: string }} datosAbono
   */
  agregarAbono({ monto, usuarioId, medioPago = 'EFECTIVO', fechaHora }) {
    if (this.estado !== EstadoApartado.ACTIVO) {
      throw new Error(`Apartado: no se pueden agregar abonos a un apartado en estado '${this.estado}'.`);
    }

    const m = Number(monto);
    if (!Number.isFinite(m) || m <= 0) {
      throw new Error('Apartado: el monto del abono debe ser mayor a cero.');
    }
    if (m > this.saldoPendiente) {
      throw new Error(`Apartado: el monto abonado ($${m}) excede el saldo pendiente ($${this.saldoPendiente}).`);
    }

    const nuevoSaldo = Math.max(0, Math.round((this.saldoPendiente - m) * 100) / 100);
    const nuevoAbono = new AbonoApartado({
      apartadoId:    this.id,
      usuarioId:     usuarioId ?? this.usuarioId,
      monto:         m,
      medioPago,
      saldoRestante: nuevoSaldo,
      fechaHora
    });

    this.abonosAdicionales.push(nuevoAbono);
    this.saldoPendiente = nuevoSaldo;

    if (this.saldoPendiente === 0) {
      this.completar();
    }

    return nuevoAbono;
  }

  /**
   * Marca el apartado como COMPLETADO (liquidación final).
   */
  completar() {
    if (this.estado === EstadoApartado.CANCELADO) {
      throw new Error('Apartado: no se puede completar un apartado cancelado.');
    }
    this.estado = EstadoApartado.COMPLETADO;
    this.saldoPendiente = 0;
  }

  /**
   * Cancela el apartado para liberar inventario.
   */
  cancelar() {
    if (this.estado !== EstadoApartado.ACTIVO) {
      throw new Error(`Apartado: solo se pueden cancelar apartados ACTIVOS (estado actual: '${this.estado}').`);
    }
    this.estado = EstadoApartado.CANCELADO;
  }

  /**
   * Retorna una representación en objeto plano.
   * @returns {object}
   */
  aObjetoPlano() {
    return {
      id:                this.id,
      codigo:            this.codigo,
      clienteNombre:     this.clienteNombre,
      clienteTelefono:   this.clienteTelefono,
      usuarioId:         this.usuarioId,
      productos:         this.productos.map(p => p.aObjetoPlano ? p.aObjetoPlano() : p),
      totalProductos:    this.totalProductos,
      abonoInicial:      this.abonoInicial,
      abonosAdicionales: this.abonosAdicionales.map(a => a.aObjetoPlano ? a.aObjetoPlano() : a),
      saldoPendiente:    this.saldoPendiente,
      fechaCreacion:     this.fechaCreacion,
      fechaLimite:       this.fechaLimite,
      estado:            this.estado
    };
  }
}
