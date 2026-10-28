import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import express from 'express';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'clave-pruebas';

const { crearEdicionFacturasRoutes } = await import(
  '../src/modulos/ventas/presentacion/edicionFacturasRoutes.js'
);
const { JWT_SECRET } = await import(
  '../src/modulos/usuarios/presentacion/authMiddleware.js'
);
const { asegurarEsquemaEdicion } = await import(
  '../src/modulos/ventas/infraestructura/persistencia/SQLiteEdicionFacturaRepository.js'
);

function crearDbLegada() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE users (id INTEGER PRIMARY KEY);
    INSERT INTO users VALUES (1), (2);

    CREATE TABLE products (
      id INTEGER PRIMARY KEY,
      codigo_interno TEXT NOT NULL,
      nombre TEXT NOT NULL,
      stock_actual INTEGER,
      precio_venta_unitario REAL NOT NULL,
      activo INTEGER NOT NULL DEFAULT 1
    );
    INSERT INTO products VALUES
      (10, 'P-010', 'Producto A', 10, 2500, 1),
      (20, 'P-020', 'Producto B', 5, 6000, 1);

    CREATE TABLE sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      total REAL NOT NULL,
      medio_pago TEXT NOT NULL,
      monto_efectivo REAL NOT NULL DEFAULT 0,
      monto_nequi REAL NOT NULL DEFAULT 0,
      monto_otro REAL NOT NULL DEFAULT 0,
      cambio REAL NOT NULL DEFAULT 0,
      created_at TEXT,
      FOREIGN KEY (usuario_id) REFERENCES users(id)
    );
    INSERT INTO sales (id, usuario_id, total, medio_pago, created_at)
    VALUES (1, 1, 8500, 'EFECTIVO', '2026-10-27T10:00:00');

    CREATE TABLE sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL,
      producto_id INTEGER NOT NULL,
      cantidad INTEGER NOT NULL,
      precio_unitario REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (venta_id) REFERENCES sales(id),
      FOREIGN KEY (producto_id) REFERENCES products(id)
    );
    INSERT INTO sale_items (venta_id, producto_id, cantidad, precio_unitario, subtotal)
    VALUES (1, 10, 1, 2500, 2500), (1, 20, 1, 6000, 6000);

    CREATE TABLE stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      cantidad INTEGER NOT NULL,
      stock_anterior INTEGER NOT NULL,
      stock_nuevo INTEGER NOT NULL,
      costo_unitario REAL DEFAULT 0,
      motivo TEXT,
      usuario_id INTEGER,
      created_at TEXT,
      FOREIGN KEY (producto_id) REFERENCES products(id)
    );
    INSERT INTO stock_movements
      (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id, created_at)
    VALUES
      (10, 'SALIDA_VENTA', 1, 11, 10, 'Venta #1', 1, '2026-10-27T10:00:00'),
      (20, 'SALIDA_VENTA', 1, 6, 5, 'Venta #1', 1, '2026-10-27T10:00:00');

    CREATE TABLE facturas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL UNIQUE,
      consecutivo TEXT NOT NULL UNIQUE,
      nombre_cliente TEXT NOT NULL DEFAULT 'Consumidor Final',
      fecha_emision DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      estado TEXT NOT NULL DEFAULT 'EMITIDA' CHECK(estado IN ('EMITIDA','ANULADA')),
      FOREIGN KEY (venta_id) REFERENCES sales(id)
    );
    CREATE UNIQUE INDEX idx_facturas_consecutivo ON facturas(consecutivo);
    INSERT INTO facturas (id, venta_id, consecutivo, nombre_cliente, fecha_emision, estado)
    VALUES (1, 1, 'F-0001', 'Cliente Original', '2026-10-27T10:00:00', 'EMITIDA');
    UPDATE sqlite_sequence SET seq = 7 WHERE name = 'facturas';
  `);
  return db;
}

async function crearEscenario() {
  const db = crearDbLegada();
  const app = express();
  app.use(express.json());
  app.use('/api/ventas/facturas', crearEdicionFacturasRoutes(db));
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  return {
    db,
    server,
    base: `http://127.0.0.1:${server.address().port}/api/ventas/facturas`,
    adminToken: jwt.sign({ id: 1, role: 'ADMINISTRADOR' }, JWT_SECRET),
    vendedorToken: jwt.sign({ id: 2, role: 'VENDEDOR' }, JWT_SECRET)
  };
}

