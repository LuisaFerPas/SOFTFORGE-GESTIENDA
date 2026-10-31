/**
 * Agrega el medio OTRO sin perder ventas ni movimientos asociados.
 * SQLite no permite cambiar un CHECK con ALTER TABLE; se recrea sales en una transacción.
 * Ejecutar después de crear el esquema y ANTES de cualquier operación de venta.
 */
export function migrarMedioPagoOtro(db) {
  const fila = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'sales'").get();
  if (!fila) return;
  const sql = fila.sql || '';
  const columnas = db.prepare('PRAGMA table_info(sales)').all();
  const tieneMontoOtro = columnas.some(c => c.name === 'monto_otro');
  const permiteOtro = /['"]OTRO['"]/.test(sql);
  if (tieneMontoOtro && permiteOtro) return;

  // La desactivación temporal de FK está fuera de la transacción, tal como exige SQLite.
  db.exec('PRAGMA foreign_keys = OFF');
  try {
    db.exec('BEGIN IMMEDIATE');
    db.exec(`
      CREATE TABLE sales_migracion_medio_otro (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        total REAL NOT NULL,
        medio_pago TEXT NOT NULL CHECK(medio_pago IN ('EFECTIVO','NEQUI','OTRO','MIXTO')),
        monto_efectivo REAL NOT NULL DEFAULT 0,
        monto_nequi REAL NOT NULL DEFAULT 0,
        monto_otro REAL NOT NULL DEFAULT 0,
        cambio REAL NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES users(id)
      );
    `);
    const origenOtro = tieneMontoOtro ? 'COALESCE(monto_otro, 0)' : '0';
    db.exec(`
      INSERT INTO sales_migracion_medio_otro
      (id,usuario_id,total,medio_pago,monto_efectivo,monto_nequi,monto_otro,cambio,created_at)
      SELECT id,usuario_id,total,medio_pago,monto_efectivo,monto_nequi,${origenOtro},cambio,created_at
      FROM sales;
      DROP TABLE sales;
      ALTER TABLE sales_migracion_medio_otro RENAME TO sales;
      CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
    `);
    const erroresFk = db.prepare('PRAGMA foreign_key_check').all();
    if (erroresFk.length) throw new Error('Migración cancelada: referencias inconsistentes en la base de datos.');
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  } finally {
    db.exec('PRAGMA foreign_keys = ON');
  }
}
