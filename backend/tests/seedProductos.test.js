import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { PRODUCTOS_DEMO, seedProductos } from '../src/infraestructura/database/seedProductos.js';
import { CATEGORIAS_VALIDAS } from '../src/modulos/inventario/dominio/CategoriaProducto.js';

function dbPrueba() {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE products (
    id INTEGER PRIMARY KEY, codigo_interno TEXT UNIQUE NOT NULL COLLATE NOCASE,
    nombre TEXT NOT NULL, categoria TEXT NOT NULL, costo_compra REAL,
    precio_venta_unitario REAL, iva_porcentaje REAL, stock_actual INTEGER,
    stock_minimo_alerta INTEGER, activo INTEGER);`);
  return db;
}

test('SD-71: 18 productos en exactamente las cinco categorías', () => {
  assert.equal(PRODUCTOS_DEMO.length, 18);
  assert.deepEqual([...new Set(PRODUCTOS_DEMO.map(p => p.categoria))].sort(), [...CATEGORIAS_VALIDAS].sort());
  assert.equal(new Set(PRODUCTOS_DEMO.map(p => p.codigoInterno)).size, 18);
  assert.ok(PRODUCTOS_DEMO.every(p => p.codigoInterno.startsWith('DEMO-')));
});

test('SD-71: insertar semilla dos veces no duplica ni pisa cambios', () => {
  const db = dbPrueba();
  assert.equal(seedProductos(db).insertados, 18);
  db.prepare('UPDATE products SET stock_actual = 99 WHERE codigo_interno = ?').run('DEMO-JUG-001');
  assert.deepEqual(seedProductos(db), { insertados: 0, existentes: 18, totalCatalogo: 18 });
  assert.equal(db.prepare('SELECT COUNT(*) total FROM products').get().total, 18);
  assert.equal(db.prepare('SELECT stock_actual FROM products WHERE codigo_interno = ?').get('DEMO-JUG-001').stock_actual, 99);
  db.close();
});

test('SD-72: hay escenarios normal, bajo y agotado', () => {
  const db = dbPrueba(); seedProductos(db);
  const rows = db.prepare('SELECT stock_actual stock, stock_minimo_alerta minimo FROM products').all();
  assert.equal(rows.filter(x => x.stock > x.minimo).length, 6);
  assert.equal(rows.filter(x => x.stock > 0 && x.stock <= x.minimo).length, 6);
  assert.equal(rows.filter(x => x.stock <= 0).length, 6);
  db.close();
});

test('SD-71: no duplica códigos existentes, incluyendo mayúsculas/minúsculas', () => {
  const db = dbPrueba();
  db.prepare('INSERT INTO products (codigo_interno, nombre, categoria, stock_actual) VALUES (?, ?, ?, ?)')
    .run('demo-jug-001', 'Anterior', 'Juguetes', 87);
  const r = seedProductos(db);
  assert.equal(r.insertados, 17);
  assert.equal(r.existentes, 1);
  assert.equal(db.prepare('SELECT stock_actual FROM products WHERE codigo_interno = ?').get('DEMO-JUG-001').stock_actual, 87);
  db.close();
});
