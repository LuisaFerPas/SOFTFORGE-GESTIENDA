
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

import { Venta } from '../src/modulos/ventas/dominio/Venta.js';
import { VentaService } from '../src/modulos/ventas/servicios/VentaService.js';
import { SQLiteVentaRepository } from '../src/modulos/ventas/infraestructura/persistencia/SQLiteVentaRepository.js';

// Base de datos temporal: no modifica el inventario real.
function prepararEscenario() {
  const db = new DatabaseSync(':memory:');

  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE users (
      id INTEGER PRIMARY KEY
    );

    INSERT INTO users (id) VALUES (1);

    CREATE TABLE products (
      id INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      precio_venta_unitario REAL NOT NULL,
      stock_actual INTEGER,
      fecha_ultima_venta TEXT,
      activo INTEGER DEFAULT 1
    );

    INSERT INTO products
      (id, nombre, precio_venta_unitario, stock_actual)
    VALUES
      (10, 'Producto de prueba A', 1000, 5),
      (20, 'Producto de prueba B', 2500, 0);

    CREATE TABLE sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      total REAL NOT NULL,
      medio_pago TEXT NOT NULL,
      monto_efectivo REAL NOT NULL,
      monto_nequi REAL NOT NULL,
      cambio REAL NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL,
      producto_id INTEGER NOT NULL,
      cantidad INTEGER NOT NULL,
      precio_unitario REAL NOT NULL,
      subtotal REAL NOT NULL
    );

    CREATE TABLE stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      cantidad INTEGER NOT NULL,
      stock_anterior INTEGER NOT NULL,
      stock_nuevo INTEGER NOT NULL,
      motivo TEXT,
      usuario_id INTEGER,
      created_at TEXT NOT NULL
    );
  `);

  const repositorio = new SQLiteVentaRepository(db);
  const servicio = new VentaService(repositorio, null);

  return { db, servicio };
}

// SD-112: registrar venta mediante SQLiteVentaRepository
test('SD-112: registra una venta con dos productos y descuenta stock', async () => {
  const { db, servicio } = prepararEscenario();

  try {
    const resultado = await servicio.registrarVenta({
      items: [
        { productoId: 10, cantidad: 2 },
        { productoId: 20, cantidad: 1 }
      ],
      medioPago: 'NEQUI'
    }, 1);

    assert.equal(resultado.isSuccess, true, resultado.error);

    const venta = resultado.getValue();

    // 2 * 1000 + 1 * 2500 = 4500
    assert.equal(venta.total, 4500);

    // Se registró exactamente una venta.
    const totalVentas = db.prepare(
      'SELECT COUNT(*) AS total FROM sales'
    ).get().total;

    assert.equal(totalVentas, 1);

    // Se registraron dos detalles.
    const detalles = db.prepare(
      'SELECT * FROM sale_items ORDER BY producto_id'
    ).all();

    assert.equal(detalles.length, 2);

    // Stock A: 5 - 2 = 3
    const productoA = db.prepare(
      'SELECT stock_actual FROM products WHERE id = 10'
    ).get();

    assert.equal(productoA.stock_actual, 3);

    // Stock B: 0 - 1 = -1 (regla RV-15).
    const productoB = db.prepare(
      'SELECT stock_actual FROM products WHERE id = 20'
    ).get();

    assert.equal(productoB.stock_actual, -1);

    // Exactamente dos movimientos de inventario.
    const movimientos = db.prepare(
      'SELECT * FROM stock_movements'
    ).all();

    assert.equal(movimientos.length, 2);

    // Se genera advertencia por stock insuficiente.
    assert.equal(venta.advertencias.length, 1);

  } finally {
    db.close();
  }
});

// SD-112: un cobro inválido no puede registrar una venta.
test('SD-112: pago insuficiente no modifica ventas ni inventario', async () => {
  const { db, servicio } = prepararEscenario();

  try {
    const resultado = await servicio.registrarVenta({
      items: [
        { productoId: 10, cantidad: 2 }
      ],
      medioPago: 'EFECTIVO',
      montoRecibido: 500
    }, 1);

    assert.equal(resultado.isFailure, true);

    const ventas = db.prepare(
      'SELECT COUNT(*) AS total FROM sales'
    ).get();

    assert.equal(ventas.total, 0);

    const producto = db.prepare(
      'SELECT stock_actual FROM products WHERE id = 10'
    ).get();

    assert.equal(producto.stock_actual, 5);

    const movimientos = db.prepare(
      'SELECT COUNT(*) AS total FROM stock_movements'
    ).get();

    assert.equal(movimientos.total, 0);

  } finally {
    db.close();
  }
});

test('SD-112: construye una entidad Venta con sus detalles', async () => {
  let datosRecibidos = null;

  const repositorioSimulado = {
    async guardar(venta, detalles, pago) {
      datosRecibidos = { venta, detalles, pago };

      return {
        id: 99,
        total: 3000,
        medioPago: pago.medioPago,
        cambio: 0,
        advertencias: []
      };
    }
  };

  const servicio = new VentaService(repositorioSimulado, null);

  const resultado = await servicio.registrarVenta({
    items: [
      { productoId: 10, cantidad: 1 },
      { productoId: 10, cantidad: 2 }
    ],
    medioPago: 'NEQUI'
  }, 1);

  assert.equal(resultado.isSuccess, true);

  // Comprobar que se construyó la entidad de dominio
  assert.ok(datosRecibidos.venta instanceof Venta);

  // Verificar el usuario asociado
  assert.equal(datosRecibidos.venta.usuarioId, 1);

  // Los productos repetidos deben agruparse
  assert.deepEqual(datosRecibidos.detalles, [
    { productoId: 10, cantidad: 3 }
  ]);

  // La entidad debe contener los detalles
  assert.deepEqual(
    datosRecibidos.venta.items,
    datosRecibidos.detalles
  );

  assert.equal(resultado.getValue().id, 99);
});