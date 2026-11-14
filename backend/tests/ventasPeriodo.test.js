/**
 * HU-0901 — Pruebas automatizadas: Reportes de ventas por período.
 *
 * Criterios de aceptación:
 *  CA-1: Consulta de ventas por período (Día, Semana, Mes, Año).
 *        Retorna total de ventas, número de transacciones y ticket promedio.
 *  CA-2: Período sin ventas -> 0 ventas, 0 transacciones, ticket promedio 0.
 *  CA-4: Acceso restringido:
 *        - Sin token -> 401 Unauthorized.
 *        - Rol VENDEDOR -> 403 Forbidden.
 *        - Rol ADMINISTRADOR -> 200 OK.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import express from 'express';
import jwt from 'jsonwebtoken';
import { EstadisticasService } from '../src/modulos/reportes/servicios/EstadisticasService.js';
import { ReporteController } from '../src/modulos/reportes/presentacion/reporteController.js';
import { crearReportesRoutes } from '../src/modulos/reportes/presentacion/reportesRoutes.js';

process.env.JWT_SECRET ||= 'clave-de-prueba-hu0901-no-usar-en-produccion';

function crearEscenario() {
  const db = new DatabaseSync(':memory:');

  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      username TEXT,
      role TEXT
    );
    INSERT INTO users VALUES (1, 'admin1', 'ADMINISTRADOR');
    INSERT INTO users VALUES (2, 'vendedor1', 'VENDEDOR');

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
  `);

  const servicio = new EstadisticasService(db);
  const controller = new ReporteController(servicio);
  return { db, servicio, controller };
}

function generarToken(role = 'ADMINISTRADOR', id = 1) {
  return jwt.sign({ id, role }, process.env.JWT_SECRET);
}

// ─── Tests unitarios de EstadisticasService ────────────────────────────────────

test('HU-0901 CA-2: período sin ventas retorna 0 transacciones y ticket promedio 0', async () => {
  const { servicio } = crearEscenario();

  const resultado = await servicio.consultarVentasPorPeriodo('MES');

  assert.equal(resultado.periodo, 'MES');
  assert.equal(resultado.totalVentas, 0);
  assert.equal(resultado.numeroTransacciones, 0);
  assert.equal(resultado.ticketPromedio, 0);
});

test('HU-0901 CA-1: calcula total, transacciones y ticket promedio para DIA', async () => {
  const { db, servicio } = crearEscenario();

  // Fecha actual en Bogotá
  const hoyRow = db.prepare("SELECT date('now', '-5 hours') as hoy").get();
  const hoy = hoyRow.hoy;

  // Insertar 2 ventas hoy
  db.prepare(`
    INSERT INTO sales (usuario_id, total, medio_pago, created_at)
    VALUES (1, 30000, 'EFECTIVO', '${hoy} 14:00:00')
  `).run();

  db.prepare(`
    INSERT INTO sales (usuario_id, total, medio_pago, created_at)
    VALUES (1, 20000, 'NEQUI', '${hoy} 16:30:00')
  `).run();

  // Insertar una venta del mes pasado (no debe sumar en DIA)
  db.prepare(`
    INSERT INTO sales (usuario_id, total, medio_pago, created_at)
    VALUES (1, 50000, 'EFECTIVO', '2020-01-01 12:00:00')
  `).run();

  const resultado = await servicio.consultarVentasPorPeriodo('DIA');

  assert.equal(resultado.periodo, 'DIA');
  assert.equal(resultado.totalVentas, 50000);
  assert.equal(resultado.numeroTransacciones, 2);
  assert.equal(resultado.ticketPromedio, 25000); // 50000 / 2
});

test('HU-0901 CA-1: calcula correctamente para períodos SEMANA, MES y AÑO', async () => {
  const { db, servicio } = crearEscenario();
  const hoyRow = db.prepare("SELECT date('now', '-5 hours') as hoy").get();
  const hoy = hoyRow.hoy;

  db.prepare(`
    INSERT INTO sales (usuario_id, total, medio_pago, created_at)
    VALUES (1, 10000, 'EFECTIVO', '${hoy} 12:00:00')
  `).run();

  const sem = await servicio.consultarVentasPorPeriodo('SEMANA');
  assert.equal(sem.periodo, 'SEMANA');
  assert.equal(sem.numeroTransacciones, 1);
  assert.equal(sem.totalVentas, 10000);

  const mes = await servicio.consultarVentasPorPeriodo('MES');
  assert.equal(mes.periodo, 'MES');
  assert.equal(mes.numeroTransacciones, 1);

  const ano = await servicio.consultarVentasPorPeriodo('AÑO');
  assert.equal(ano.periodo, 'AÑO');
  assert.equal(ano.numeroTransacciones, 1);
});

// ─── Tests HTTP & Control de acceso RBAC (CA-4) ───────────────────────────────

test('HU-0901 CA-4: GET /api/estadisticas/ventas sin token responde 401', async () => {
  const { controller } = crearEscenario();
  const app = express();
  app.use('/api/estadisticas', crearReportesRoutes(controller));

  const server = app.listen(0);
  const puerto = server.address().port;

  try {
    const respuesta = await fetch(`http://127.0.0.1:${puerto}/api/estadisticas/ventas?periodo=MES`);
    assert.equal(respuesta.status, 401);
  } finally {
    server.close();
  }
});

test('HU-0901 CA-4: GET /api/estadisticas/ventas con rol VENDEDOR responde 403 (Acceso restringido)', async () => {
  const { controller } = crearEscenario();
  const app = express();
  app.use('/api/estadisticas', crearReportesRoutes(controller));

  const server = app.listen(0);
  const puerto = server.address().port;

  try {
    const tokenVendedor = generarToken('VENDEDOR', 2);
    const respuesta = await fetch(`http://127.0.0.1:${puerto}/api/estadisticas/ventas?periodo=MES`, {
      headers: { Authorization: `Bearer ${tokenVendedor}` }
    });
    assert.equal(respuesta.status, 403);
  } finally {
    server.close();
  }
});

test('HU-0901 CA-1 HTTP: GET /api/estadisticas/ventas con rol ADMINISTRADOR responde 200 con KPIs', async () => {
  const { db, controller } = crearEscenario();
  const hoyRow = db.prepare("SELECT date('now', '-5 hours') as hoy").get();

  db.prepare(`
    INSERT INTO sales (usuario_id, total, medio_pago, created_at)
    VALUES (1, 80000, 'EFECTIVO', '${hoyRow.hoy} 10:00:00')
  `).run();

  const app = express();
  app.use('/api/estadisticas', crearReportesRoutes(controller));

  const server = app.listen(0);
  const puerto = server.address().port;

  try {
    const tokenAdmin = generarToken('ADMINISTRADOR', 1);
    const respuesta = await fetch(`http://127.0.0.1:${puerto}/api/estadisticas/ventas?periodo=MES`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` }
    });

    assert.equal(respuesta.status, 200);
    const body = await respuesta.json();
    assert.equal(body.success, true);
    assert.equal(body.data.totalVentas, 80000);
    assert.equal(body.data.numeroTransacciones, 1);
    assert.equal(body.data.ticketPromedio, 80000);
  } finally {
    server.close();
  }
});