async function cerrar({ server, db }) {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  db.close();
}

function pedir(escenario, ruta, { method = 'PUT', body, token } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return fetch(`${escenario.base}${ruta}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

test('HU-0404 D1: migra facturas, conserva datos y secuencia, y es idempotente', () => {
  const db = crearDbLegada();
  try {
    const antes = db.prepare(`
      SELECT id, venta_id, consecutivo, nombre_cliente, fecha_emision, estado
      FROM facturas ORDER BY id
    `).all();
    const secuenciaAntes = db.prepare(
      "SELECT seq FROM sqlite_sequence WHERE name = 'facturas'"
    ).get().seq;

    asegurarEsquemaEdicion(db);
    const columnas = db.prepare('PRAGMA table_info(facturas)').all().map((c) => c.name);
    assert.ok(columnas.includes('reemplaza_a'));
    assert.deepEqual(
      db.prepare(`
        SELECT id, venta_id, consecutivo, nombre_cliente, fecha_emision, estado
        FROM facturas ORDER BY id
      `).all(),
      antes
    );
    assert.equal(
      db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'facturas'").get().seq,
      secuenciaAntes
    );
    assert.equal(db.prepare(`
      SELECT COUNT(*) AS n FROM sqlite_master
      WHERE type = 'index' AND name = 'idx_facturas_venta_emitida'
    `).get().n, 1);

    asegurarEsquemaEdicion(db);
    assert.deepEqual(
      db.prepare(`
        SELECT id, venta_id, consecutivo, nombre_cliente, fecha_emision, estado
        FROM facturas ORDER BY id
      `).all(),
      antes
    );
  } finally {
    db.close();
  }
});

test('HU-0404: sin token responde 401 y VENDEDOR responde 403', async () => {
  const escenario = await crearEscenario();
  try {
    const sinToken = await pedir(escenario, '/F-0001', {
      body: { nombreCliente: 'Nuevo Cliente' }
    });
    assert.equal(sinToken.status, 401);

    const vendedor = await pedir(escenario, '/F-0001', {
      body: { nombreCliente: 'Nuevo Cliente' },
      token: escenario.vendedorToken
    });
    assert.equal(vendedor.status, 403);
  } finally {
    await cerrar(escenario);
  }
});

test('HU-0404: ADMINISTRADOR edita el nombre y reemplaza la factura', async () => {
  const escenario = await crearEscenario();
  try {
    const respuesta = await pedir(escenario, '/F-0001', {
      body: { nombreCliente: 'Cliente Corregido' },
      token: escenario.adminToken
    });
    const body = await respuesta.json();

    assert.equal(respuesta.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.anulada.consecutivo, 'F-0001');
    assert.equal(body.data.anulada.estado, 'ANULADA');
    assert.equal(body.data.nueva.estado, 'EMITIDA');
    assert.equal(body.data.nueva.ventaId, 1);
    assert.equal(body.data.nueva.nombreCliente, 'Cliente Corregido');
    assert.equal(body.data.nueva.reemplazaA, 'F-0001');
    assert.notEqual(body.data.nueva.consecutivo, 'F-0001');

    const filas = escenario.db.prepare(
      'SELECT consecutivo, estado, reemplaza_a FROM facturas ORDER BY id'
    ).all().map((fila) => ({ ...fila }));
    assert.deepEqual(filas, [
      { consecutivo: 'F-0001', estado: 'ANULADA', reemplaza_a: null },
      { consecutivo: body.data.nueva.consecutivo, estado: 'EMITIDA', reemplaza_a: 'F-0001' }
    ]);
  } finally {
    await cerrar(escenario);
  }
});

test('HU-0404: editar el nombre no modifica venta, ítems, stock ni movimientos', async () => {
  const escenario = await crearEscenario();
  try {
    const foto = () => ({
      sales: escenario.db.prepare('SELECT * FROM sales ORDER BY id').all(),
      items: escenario.db.prepare('SELECT * FROM sale_items ORDER BY id').all(),
      stock: escenario.db.prepare('SELECT id, stock_actual FROM products ORDER BY id').all(),
      movimientos: escenario.db.prepare('SELECT * FROM stock_movements ORDER BY id').all()
    });
    const antes = foto();

    const respuesta = await pedir(escenario, '/F-0001', {
      body: { nombreCliente: 'Otro Nombre' },
      token: escenario.adminToken
    });
    assert.equal(respuesta.status, 200);
    assert.deepEqual(foto(), antes);
  } finally {
    await cerrar(escenario);
  }
});

test('HU-0404: rechaza consecutivo inexistente, factura anulada, nombre inválido e idéntico', async () => {
  const escenario = await crearEscenario();
  try {
    const noExiste = await pedir(escenario, '/F-9999', {
      body: { nombreCliente: 'X' },
      token: escenario.adminToken
    });
    assert.equal(noExiste.status, 404);

    const invalido = await pedir(escenario, '/ABC', {
      body: { nombreCliente: 'X' },
      token: escenario.adminToken
    });
    assert.equal(invalido.status, 400);

    const noTexto = await pedir(escenario, '/F-0001', {
      body: { nombreCliente: 42 },
      token: escenario.adminToken
    });
    assert.equal(noTexto.status, 400);

    const muyLargo = await pedir(escenario, '/F-0001', {
      body: { nombreCliente: 'x'.repeat(151) },
      token: escenario.adminToken
    });
    assert.equal(muyLargo.status, 400);

    const identico = await pedir(escenario, '/F-0001', {
      body: { nombreCliente: 'Cliente Original' },
      token: escenario.adminToken
    });
    assert.equal(identico.status, 400);

    escenario.db.prepare(
      "UPDATE facturas SET estado = 'ANULADA' WHERE consecutivo = 'F-0001'"
    ).run();
    const anulada = await pedir(escenario, '/F-0001', {
      body: { nombreCliente: 'X' },
      token: escenario.adminToken
    });
    assert.equal(anulada.status, 409);
  } finally {
    await cerrar(escenario);
  }
});

test('HU-0404: dos ediciones encadenan consecutivos y dejan una sola EMITIDA', async () => {
  const escenario = await crearEscenario();
  try {
    const primera = await pedir(escenario, '/F-0001', {
      body: { nombreCliente: 'Primera Corrección' },
      token: escenario.adminToken
    });
    const primeraBody = await primera.json();
    assert.equal(primera.status, 200);

    const segunda = await pedir(escenario, `/${primeraBody.data.nueva.consecutivo}`, {
      body: { nombreCliente: 'Segunda Corrección' },
      token: escenario.adminToken
    });
    const segundaBody = await segunda.json();
    assert.equal(segunda.status, 200);
    assert.equal(segundaBody.data.nueva.reemplazaA, primeraBody.data.nueva.consecutivo);
    assert.notEqual(segundaBody.data.nueva.consecutivo, primeraBody.data.nueva.consecutivo);

    const filas = escenario.db.prepare(
      'SELECT consecutivo, estado, reemplaza_a FROM facturas ORDER BY id'
    ).all();
    assert.equal(filas.length, 3);
    assert.equal(filas.filter((f) => f.estado === 'EMITIDA').length, 1);
    assert.deepEqual(filas.map((f) => f.estado), ['ANULADA', 'ANULADA', 'EMITIDA']);
    assert.deepEqual(filas.map((f) => f.reemplaza_a), [
      null,
      'F-0001',
      primeraBody.data.nueva.consecutivo
    ]);
  } finally {
    await cerrar(escenario);
  }
});
