import { Apartado, DetalleApartado, AbonoApartado, EstadoApartado } from '../../dominio/Apartado.js';

/**
 * Data Mapper para el agregado Apartado.
 * HU-0700.4
 */
export class ApartadoMapper {
  /**
   * Reconstituye la entidad de dominio a partir de las filas de base de datos.
   * @param {object} filaApartado
   * @param {Array<object>} productosFila
   * @param {Array<object>} abonosFila
   * @returns {Apartado}
   */
  static aEntidad(filaApartado, productosFila = [], abonosFila = []) {
    if (!filaApartado) return null;

    const productos = productosFila.map(p => new DetalleApartado({
      id:             p.id,
      apartadoId:     p.apartado_id,
      productoId:     p.producto_id,
      nombre:         p.nombre || p.producto_nombre || '',
      cantidad:       p.cantidad,
      precioUnitario: p.precio_unitario,
      subtotal:       p.subtotal
    }));

    const abonos = abonosFila.map(a => new AbonoApartado({
      id:            a.id,
      apartadoId:    a.apartado_id,
      usuarioId:     a.usuario_id,
      monto:         a.monto,
      medioPago:     a.medio_pago,
      saldoRestante: a.saldo_restante,
      fechaHora:     a.created_at
    }));

    return new Apartado({
      id:                filaApartado.id,
      codigo:            filaApartado.codigo,
      clienteNombre:     filaApartado.cliente_nombre,
      clienteTelefono:   filaApartado.cliente_telefono,
      usuarioId:         filaApartado.usuario_id,
      productos,
      totalProductos:    filaApartado.total_productos,
      abonoInicial:      filaApartado.abono_inicial,
      abonosAdicionales: abonos,
      saldoPendiente:    filaApartado.saldo_pendiente,
      fechaCreacion:     filaApartado.fecha_creacion,
      fechaLimite:       filaApartado.fecha_limite,
      estado:            filaApartado.estado || EstadoApartado.ACTIVO
    });
  }

  /**
   * Convierte la entidad Apartado a objeto plano para inserción en la tabla `apartados`.
   * @param {Apartado} apartado
   * @returns {object}
   */
  static aFilaDB(apartado) {
    return {
      codigo:           apartado.codigo,
      cliente_nombre:   apartado.clienteNombre,
      cliente_telefono: apartado.clienteTelefono,
      usuario_id:       apartado.usuarioId,
      total_productos:  apartado.totalProductos,
      abono_inicial:    apartado.abonoInicial,
      saldo_pendiente:  apartado.saldoPendiente,
      fecha_creacion:   apartado.fechaCreacion,
      fecha_limite:     apartado.fechaLimite,
      estado:           apartado.estado
    };
  }
}
