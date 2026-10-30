import { FacturaMapper } from '../mappers/FacturaMapper.js';

function aDatosFactura(fila) {
  return {
    ...FacturaMapper.aEntidad(fila).aObjetoPlano(),
    reemplazaA: fila.reemplaza_a ?? null
  };
}

function leerSecuencia(db, tabla) {
  const existe = db.prepare(`
    SELECT 1 AS existe FROM sqlite_master
    WHERE type = 'table' AND name = 'sqlite_sequence'
  `).get();
  if (!existe) return 0;
  const fila = db.prepare('SELECT seq FROM sqlite_sequence WHERE name = ?').get(tabla);
  return fila ? Number(fila.seq) : 0;
}

function tieneIndiceUnicoSimple(db, tabla, columna) {
  const indices = db.prepare(`PRAGMA index_list(${tabla})`).all();
  for (const indice of indices) {
    if (Number(indice.unique) !== 1 || Number(indice.partial) === 1) continue;
    const columnas = db.prepare(`PRAGMA index_info(${indice.name})`).all();
    if (columnas.length === 1 && columnas[0].name === columna) return true;
  }
  return false;
}

function tieneIndice(db, nombre) {
  return Boolean(db.prepare(`
    SELECT 1 AS existe FROM sqlite_master
    WHERE type = 'index' AND name = ?
  `).get(nombre));
}

export class SQLiteEdicionFacturaRepository {
  constructor(db) {
    this.db = db;
  }

  asegurarEsquema() {
    asegurarEsquemaEdicion(this.db);
  }

  async reemplazarFactura(consecutivo, { nombreCliente }) {
    const db = this.db;
    db.exec('BEGIN IMMEDIATE');
    try {
      const original = db.prepare('SELECT * FROM facturas WHERE consecutivo = ?')
        .get(consecutivo);
      if (!original) {
        throw new Error(`No se encontró una factura con el consecutivo ${consecutivo}.`);
      }
      if (original.estado !== 'EMITIDA') {
        throw new Error('Solo se pueden editar facturas emitidas.');
      }
      if (original.nombre_cliente === nombreCliente) {
        throw new Error('El nombre del cliente no cambió.');
      }

      const otraEmitida = db.prepare(`
        SELECT id FROM facturas
        WHERE venta_id = ? AND estado = 'EMITIDA' AND id <> ?
      `).get(original.venta_id, original.id);
      if (otraEmitida) {
        throw new Error('La venta ya tiene otra factura emitida.');
      }

      const { ultimo } = db.prepare(`
        SELECT COALESCE(MAX(CAST(SUBSTR(consecutivo, 3) AS INTEGER)), 0) AS ultimo
        FROM facturas
        WHERE consecutivo GLOB 'F-[0-9]*'
      `).get();
      const siguiente = Number(ultimo) + 1;
      if (!Number.isSafeInteger(siguiente)) {
        throw new Error('Se agotó el rango de consecutivos de factura.');
      }
      const nuevoConsecutivo = `F-${String(siguiente).padStart(4, '0')}`;

      const anulada = db.prepare(`
        UPDATE facturas SET estado = 'ANULADA'
        WHERE id = ? AND estado = 'EMITIDA'
      `).run(original.id);
      if (Number(anulada.changes) !== 1) {
        throw new Error('No se pudo anular la factura original.');
      }

      const insertada = db.prepare(`
        INSERT INTO facturas
          (venta_id, consecutivo, nombre_cliente, fecha_emision, estado, reemplaza_a)
        VALUES (?, ?, ?, ?, 'EMITIDA', ?)
      `).run(original.venta_id, nuevoConsecutivo, nombreCliente,
        new Date().toISOString(), original.consecutivo);

      const facturaAnulada = db.prepare('SELECT * FROM facturas WHERE id = ?')
        .get(original.id);
      const facturaNueva = db.prepare('SELECT * FROM facturas WHERE id = ?')
        .get(Number(insertada.lastInsertRowid));

      db.exec('COMMIT');
      return {
        anulada: aDatosFactura(facturaAnulada),
        nueva: aDatosFactura(facturaNueva)
      };
    } catch (error) {
      if (db.isTransaction) db.exec('ROLLBACK');
      throw error;
    }
  }
}

export function asegurarEsquemaEdicion(db) {
  const tabla = db.prepare(`
    SELECT sql FROM sqlite_master
    WHERE type = 'table' AND name = 'facturas'
  `).get();
  if (!tabla) return;

  const columnas = db.prepare('PRAGMA table_info(facturas)').all();
  const tieneReemplaza = columnas.some((columna) => columna.name === 'reemplaza_a');
  const ventaIdUnico = tieneIndiceUnicoSimple(db, 'facturas', 'venta_id');
  const indiceEmitida = tieneIndice(db, 'idx_facturas_venta_emitida');
  if (tieneReemplaza && !ventaIdUnico && indiceEmitida) return;

  const secuenciaAnterior = leerSecuencia(db, 'facturas');
  const origenReemplaza = tieneReemplaza ? 'reemplaza_a' : 'NULL';

  db.exec('PRAGMA foreign_keys = OFF');
  try {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(`
        CREATE TABLE facturas_migracion_edicion (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          venta_id INTEGER NOT NULL,
          consecutivo TEXT NOT NULL UNIQUE,
          nombre_cliente TEXT NOT NULL DEFAULT 'Consumidor Final',
          fecha_emision DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          estado TEXT NOT NULL DEFAULT 'EMITIDA' CHECK(estado IN ('EMITIDA','ANULADA')),
          reemplaza_a TEXT,
          FOREIGN KEY (venta_id) REFERENCES sales(id)
        );
        INSERT INTO facturas_migracion_edicion
          (id, venta_id, consecutivo, nombre_cliente, fecha_emision, estado, reemplaza_a)
        SELECT id, venta_id, consecutivo, COALESCE(nombre_cliente, 'Consumidor Final'), fecha_emision, estado, ${origenReemplaza}
        FROM facturas;
        DROP TABLE facturas;
        ALTER TABLE facturas_migracion_edicion RENAME TO facturas;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_facturas_consecutivo ON facturas(consecutivo);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_facturas_venta_emitida
          ON facturas(venta_id) WHERE estado = 'EMITIDA';
        CREATE INDEX IF NOT EXISTS idx_facturas_reemplaza_a ON facturas(reemplaza_a);
      `);

      const maxId = Number(
        db.prepare('SELECT COALESCE(MAX(id), 0) AS maxId FROM facturas').get().maxId
      );
      const secuenciaFinal = Math.max(secuenciaAnterior, maxId);
      if (secuenciaFinal > 0) {
        db.prepare("DELETE FROM sqlite_sequence WHERE name = 'facturas'").run();
        db.prepare("INSERT INTO sqlite_sequence(name, seq) VALUES('facturas', ?)")
          .run(secuenciaFinal);
      }

      const erroresFk = db.prepare('PRAGMA foreign_key_check').all();
      if (erroresFk.length) {
        throw new Error('Migración cancelada: referencias inconsistentes en facturas.');
      }
      db.exec('COMMIT');
    } catch (error) {
      if (db.isTransaction) db.exec('ROLLBACK');
      throw error;
    }
  } finally {
    db.exec('PRAGMA foreign_keys = ON');
  }
}
