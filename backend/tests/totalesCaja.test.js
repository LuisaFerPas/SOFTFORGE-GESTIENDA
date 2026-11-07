import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { TotalesCajaService } from '../src/modulos/reportes/servicios/TotalesCajaService.js';

function crearDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      total REAL NOT NULL,
      medio_pago TEXT NOT NULL,
      monto_efectivo REAL NOT NULL DEFAULT 0,
      monto_nequi REAL NOT NULL DEFAULT 0,
      monto_otro REAL NOT NULL DEFAULT 0,
      cambio REAL NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE apartado_abonos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      apartado_id INTEGER NOT NULL,
      usuario_id INTEGER NOT NULL,
      monto REAL NOT NULL,
      medio_pago TEXT NOT NULL DEFAULT 'EFECTIVO',
      saldo_restante REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return db;
}

function insertarVenta(db, { total, medioPago, efectivo = 0, nequi = 0, otro = 0, cambio = 0, fecha }) {
  db.prepare(`
    INSERT INTO sales
      (usuario_id, total, medio_pago, monto_efectivo, monto_nequi, monto_otro, cambio, created_at)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?)
  `).run(total, medioPago, efectivo, nequi, otro, cambio, fecha);
}

function insertarAbono(db, { monto, medioPago = 'EFECTIVO', fecha }) {
  db.prepare(`
    INSERT INTO apartado_abonos
      (apartado_id, usuario_id, monto, medio_pago, saldo_restante, created_at)
    VALUES (1, 1, ?, ?, 0, ?)
  `).run(monto, medioPago, fecha);
}

test('HU-0802: suma ventas y abonos del día por medio de pago', async () => {
  const db = crearDb();
  try {
    const fecha = '2026-11-07';

    // Venta en efectivo: monto_efectivo incluye el cambio recibido.
    insertarVenta(db, {
      total: 20000, medioPago: 'EFECTIVO',
      efectivo: 50000, cambio: 30000, fecha: '2026-11-07T15:00:00.000Z'
    });
    insertarVenta(db, {
      total: 15000, medioPago: 'NEQUI',
      nequi: 15000, fecha: '2026-11-07T16:00:00.000Z'
    });
    insertarVenta(db, {
      total: 5000, medioPago: 'OTRO',
      otro: 5000, fecha: '2026-11-07T17:00:00.000Z'
    });
    // Venta mixta: efectivo + Nequi, sin cambio.
    insertarVenta(db, {
      total: 30000, medioPago: 'MIXTO',
      efectivo: 10000, nequi: 20000, fecha: '2026-11-07T18:00:00.000Z'
    });

    insertarAbono(db, { monto: 7000, medioPago: 'EFECTIVO', fecha: '2026-11-07T19:00:00.000Z' });
    insertarAbono(db, { monto: 3000, medioPago: 'NEQUI', fecha: '2026-11-07T20:00:00.000Z' });
    insertarAbono(db, { monto: 2000, medioPago: 'OTRO', fecha: '2026-11-07T21:00:00.000Z' });
    // Un medio desconocido también debe caer en OTRO.
    insertarAbono(db, { monto: 1000, medioPago: 'TARJETA', fecha: '2026-11-07T22:00:00.000Z' });

    const totales = await new TotalesCajaService(db).totalesDelDia(fecha);

    assert.equal(totales.fecha, fecha);
    assert.equal(totales.totalEfectivo, 37000); // 20000 + 10000 + 7000
    assert.equal(totales.totalNequi, 38000);    // 15000 + 20000 + 3000
    assert.equal(totales.totalOtro, 8000);      // 5000 + 2000 + 1000
    assert.equal(totales.totalDia, 83000);
    assert.deepEqual(totales.desglose.ventas, { efectivo: 30000, nequi: 35000, otro: 5000 });
    assert.deepEqual(totales.desglose.apartados, { efectivo: 7000, nequi: 3000, otro: 3000 });
  } finally {
    db.close();
  }
});

test('HU-0802: un día sin pagos devuelve todos los totales en cero', async () => {
  const db = crearDb();
  try {
    const totales = await new TotalesCajaService(db).totalesDelDia('2026-11-07');

    assert.equal(totales.fecha, '2026-11-07');
    assert.equal(totales.totalDia, 0);
    assert.equal(totales.totalEfectivo, 0);
    assert.equal(totales.totalNequi, 0);
    assert.equal(totales.totalOtro, 0);
    assert.deepEqual(totales.desglose.ventas, { efectivo: 0, nequi: 0, otro: 0 });
    assert.deepEqual(totales.desglose.apartados, { efectivo: 0, nequi: 0, otro: 0 });
  } finally {
    db.close();
  }
});

test('HU-0802: la frontera de medianoche se calcula en hora de Colombia (UTC-5)', async () => {
  const db = crearDb();
  try {
    // 23:30 del 7-nov en Colombia = 04:30 UTC del 8-nov.
    insertarVenta(db, {
      total: 10000, medioPago: 'EFECTIVO',
      efectivo: 10000, fecha: '2026-11-08T04:30:00.000Z'
    });
    // 00:00 del 8-nov en Colombia = 05:00 UTC del 8-nov.
    insertarVenta(db, {
      total: 20000, medioPago: 'EFECTIVO',
      efectivo: 20000, fecha: '2026-11-08T05:00:00.000Z'
    });
    insertarAbono(db, { monto: 5000, fecha: '2026-11-08T04:59:59.999Z' });
    insertarAbono(db, { monto: 6000, fecha: '2026-11-08T05:00:00.000Z' });

    const servicio = new TotalesCajaService(db);
    const dia7 = await servicio.totalesDelDia('2026-11-07');
    const dia8 = await servicio.totalesDelDia('2026-11-08');

    assert.equal(dia7.totalEfectivo, 15000); // 10000 venta + 5000 abono
    assert.equal(dia7.totalDia, 15000);
    assert.equal(dia8.totalEfectivo, 26000); // 20000 venta + 6000 abono
    assert.equal(dia8.totalDia, 26000);
  } finally {
    db.close();
  }
});

test('HU-0802: un pago de otro día no se cuenta', async () => {
  const db = crearDb();
  try {
    insertarVenta(db, {
      total: 9000, medioPago: 'EFECTIVO',
      efectivo: 9000, fecha: '2026-11-06T15:00:00.000Z'
    });
    insertarAbono(db, { monto: 4000, fecha: '2026-11-06T16:00:00.000Z' });

    const totales = await new TotalesCajaService(db).totalesDelDia('2026-11-07');

    assert.equal(totales.totalDia, 0);
    assert.equal(totales.totalEfectivo, 0);
  } finally {
    db.close();
  }
});

test('HU-0802: hoyBogota devuelve una fecha YYYY-MM-DD', () => {
  assert.match(TotalesCajaService.hoyBogota(), /^\d{4}-\d{2}-\d{2}$/);
});
