import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { FacturacionService } from '../src/modulos/ventas/servicios/FacturacionService.js';
import { SQLiteVentaRepository } from '../src/modulos/ventas/infraestructura/persistencia/SQLiteVentaRepository.js';
import { Factura } from '../src/modulos/ventas/dominio/Factura.js';

function escenario() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE users (id INTEGER PRIMARY KEY);
    INSERT INTO users (id) VALUES (1);
    CREATE TABLE sales (
      id INTEGER PRIMARY KEY, usuario_id INTEGER NOT NULL, total REAL NOT NULL,
      medio_pago TEXT, created_at TEXT, FOREIGN KEY(usuario_id) REFERENCES users(id)
    );
    INSERT INTO sales (id, usuario_id, total, medio_pago)
      VALUES (7,1,15000,'EFECTIVO'), (8,1,20000,'NEQUI'), (22,1,5000,'OTRO');
    CREATE TABLE sale_items (
      id INTEGER PRIMARY KEY, venta_id INTEGER NOT NULL, producto_id INTEGER,
      cantidad INTEGER, precio_unitario REAL, subtotal REAL,
      FOREIGN KEY(venta_id) REFERENCES sales(id)
    );
    CREATE TABLE facturas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL UNIQUE,
      consecutivo TEXT NOT NULL UNIQUE,
      nombre_cliente TEXT NOT NULL DEFAULT 'Consumidor Final',
      fecha_emision DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      estado TEXT NOT NULL DEFAULT 'EMITIDA',
      FOREIGN KEY (venta_id) REFERENCES sales(id)
    );
  `);
  const repo = new SQLiteVentaRepository(db);
  return { db, repo, service: new FacturacionService(repo, null) };
}

test('SD-119: genera factura F-0001 vinculada a una venta y guarda los datos', async () => {
  const { db, service } = escenario();
  try {
    const r = await service.generarFactura(7, '  María  ');
    assert.equal(r.isSuccess, true, r.error);
    const f = r.getValue();
    assert.ok(f instanceof Factura);
    assert.equal(f.consecutivo, 'F-0001');
    assert.equal(f.ventaId, 7);
    assert.equal(f.nombreCliente, 'María');
    assert.equal(f.estado, 'EMITIDA');
    assert.ok(f.fechaEmision);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  } finally { db.close(); }
});

test('SD-119: consecutivo avanza por factura, no por ID de venta', async () => {
  const { db, service } = escenario();
  try {
    assert.equal((await service.generarFactura(22)).getValue().consecutivo, 'F-0001');
    assert.equal((await service.generarFactura(7)).getValue().consecutivo, 'F-0002');
    assert.equal((await service.generarFactura(8)).getValue().consecutivo, 'F-0003');
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM facturas').get().n, 3);
  } finally { db.close(); }
});

test('SD-119: evita facturas duplicadas y no consume el siguiente consecutivo', async () => {
  const { db, service } = escenario();
  try {
    await service.generarFactura(7);
    const r = await service.generarFactura(7);
    assert.equal(r.isFailure, true);
    assert.match(r.error, /ya tiene una factura/i);
    assert.equal((await service.generarFactura(8)).getValue().consecutivo, 'F-0002');
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM facturas').get().n, 2);
  } finally { db.close(); }
});

test('SD-119: rechaza venta inexistente, IDs inválidos y nombre no textual', async () => {
  const { db, service } = escenario();
  try {
    for (const id of [0, -2, 1.5, 'abc', null]) {
      assert.equal((await service.generarFactura(id)).isFailure, true);
    }
    assert.equal((await service.generarFactura(999)).isFailure, true);
    assert.equal((await service.generarFactura(7, { nombre: 'N' })).isFailure, true);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM facturas').get().n, 0);
  } finally { db.close(); }
});

test('SD-119: recupera el consecutivo máximo aun con números existentes', async () => {
  const { db, service, repo } = escenario();
  try {
    db.prepare(`INSERT INTO facturas (venta_id, consecutivo, nombre_cliente)
      VALUES (?, ?, ?)`).run(7, 'F-0099', 'Existente');
    const r = await service.generarFactura(8);
    assert.equal(r.isSuccess, true, r.error);
    assert.equal(r.getValue().consecutivo, 'F-0100');
    const buscada = await repo.buscarFacturaPorConsecutivo('F-0100');
    assert.equal(buscada.ventaId, 8);
  } finally { db.close(); }
});

test('SD-119: fallo al insertar revierte la transacción y no crea factura', async () => {
  const { db, service } = escenario();
  try {
    db.exec(`CREATE TRIGGER bloquear_factura BEFORE INSERT ON facturas
      BEGIN SELECT RAISE(ABORT, 'fallo simulado'); END;`);
    const r = await service.generarFactura(7);
    assert.equal(r.isFailure, true);
    assert.match(r.error, /fallo simulado/);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM facturas').get().n, 0);
    db.exec('DROP TRIGGER bloquear_factura');
    assert.equal((await service.generarFactura(7)).getValue().consecutivo, 'F-0001');
  } finally { db.close(); }
});
