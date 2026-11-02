import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { VentaService } from '../src/modulos/ventas/servicios/VentaService.js';
import { SQLiteVentaRepository } from '../src/modulos/ventas/infraestructura/persistencia/SQLiteVentaRepository.js';
import { SQLiteSalidaVentaStockRepository } from '../src/modulos/ventas/infraestructura/persistencia/SQLiteSalidaVentaStockRepository.js';
import { StockService } from '../src/modulos/inventario/aplicacion/StockService.js';
import { Result } from '../src/shared/Result.js';

function crearEscenario() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE users (id INTEGER PRIMARY KEY);
    INSERT INTO users VALUES (1);
    CREATE TABLE products (
      id INTEGER PRIMARY KEY, nombre TEXT, codigo_interno TEXT,
      precio_venta_unitario REAL NOT NULL, stock_actual INTEGER,
      fecha_ultima_venta TEXT, activo INTEGER DEFAULT 1
    );
    INSERT INTO products(id,nombre,codigo_interno,precio_venta_unitario,stock_actual) VALUES
      (10,'Producto A','A-10',2500,5),
      (20,'Producto B','B-20',6000,0),
      (30,'Producto C','C-30',3000,NULL);
    CREATE TABLE sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER,
      total REAL NOT NULL, medio_pago TEXT, monto_efectivo REAL,
      monto_nequi REAL, cambio REAL, created_at TEXT,
      FOREIGN KEY(usuario_id) REFERENCES users(id)
    );
    CREATE TABLE sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, venta_id INTEGER,
      producto_id INTEGER, cantidad INTEGER, precio_unitario REAL, subtotal REAL,
      FOREIGN KEY(venta_id) REFERENCES sales(id)
    );
    CREATE TABLE stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT, producto_id INTEGER, tipo TEXT,
      cantidad INTEGER, stock_anterior INTEGER, stock_nuevo INTEGER,
      motivo TEXT, usuario_id INTEGER, created_at TEXT
    );
  `);
  const stockService = new StockService(new SQLiteSalidaVentaStockRepository(db));
  const ventaRepo = new SQLiteVentaRepository(db, stockService);
  const ventaService = new VentaService(ventaRepo, null, stockService);
  const stock = (id) => db.prepare('SELECT stock_actual FROM products WHERE id = ?').get(id)?.stock_actual;
  const cuenta = (tabla) => db.prepare(`SELECT COUNT(*) AS n FROM ${tabla}`).get().n;
  return { db, stockService, ventaService, stock, cuenta, ventaRepo };
}

test('SD-116: dos productos, exactamente una salida por ítem y una sola transacción', async () => {
  const { db, ventaService, stock, cuenta } = crearEscenario();
  const resultado = await ventaService.registrarVenta({
    items: [{ productoId: 10, cantidad: 2 }, { productoId: 20, cantidad: 1 }],
    medioPago: 'NEQUI'
  }, 1);
  assert.equal(resultado.isSuccess, true, resultado.error);
  assert.equal(resultado.getValue().total, 11000);
  assert.equal(stock(10), 3); // 5 - 2; nunca doble descuento
  assert.equal(stock(20), -1); // SD-117: 0 - 1, sin bloquear
  assert.equal(cuenta('sales'), 1);
  assert.equal(cuenta('sale_items'), 2);
  assert.equal(cuenta('stock_movements'), 2);
  const movimientos = db.prepare('SELECT producto_id, cantidad, stock_anterior, stock_nuevo, tipo, motivo FROM stock_movements ORDER BY id').all();
  assert.equal(movimientos[0].stock_anterior, 5);
  assert.equal(movimientos[0].stock_nuevo, 3);
  assert.equal(movimientos[1].stock_anterior, 0);
  assert.equal(movimientos[1].stock_nuevo, -1);
  assert.equal(movimientos[0].tipo, 'SALIDA_VENTA');
  assert.match(movimientos[0].motivo, /Venta #1/);
  assert.equal(resultado.getValue().advertencias.length, 1);
  assert.equal(db.isTransaction, false);
  db.close();
});

test('SD-116: si falla la segunda salida, revierte venta, detalles, movimientos y stock', async () => {
  const { db, stockService, stock, cuenta, ventaRepo } = crearEscenario();
  const servicioFallido = {
    registrarSalida(productoId, cantidad, ventaId, usuarioId) {
      if (productoId === 20) return Result.fail('Error simulado en la segunda salida');
      return stockService.registrarSalida(productoId, cantidad, ventaId, usuarioId);
    }
  };
  const ventaService = new VentaService(ventaRepo, null, servicioFallido);
  const resultado = await ventaService.registrarVenta({
    items: [{ productoId: 10, cantidad: 2 }, { productoId: 20, cantidad: 1 }],
    medioPago: 'NEQUI'
  }, 1);
  assert.equal(resultado.isFailure, true);
  assert.match(resultado.error, /Error simulado/);
  assert.equal(stock(10), 5);
  assert.equal(stock(20), 0);
  assert.equal(cuenta('sales'), 0);
  assert.equal(cuenta('sale_items'), 0);
  assert.equal(cuenta('stock_movements'), 0);
  assert.equal(db.isTransaction, false);
  db.close();
});

test('SD-117: stock NULL equivale a cero, genera salida, saldo negativo y advertencia', async () => {
  const { db, ventaService, stock } = crearEscenario();
  const advertencias = [];
  const original = console.warn;
  console.warn = (...args) => advertencias.push(args.join(' '));
  try {
    const resultado = await ventaService.registrarVenta({
      items: [{ productoId: 30, cantidad: 2 }], medioPago: 'NEQUI'
    }, 1);
    assert.equal(resultado.isSuccess, true, resultado.error);
    assert.equal(stock(30), -2);
    assert.equal(resultado.getValue().advertencias.length, 1);
    assert.equal(db.prepare('SELECT stock_anterior FROM stock_movements').get().stock_anterior, 0);
    assert.equal(db.prepare('SELECT stock_nuevo FROM stock_movements').get().stock_nuevo, -2);
    assert.equal(advertencias.length, 1);
    assert.match(advertencias[0], /stock insuficiente/);
  } finally {
    console.warn = original;
    db.close();
  }
});

test('SD-116: StockService no registra una salida si no hay transacción de venta', () => {
  const { db, stockService, stock, cuenta } = crearEscenario();
  const resultado = stockService.registrarSalida(10, 1, 1, 1);
  assert.equal(resultado.isFailure, true);
  assert.match(resultado.error, /dentro de la transacción/);
  assert.equal(stock(10), 5);
  assert.equal(cuenta('stock_movements'), 0);
  db.close();
});
