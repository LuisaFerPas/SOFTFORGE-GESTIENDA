/**
 * HU-0801 — Pruebas automatizadas: Consulta del listado de pagos del día.
 *
 * Criterios de aceptación:
 *  CA-1: Consulta exitosa de pagos del día (fecha actual, hora, monto, medio de pago, transacción).
 *  CA-2: Visualización del medio de pago (Efectivo, Nequi, etc.).
 *  CA-3: Asociación con venta o apartado (tipo 'VENTA' o 'APARTADO' y referenciaId).
 *  CA-4: Sin pagos registrados -> retorna arreglo vacío [].
 *  CA-5: Endpoint protegido con verifyToken.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import express from 'express';
import jwt from 'jsonwebtoken';
import { PagosService } from '../src/modulos/reportes/servicios/PagosService.js';
import { crearPagosRoutes } from '../src/modulos/reportes/presentacion/pagosRoutes.js';

process.env.JWT_SECRET ||= 'clave-de-prueba-hu0801-no-usar-en-produccion';

function crearEscenario() {
  const db = new DatabaseSync(':memory:');

  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      username TEXT,
      role TEXT
    );
    INSERT INTO users VALUES (1, 'vendedor1', 'VENDEDOR');

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

  const servicio = new PagosService(db);
  return { db, servicio };
}

function generarToken(payload = { id: 1, role: 'VENDEDOR' }) {
  return jwt.sign(payload, process.env.JWT_SECRET);
}

// ─── Tests unitarios del servicio ─────────────────────────────────────────────

test('HU-0801 CA-4: cuando no hay pagos registrados hoy, retorna arreglo vacío []', async () => {
  const { servicio } = crearEscenario();

  const pagos = await servicio.consultarPagosDelDia();
  assert.ok(Array.isArray(pagos), 'Debe ser un arreglo');
  assert.equal(pagos.length, 0, 'El arreglo debe estar vacío');
});

test('HU-0801 CA-1, CA-2, CA-3: consulta pagos del día combinando ventas y apartados', async () => {
  const { db, servicio } = crearEscenario();
  const hoy = PagosService.hoyBogota();

  // Insertar una venta hoy (hora 10:30 UTC -> 05:30 Colombia)
  db.prepare(`
    INSERT INTO sales (usuario_id, total, medio_pago, monto_efectivo, created_at)
    VALUES (1, 45000, 'EFECTIVO', 45000, '${hoy} 15:30:00')
  `).run();

  // Insertar un abono hoy (hora 11:00 UTC -> 06:00 Colombia)
  db.prepare(`
    INSERT INTO apartado_abonos (apartado_id, usuario_id, monto, medio_pago, saldo_restante, created_at)
    VALUES (7, 1, 20000, 'NEQUI', 10000, '${hoy} 16:00:00')
  `).run();

  // Insertar una venta de ayer (no debe salir)
  db.prepare(`
    INSERT INTO sales (usuario_id, total, medio_pago, monto_efectivo, created_at)
    VALUES (1, 10000, 'EFECTIVO', 10000, '2020-01-01 12:00:00')
  `).run();

  const pagos = await servicio.consultarPagosDelDia(hoy);

  assert.equal(pagos.length, 2, 'Deben haber 2 pagos registrados hoy');

  // El más reciente primero (abono a las 16:00 UTC)
  const [pago1, pago2] = pagos;

  assert.equal(pago1.tipo, 'APARTADO');
  assert.equal(pago1.monto, 20000);
  assert.equal(pago1.medioPago, 'NEQUI');
  assert.equal(pago1.referenciaId, 7);
  assert.ok(pago1.hora, 'Debe incluir la hora');

  assert.equal(pago2.tipo, 'VENTA');
  assert.equal(pago2.monto, 45000);
  assert.equal(pago2.medioPago, 'EFECTIVO');
  assert.equal(pago2.referenciaId, 1);
  assert.ok(pago2.hora, 'Debe incluir la hora');
});

// ─── Tests de la ruta HTTP ───────────────────────────────────────────────────

test('HU-0801 CA-5: GET /api/pagos/dia exige autenticación con verifyToken', async () => {
  const { db } = crearEscenario();
  const app = express();
  app.use('/api/pagos', crearPagosRoutes(db));

  const server = app.listen(0);
  const puerto = server.address().port;

  try {
    const respuesta = await fetch(`http://127.0.0.1:${puerto}/api/pagos/dia`);
    assert.equal(respuesta.status, 401, 'Debe responder 401 Unauthorized sin token');
  } finally {
    server.close();
  }
});

test('HU-0801 CA-1 HTTP: GET /api/pagos/dia con token válido responde 200 y listado', async () => {
  const { db } = crearEscenario();
  const hoy = PagosService.hoyBogota();

  db.prepare(`
    INSERT INTO sales (usuario_id, total, medio_pago, monto_efectivo, created_at)
    VALUES (1, 35000, 'EFECTIVO', 35000, '${hoy} 14:00:00')
  `).run();

  const app = express();
  app.use('/api/pagos', crearPagosRoutes(db));

  const server = app.listen(0);
  const puerto = server.address().port;

  try {
    const token = generarToken();
    const respuesta = await fetch(`http://127.0.0.1:${puerto}/api/pagos/dia`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(respuesta.status, 200);
    const body = await respuesta.json();
    assert.equal(body.success, true);
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].tipo, 'VENTA');
    assert.equal(body.data[0].monto, 35000);
  } finally {
    server.close();
  }
});
