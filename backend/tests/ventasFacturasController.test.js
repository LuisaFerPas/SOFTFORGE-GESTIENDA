import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { VentaController } from '../src/modulos/ventas/presentacion/ventaController.js';
import { FacturacionService } from '../src/modulos/ventas/servicios/FacturacionService.js';
import { SQLiteVentaRepository } from '../src/modulos/ventas/infraestructura/persistencia/SQLiteVentaRepository.js';
import { Result } from '../src/shared/Result.js';

function preparar() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    PRAGMA foreign_keys=ON;
    CREATE TABLE users (id INTEGER PRIMARY KEY);
    INSERT INTO users VALUES (1);
    CREATE TABLE sales (id INTEGER PRIMARY KEY, usuario_id INTEGER, total REAL,
      medio_pago TEXT, created_at TEXT, FOREIGN KEY(usuario_id) REFERENCES users(id));
    INSERT INTO sales VALUES (7,1,15000,'NEQUI','2026-10-25T14:00:00.000Z');
    CREATE TABLE sale_items (id INTEGER PRIMARY KEY, venta_id INTEGER, producto_id INTEGER,
      cantidad INTEGER, precio_unitario REAL, subtotal REAL);
    CREATE TABLE facturas (id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL UNIQUE, consecutivo TEXT NOT NULL UNIQUE,
      nombre_cliente TEXT NOT NULL DEFAULT 'Consumidor Final',
      fecha_emision TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      estado TEXT NOT NULL DEFAULT 'EMITIDA',
      FOREIGN KEY (venta_id) REFERENCES sales(id));
  `);
  const repositorio = new SQLiteVentaRepository(db);
  const facturacionService = new FacturacionService(repositorio, null);
  const controller = new VentaController(null, facturacionService);
  return { db, controller };
}

async function llamar(controller, body) {
  let status = 200;
  let respuesta;
  const res = {
    status(value) { status = value; return this; },
    json(data) { respuesta = data; return this; }
  };
  await controller.crearFactura({ body, user: { id: 1, role: 'VENDEDOR' } }, res);
  return { status, respuesta };
}

test('SD-120: controlador devuelve HTTP 201 y consecutivo F-0001', async () => {
  const {db, controller} = preparar();
  try {
    const {status, respuesta} = await llamar(controller, {ventaId: 7, nombreCliente: 'Laura'});
    assert.equal(status, 201);
    assert.equal(respuesta.success, true);
    assert.equal(respuesta.data.consecutivo, 'F-0001');
    assert.equal(respuesta.data.nombreCliente, 'Laura');
    assert.equal(respuesta.data.ventaId, 7);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM facturas').get().n, 1);
  } finally { db.close(); }
});

test('SD-120: controlador impide IDs inválidos sin persistir', async () => {
  const {db, controller} = preparar();
  try {
    for (const ventaId of [null, '', 0, -1, 1.5, true, {}, '7x']) {
      const {status, respuesta} = await llamar(controller, {ventaId});
      assert.equal(status, 400);
      assert.equal(respuesta.success, false);
    }
    assert.equal(db.prepare('SELECT COUNT(*) n FROM facturas').get().n, 0);
  } finally { db.close(); }
});

test('SD-120: venta inexistente genera 404 y la duplicada 409', async () => {
  const {db, controller} = preparar();
  try {
    const noExiste = await llamar(controller, {ventaId: 999});
    assert.equal(noExiste.status, 404);
    assert.match(noExiste.respuesta.message, /no existe/i);
    assert.equal((await llamar(controller, {ventaId: 7})).status, 201);
    const duplicada = await llamar(controller, {ventaId: 7});
    assert.equal(duplicada.status, 409);
    assert.match(duplicada.respuesta.message, /ya tiene una factura/i);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM facturas').get().n, 1);
  } finally { db.close(); }
});

test('SD-120: rechazo de nombre no textual o muy largo', async () => {
  const {db, controller} = preparar();
  try {
    for (const nombreCliente of [42, {}, 'x'.repeat(151)]) {
      const {status} = await llamar(controller, {ventaId: 7, nombreCliente});
      assert.equal(status, 400);
    }
    assert.equal(db.prepare('SELECT COUNT(*) n FROM facturas').get().n, 0);
  } finally { db.close(); }
});

test('SD-120: no revela detalles internos si falla la persistencia', async () => {
  const controller = new VentaController(null, {
    async generarFactura() { return Result.fail('SQLITE_ERROR: contenido interno'); }
  });
  const {status, respuesta} = await llamar(controller, {ventaId: 7});
  assert.equal(status, 500);
  assert.equal(respuesta.success, false);
  assert.doesNotMatch(respuesta.message, /SQLITE_ERROR/);
});
