import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

// Antes de importar el middleware: clave de firma exclusiva de esta prueba.
process.env.JWT_SECRET ||= 'clave-de-prueba-sd122-no-usar-en-produccion';
const { default: express } = await import('express');
const { default: jwt } = await import('jsonwebtoken');
const { crearVentasRoutes } = await import('../src/modulos/ventas/presentacion/ventasRoutes.js');
const { VentaController } = await import('../src/modulos/ventas/presentacion/ventaController.js');
const { FacturacionService } = await import('../src/modulos/ventas/servicios/FacturacionService.js');
const { SQLiteVentaRepository } = await import('../src/modulos/ventas/infraestructura/persistencia/SQLiteVentaRepository.js');

async function escenario() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE users(id INTEGER PRIMARY KEY);
    INSERT INTO users VALUES(1);
    CREATE TABLE sales(id INTEGER PRIMARY KEY, usuario_id INTEGER, total REAL,
      medio_pago TEXT, created_at TEXT);
    INSERT INTO sales VALUES(7,1,20000,'EFECTIVO','2026-10-25T14:00:00.000Z');
    CREATE TABLE sale_items(id INTEGER PRIMARY KEY, venta_id INTEGER,
      producto_id INTEGER, cantidad INTEGER, precio_unitario REAL, subtotal REAL);
    INSERT INTO sale_items VALUES(1,7,10,2,10000,20000);
    CREATE TABLE facturas(id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL UNIQUE, consecutivo TEXT NOT NULL UNIQUE,
      nombre_cliente TEXT NOT NULL DEFAULT 'Consumidor Final',
      fecha_emision TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      estado TEXT NOT NULL DEFAULT 'EMITIDA',
      FOREIGN KEY(venta_id) REFERENCES sales(id));
    INSERT INTO facturas VALUES(1,7,'F-0001','Consumidor Final','2026-10-25T14:05:00.000Z','EMITIDA');
  `);
  const repo = new SQLiteVentaRepository(db);
  const service = new FacturacionService(repo, null);
  const controller = new VentaController(null, service);
  const app = express();
  app.use(express.json());
  app.use('/api/ventas', crearVentasRoutes(controller));
  const server = await new Promise(resolve => {
    const serverRef = app.listen(0, '127.0.0.1', () => resolve(serverRef));
  });
  return {
    db,
    url: `http://127.0.0.1:${server.address().port}/api/ventas/facturas`,
    close: async () => {
      await new Promise((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
      db.close();
    }
  };
}

function jwtValido() {
  return jwt.sign({ id: 1, username: 'vendedor', role: 'VENDEDOR' }, process.env.JWT_SECRET);
}
async function post(url, token) {
  const response = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return { status: response.status, body: await response.json() };
}

test('SD-122 HTTP: sin token no permite consultar la factura', async () => {
  const e = await escenario();
  try {
    const r = await post(`${e.url}/F-0001/reimprimir`);
    assert.equal(r.status, 401);
    assert.equal(r.body.success, false);
  } finally { await e.close(); }
});

test('SD-122 HTTP: token incorrecto responde 401', async () => {
  const e = await escenario();
  try {
    const r = await post(`${e.url}/F-0001/reimprimir`, 'token-invalido');
    assert.equal(r.status, 401);
  } finally { await e.close(); }
});

test('SD-122 HTTP: JWT válido encuentra factura EMITIDA y responde 200 sin fingir impresión', async () => {
  const e = await escenario();
  try {
    const r = await post(`${e.url}/F-0001/reimprimir`, jwtValido());
    assert.equal(r.status, 200);
    assert.equal(r.body.success, true);
    assert.equal(r.body.data.factura.consecutivo, 'F-0001');
    assert.equal(r.body.data.venta.total, 20000);
    assert.equal(r.body.data.impresionRealizada, false);
    assert.match(r.body.message, /impresión física/i);
    assert.equal(e.db.prepare('SELECT COUNT(*) n FROM facturas').get().n, 1);
  } finally { await e.close(); }
});

test('SD-122 HTTP: consecutivo inexistente responde 404 con explicación', async () => {
  const e = await escenario();
  try {
    const r = await post(`${e.url}/F-9999/reimprimir`, jwtValido());
    assert.equal(r.status, 404);
    assert.match(r.body.message, /no se encontró una factura/i);
  } finally { await e.close(); }
});

test('SD-122 HTTP: no permite reimprimir una factura ANULADA', async () => {
  const e = await escenario();
  try {
    e.db.prepare("UPDATE facturas SET estado='ANULADA' WHERE id=1").run();
    const r = await post(`${e.url}/F-0001/reimprimir`, jwtValido());
    assert.equal(r.status, 409);
    assert.match(r.body.message, /anulada/i);
  } finally { await e.close(); }
});
