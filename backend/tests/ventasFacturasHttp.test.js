import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

// Se fija antes de importar authMiddleware (que comprueba JWT_SECRET al cargar).
process.env.JWT_SECRET ||= 'clave-de-prueba-sd120-no-usar-en-produccion';
const { default: express } = await import('express');
const { default: jwt } = await import('jsonwebtoken');
const { crearVentasRoutes } = await import('../src/modulos/ventas/presentacion/ventasRoutes.js');
const { VentaController } = await import('../src/modulos/ventas/presentacion/ventaController.js');
const { FacturacionService } = await import('../src/modulos/ventas/servicios/FacturacionService.js');
const { SQLiteVentaRepository } = await import('../src/modulos/ventas/infraestructura/persistencia/SQLiteVentaRepository.js');

function prepararDB() {
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
  return db;
}

async function prepararServidor() {
  const db = prepararDB();
  const servicio = new FacturacionService(new SQLiteVentaRepository(db), null);
  const controller = new VentaController(null, servicio);
  const app = express();
  app.use(express.json());
  app.use('/api/ventas', crearVentasRoutes(controller));
  const server = await new Promise(resolve => {
    const instancia = app.listen(0, '127.0.0.1', () => resolve(instancia));
  });
  const direccion = `http://127.0.0.1:${server.address().port}`;
  const cerrar = async () => {
    await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
    db.close();
  };
  return {db, url: `${direccion}/api/ventas/facturas`, cerrar};
}

async function post(url, body, token = null) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body)
  });
  return {status: response.status, body: await response.json()};
}

test('SD-120 HTTP: sin token responde 401 y no emite factura', async () => {
  const s = await prepararServidor();
  try {
    const r = await post(s.url, {ventaId: 7});
    assert.equal(r.status, 401);
    assert.equal(r.body.success, false);
    assert.equal(s.db.prepare('SELECT COUNT(*) n FROM facturas').get().n, 0);
  } finally { await s.cerrar(); }
});

test('SD-120 HTTP: token inválido devuelve 401', async () => {
  const s = await prepararServidor();
  try {
    const r = await post(s.url, {ventaId: 7}, 'token-invalido');
    assert.equal(r.status, 401);
    assert.equal(s.db.prepare('SELECT COUNT(*) n FROM facturas').get().n, 0);
  } finally { await s.cerrar(); }
});

test('SD-120 HTTP: con JWT válido crea la factura y devuelve el consecutivo', async () => {
  const s = await prepararServidor();
  try {
    const token = jwt.sign({ id: 1, username: 'vendedor', role: 'VENDEDOR' }, process.env.JWT_SECRET);
    const r = await post(s.url, {ventaId: 7, nombreCliente: 'Diana'}, token);
    assert.equal(r.status, 201);
    assert.equal(r.body.success, true);
    assert.equal(r.body.data.consecutivo, 'F-0001');
    assert.equal(r.body.data.nombreCliente, 'Diana');
    assert.equal(s.db.prepare('SELECT COUNT(*) n FROM facturas').get().n, 1);
  } finally { await s.cerrar(); }
});

test('SD-120 HTTP: protege contra duplicados incluso con token válido', async () => {
  const s = await prepararServidor();
  try {
    const token = jwt.sign({id: 1, role:'VENDEDOR'}, process.env.JWT_SECRET);
    assert.equal((await post(s.url, {ventaId:7}, token)).status, 201);
    const duplicada = await post(s.url, {ventaId:7}, token);
    assert.equal(duplicada.status, 409);
    assert.match(duplicada.body.message, /ya tiene una factura/i);
    assert.equal(s.db.prepare('SELECT COUNT(*) n FROM facturas').get().n, 1);
  } finally { await s.cerrar(); }
});

test('SD-120 HTTP: venta inexistente devuelve 404 con mensaje claro', async () => {
  const s = await prepararServidor();
  try {
    const token = jwt.sign({id:1,role:'ADMINISTRADOR'}, process.env.JWT_SECRET);
    const r = await post(s.url, {ventaId:999}, token);
    assert.equal(r.status, 404);
    assert.match(r.body.message, /no existe/i);
  } finally { await s.cerrar(); }
});
