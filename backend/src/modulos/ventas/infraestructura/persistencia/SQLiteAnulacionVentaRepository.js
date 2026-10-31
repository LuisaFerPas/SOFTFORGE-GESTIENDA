import { FacturaMapper } from '../mappers/FacturaMapper.js';

function aDatosFactura(fila) {
  return {
    ...FacturaMapper.aEntidad(fila).aObjetoPlano(),
    reemplazaA: fila.reemplaza_a ?? null
  };
}

export class SQLiteAnulacionVentaRepository {
  constructor(db) {
    this.db = db;
  }

  asegurarEsquema() {
    asegurarEsquemaAnulacion(this.db);
  }

  async anularVentaYFacturaYObtenerItems(consecutivo, usuarioId) {
    const db = this.db;
    db.exec('BEGIN IMMEDIATE');
    try {
      const factura = db.prepare('SELECT * FROM facturas WHERE consecutivo = ?')
        .get(consecutivo);
      if (!factura) {
        throw new Error(`No se encontró una factura con el consecutivo ${consecutivo}.`);
      }
      if (factura.estado !== 'EMITIDA') {
        throw new Error('Solo se pueden reutilizar facturas emitidas.');
      }

      const venta = db.prepare('SELECT * FROM sales WHERE id = ?').get(factura.venta_id);
      if (!venta) {
        throw new Error('La venta asociada a la factura no existe.');
      }
      if (venta.estado === 'ANULADA') {
        throw new Error('La venta ya está anulada.');
      }

      const items = db.prepare(`
        SELECT si.id, si.producto_id, si.cantidad, si.precio_unitario, si.subtotal,
          p.nombre, p.stock_actual, p.precio_venta_unitario, p.activo
        FROM sale_items si
        LEFT JOIN products p ON p.id = si.producto_id
        WHERE si.venta_id = ?
        ORDER BY si.id
      `).all(factura.venta_id);
      if (items.length === 0) {
        throw new Error('La venta no tiene ítems para reutilizar.');
      }

      const preparados = items.map((item) => {
        const productoId = Number(item.producto_id);
        const cantidad = Number(item.cantidad);
        const precio = Number(item.precio_venta_unitario);
        if (!Number.isSafeInteger(productoId) || productoId <= 0 ||
            !Number.isSafeInteger(cantidad) || cantidad <= 0 ||
            item.nombre == null || Number(item.activo) !== 1 ||
            !Number.isFinite(precio) || precio <= 0) {
          throw new Error('No se puede reutilizar la venta: uno o más productos están inactivos o sin precio válido.');
        }
        const stockAnterior = Number(item.stock_actual ?? 0);
        if (!Number.isFinite(stockAnterior)) {
          throw new Error(`Stock inválido para el producto ${productoId}.`);
        }
        return {
          productoId,
          cantidad,
          nombre: item.nombre,
          precioOriginal: Number(item.precio_unitario),
          precioVentaUnitario: precio,
          stockAnterior,
          stockNuevo: stockAnterior + cantidad
        };
      });

      const ahora = new Date().toISOString();
      const actualizarStock = db.prepare(
        'UPDATE products SET stock_actual = ? WHERE id = ?'
      );
      const insertarMovimiento = db.prepare(`
        INSERT INTO stock_movements
          (producto_id, tipo, cantidad, stock_anterior, stock_nuevo,
           motivo, usuario_id, created_at)
        VALUES (?, 'AJUSTE_POSITIVO', ?, ?, ?, ?, ?, ?)
      `);

      for (const item of preparados) {
        const actualizado = actualizarStock.run(item.stockNuevo, item.productoId);
        if (Number(actualizado.changes) !== 1) {
          throw new Error(`No se pudo actualizar el stock del producto ${item.productoId}.`);
        }
        insertarMovimiento.run(
          item.productoId, item.cantidad, item.stockAnterior, item.stockNuevo,
          `Anulación venta #${venta.id} / factura ${factura.consecutivo}`,
          usuarioId, ahora
        );
      }

      const ventaAnulada = db.prepare(`
        UPDATE sales SET estado = 'ANULADA'
        WHERE id = ? AND COALESCE(estado, 'COMPLETADA') <> 'ANULADA'
      `).run(venta.id);
      if (Number(ventaAnulada.changes) !== 1) {
        throw new Error('No se pudo anular la venta.');
      }

      const facturaAnulada = db.prepare(`
        UPDATE facturas SET estado = 'ANULADA'
        WHERE id = ? AND estado = 'EMITIDA'
      `).run(factura.id);
      if (Number(facturaAnulada.changes) !== 1) {
        throw new Error('No se pudo anular la factura.');
      }

      const facturaFinal = db.prepare('SELECT * FROM facturas WHERE id = ?').get(factura.id);
      db.exec('COMMIT');

      return {
        ventaAnuladaId: Number(venta.id),
        facturaAnulada: aDatosFactura(facturaFinal),
        nombreCliente: factura.nombre_cliente,
        items: preparados.map((item) => ({
          productoId: item.productoId,
          nombre: item.nombre,
          cantidad: item.cantidad,
          precioOriginal: item.precioOriginal,
          precioVentaUnitario: item.precioVentaUnitario,
          subtotalActual: item.precioVentaUnitario * item.cantidad
        })),
        preciosActualizados: preparados.some((item) =>
          Math.abs(item.precioOriginal - item.precioVentaUnitario) > 0.001
        )
      };
    } catch (error) {
      if (db.isTransaction) db.exec('ROLLBACK');
      throw error;
    }
  }
}

export function asegurarEsquemaAnulacion(db) {
  const tabla = db.prepare(`
    SELECT 1 AS existe FROM sqlite_master
    WHERE type = 'table' AND name = 'sales'
  `).get();
  if (!tabla) return;

  const columnas = db.prepare('PRAGMA table_info(sales)').all();
  if (columnas.some((columna) => columna.name === 'estado')) return;

  db.exec("ALTER TABLE sales ADD COLUMN estado TEXT NOT NULL DEFAULT 'COMPLETADA'");
}
