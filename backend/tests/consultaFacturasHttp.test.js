import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import express from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../src/modulos/usuarios/presentacion/authMiddleware.js';
import { crearConsultaFacturasRoutes } from '../src/modulos/ventas/presentacion/consultaFacturasRoutes.js';

async function escenario() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE facturas (id INTEGER PRIMARY KEY, venta_id INTEGER, consecutivo TEXT, nombre_cliente TEXT, fecha_emision TEXT, estado TEXT);
    CREATE TABLE sales (id INTEGER PRIMARY KEY, total REAL, medio_pago TEXT, monto_efectivo REAL, monto_nequi REAL, monto_otro REAL, cambio REAL, created_at TEXT);
    CREATE TABLE products (id INTEGER PRIMARY KEY, nombre TEXT);
    CREATE TABLE sale_items (id INTEGER PRIMARY KEY, venta_id INTEGER, producto_id INTEGER, cantidad INTEGER, precio_unitario REAL, subtotal REAL);
    INSERT INTO sales VALUES (3, 9000, 'EFECTIVO', 10000, 0, 0, 1000, '2026-10-25T17:00:00');
    INSERT INTO facturas VALUES (1, 3, 'F-0001', 'Consumidor Final', '2026-10-25T17:00:00', 'EMITIDA');
    INSERT INTO products VALUES (7, 'Carro de juguete');
    INSERT INTO sale_items VALUES (1, 3, 7, 1, 9000, 9000);
  `);
  const app = express();
  app.use('/api/ventas/facturas', crearConsultaFacturasRoutes(db));
  const server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  return {
    db, server,
    base: `http://127.0.0.1:${server.address().port}/api/ventas/facturas`,
    token: jwt.sign({id:1,role:'VENDEDOR'}, JWT_SECRET)
  };
}
async function cerrar({server,db}) {
  await new Promise((resolve,reject) => server.close(e => e ? reject(e) : resolve()));
  db.close();
}

test('historial HTTP: JWT obligatorio', async () => {
  const e = await escenario();
  try {
    const r = await fetch(e.base);
    assert.equal(r.status,401);
  } finally { await cerrar(e); }
});

test('historial HTTP: lista facturas emitidas con token válido', async () => {
  const e = await escenario();
  try {
    const r = await fetch(e.base,{headers:{Authorization:`Bearer ${e.token}`}});
    const body = await r.json();
    assert.equal(r.status,200);
    assert.equal(body.data[0].consecutivo,'F-0001');
    assert.equal(body.paginacion.total,1);
  } finally { await cerrar(e); }
});

test('historial HTTP: detalle trae productos, nombre y total', async () => {
  const e = await escenario();
  try {
    const r = await fetch(`${e.base}/F-0001`,{headers:{Authorization:`Bearer ${e.token}`}});
    const body = await r.json();
    assert.equal(r.status,200);
    assert.equal(body.data.items[0].nombre,'Carro de juguete');
    assert.equal(body.data.total,9000);
  } finally { await cerrar(e); }
});

test('historial HTTP: factura no encontrada 404', async () => {
  const e = await escenario();
  try {
    const r = await fetch(`${e.base}/F-9999`,{headers:{Authorization:`Bearer ${e.token}`}});
    assert.equal(r.status,404);
  } finally { await cerrar(e); }
});
