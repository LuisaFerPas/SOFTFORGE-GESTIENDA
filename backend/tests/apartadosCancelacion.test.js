/**
 * HU-0703.5 — Pruebas automatizadas: cancelación de apartados y devolución de stock.
 *
 * Cubre los criterios de aceptación:
 *  CA-1: Cancelación exitosa → apartado pasa a estado CANCELADO.
 *  CA-2: Liberación de productos → el stock de cada producto se restaura en products.
 *  CA-3: Conservación de abonos → los registros en apartado_abonos no se modifican.
 *  CA-4: Cancelación de apartado inexistente → lanza error con status 404.
 *  CA-5: Cancelación de apartado COMPLETADO → lanza error con status 409.
 *  CA-6: Cancelación de apartado ya CANCELADO → lanza error con status 409.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { SQLiteApartadoRepository } from '../src/modulos/apartados/infraestructura/persistencia/SQLiteApartadoRepository.js';
import { ApartadoService } from '../src/modulos/apartados/servicios/ApartadoService.js';
import { EventBus } from '../src/shared/EventBus.js';

process.env.JWT_SECRET ||= 'clave-de-prueba-hu0703-no-usar-en-produccion';

// ─── Escenario de base de datos en memoria ────────────────────────────────────

function crearEscenario({ stockInicial = 10 } = {}) {
  const db = new DatabaseSync(':memory:');

  db.exec(`
    CREATE TABLE users (id INTEGER PRIMARY KEY);
    INSERT INTO users VALUES (1);

    CREATE TABLE products (
      id INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      stock_actual INTEGER NOT NULL DEFAULT 0
    );
    INSERT INTO products VALUES (1, 'Tornillo M6', ${stockInicial});
    INSERT INTO products VALUES (2, 'Puntilla 2"', ${stockInicial});

    CREATE TABLE stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      cantidad INTEGER NOT NULL,
      stock_anterior INTEGER NOT NULL DEFAULT 0,
      stock_nuevo INTEGER NOT NULL DEFAULT 0,
      costo_unitario REAL DEFAULT 0,
      motivo TEXT,
      usuario_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE apartados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE NOT NULL,
      cliente_nombre TEXT NOT NULL,
      cliente_telefono TEXT,
      usuario_id INTEGER NOT NULL,
      total_productos REAL NOT NULL,
      abono_inicial REAL NOT NULL,
      saldo_pendiente REAL NOT NULL,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_limite TEXT,
      estado TEXT NOT NULL DEFAULT 'ACTIVO'
    );

    CREATE TABLE apartado_productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      apartado_id INTEGER NOT NULL,
      producto_id INTEGER NOT NULL,
      cantidad INTEGER NOT NULL,
      precio_unitario REAL NOT NULL,
      subtotal REAL NOT NULL
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

  const repositorio = new SQLiteApartadoRepository(db);
  const eventBus = new EventBus();
  const productoRepositoryStub = {}; // No se usa en cancelación
  const servicio = new ApartadoService(repositorio, eventBus, productoRepositoryStub);

  return { db, repositorio, servicio };
}

function insertarApartado(db, { estado = 'ACTIVO', cantidadProd1 = 3, cantidadProd2 = 0 } = {}) {
  db.prepare(`
    INSERT INTO apartados (codigo, cliente_nombre, usuario_id, total_productos, abono_inicial, saldo_pendiente, estado)
    VALUES ('AP-TEST-01', 'Cliente Test', 1, 60000, 20000, 40000, ?)
  `).run(estado);

  const apartadoId = db.prepare('SELECT last_insert_rowid() AS id').get().id;

  if (cantidadProd1 > 0) {
    db.prepare(`
      INSERT INTO apartado_productos (apartado_id, producto_id, cantidad, precio_unitario, subtotal)
      VALUES (?, 1, ?, 10000, ?)
    `).run(apartadoId, cantidadProd1, cantidadProd1 * 10000);
  }

  if (cantidadProd2 > 0) {
    db.prepare(`
      INSERT INTO apartado_productos (apartado_id, producto_id, cantidad, precio_unitario, subtotal)
      VALUES (?, 2, ?, 10000, ?)
    `).run(apartadoId, cantidadProd2, cantidadProd2 * 10000);
  }

  // Insertar abono inicial de registro
  db.prepare(`
    INSERT INTO apartado_abonos (apartado_id, usuario_id, monto, medio_pago, saldo_restante)
    VALUES (?, 1, 20000, 'EFECTIVO', 40000)
  `).run(apartadoId);

  return apartadoId;
}

// ─── CA-1: Cancelación exitosa ────────────────────────────────────────────────

test('HU-0703 CA-1: cancelar un apartado ACTIVO cambia su estado a CANCELADO', async () => {
  const { db, servicio } = crearEscenario();
  const id = insertarApartado(db);

  const resultado = await servicio.cancelarApartado(id);

  assert.ok(!resultado.isFailure, `Se esperaba éxito pero hubo error: ${JSON.stringify(resultado.error)}`);

  const fila = db.prepare('SELECT estado FROM apartados WHERE id = ?').get(id);
  assert.equal(fila.estado, 'CANCELADO', 'El estado debe ser CANCELADO');
});

// ─── CA-2: Devolución de stock al inventario ──────────────────────────────────

test('HU-0703 CA-2: cancelar un apartado devuelve el stock reservado a products', async () => {
  const stockInicial = 10;
  const cantidadReservada = 3;
  const { db, servicio } = crearEscenario({ stockInicial });
  const id = insertarApartado(db, { cantidadProd1: cantidadReservada });

  await servicio.cancelarApartado(id);

  const filaStock = db.prepare('SELECT stock_actual FROM products WHERE id = 1').get();
  assert.equal(
    filaStock.stock_actual,
    stockInicial + cantidadReservada,
    `El stock debe haberse restaurado de ${stockInicial} a ${stockInicial + cantidadReservada}`
  );
});

test('HU-0703 CA-2: se registra un movimiento de ENTRADA en stock_movements por cada producto devuelto', async () => {
  const { db, servicio } = crearEscenario();
  const id = insertarApartado(db, { cantidadProd1: 2, cantidadProd2: 5 });

  await servicio.cancelarApartado(id);

  const movimientos = db.prepare(`
    SELECT * FROM stock_movements
    WHERE tipo = 'ENTRADA' AND motivo LIKE '%cancelaci%'
  `).all();

  assert.equal(movimientos.length, 2, 'Deben registrarse 2 movimientos de entrada (uno por producto)');
});

// ─── CA-3: Conservación del historial de abonos ───────────────────────────────

test('HU-0703 CA-3: cancelar un apartado NO elimina ni modifica los abonos registrados', async () => {
  const { db, servicio } = crearEscenario();
  const id = insertarApartado(db);

  const abonosAntes = db.prepare('SELECT COUNT(*) AS total FROM apartado_abonos WHERE apartado_id = ?').get(id).total;

  await servicio.cancelarApartado(id);

  const abonosDespues = db.prepare('SELECT COUNT(*) AS total FROM apartado_abonos WHERE apartado_id = ?').get(id).total;
  assert.equal(abonosDespues, abonosAntes, 'El número de abonos no debe cambiar al cancelar');
});

// ─── CA-4: Apartado inexistente → 404 ────────────────────────────────────────

test('HU-0703 CA-4: cancelar un apartado que no existe retorna failure con status 404', async () => {
  const { servicio } = crearEscenario();

  const resultado = await servicio.cancelarApartado(99999);

  assert.ok(resultado.isFailure, 'Se esperaba un resultado de fallo');
  assert.equal(resultado.error?.status, 404, 'El status de error debe ser 404');
});

// ─── CA-5: Apartado COMPLETADO → 409 ─────────────────────────────────────────

test('HU-0703 CA-5: cancelar un apartado COMPLETADO retorna failure con status 409', async () => {
  const { db, servicio } = crearEscenario();
  const id = insertarApartado(db, { estado: 'COMPLETADO' });

  const resultado = await servicio.cancelarApartado(id);

  assert.ok(resultado.isFailure, 'Se esperaba un resultado de fallo');
  assert.equal(resultado.error?.status, 409, 'El status de error debe ser 409');
});

// ─── CA-6: Apartado ya CANCELADO → 409 ───────────────────────────────────────

test('HU-0703 CA-6: cancelar un apartado ya CANCELADO retorna failure con status 409', async () => {
  const { db, servicio } = crearEscenario();
  const id = insertarApartado(db, { estado: 'CANCELADO' });

  const resultado = await servicio.cancelarApartado(id);

  assert.ok(resultado.isFailure, 'Se esperaba un resultado de fallo');
  assert.equal(resultado.error?.status, 409, 'El status de error debe ser 409');
});

// ─── CA-7: ID inválido → 400 ──────────────────────────────────────────────────

test('HU-0703 CA-7: cancelar con ID no numérico retorna failure con status 400', async () => {
  const { servicio } = crearEscenario();

  const resultado = await servicio.cancelarApartado('abc');

  assert.ok(resultado.isFailure, 'Se esperaba un resultado de fallo con ID no numérico');
  assert.equal(resultado.error?.status, 400, 'El status de error debe ser 400');
});
