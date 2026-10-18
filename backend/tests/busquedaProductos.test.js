import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import { SQLiteProductoRepository } from '../src/modulos/inventario/infraestructura/persistencia/SQLiteProductoRepository.js';

// Setup idéntico a inventario_base.test.js
const createTestDb = () => {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_interno TEXT UNIQUE NOT NULL COLLATE NOCASE,
      codigo_barras TEXT UNIQUE COLLATE NOCASE,
      nombre TEXT NOT NULL,
      categoria TEXT NOT NULL,
      subcategoria TEXT,
      marca TEXT,
      costo_compra REAL DEFAULT 0,
      precio_venta_unitario REAL DEFAULT 0,
      precio_venta_mayor REAL DEFAULT 0,
      iva_porcentaje REAL DEFAULT 0,
      stock_actual INTEGER DEFAULT 0,
      stock_minimo_alerta INTEGER DEFAULT 10,
      activo INTEGER NOT NULL DEFAULT 1
    );
    CREATE INDEX idx_products_codigo_barras ON products(codigo_barras);
    CREATE INDEX idx_products_codigo_interno ON products(codigo_interno);
    CREATE INDEX idx_products_categoria ON products(categoria);
  `);
  return db;
};

let db, repo;

before(() => {
  db = createTestDb();
  repo = new SQLiteProductoRepository(db);
  
  // Insertar datos de prueba
  const stmt = db.prepare(`
    INSERT INTO products (codigo_interno, codigo_barras, nombre, categoria, stock_actual, stock_minimo_alerta, activo)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const data = [
    ['JUG-001', '7501234567890', 'Jabón Rey Limón', 'ASEO', 50, 10, 1],
    ['JUG-002', '7501234567891', 'Jabón Rey Fresa', 'ASEO', 5, 10, 1],
    ['CAC-001', '7501234567892', 'Cacharro Grande', 'CACHARRO', 0, 5, 1],
    ['MAQ-001', '7501234567893', 'Maquillaje Set', 'MAQUILLAJE', 20, 10, 1],
    ['PIN-001', '7501234567894', 'Piñata Estrella', 'PIÑATERIA', 15, 10, 1],
    ['JUG-003', '7501234567895', 'Jabón Neutro', 'ASEO', 100, 10, 0], // inactivo
  ];
  for (const d of data) stmt.run(...d);
});

after(() => db.close());

test('código de barras exacto → 1 resultado', async () => {
  const res = await repo.listarTodos({ search: '7501234567890' });
  assert.equal(res.length, 1);
  assert.equal(res[0].nombre, 'Jabón Rey Limón');
});

test('código interno en minúsculas → encuentra', async () => {
  const res = await repo.listarTodos({ search: 'jug-001' });
  assert.equal(res.length, 1);
});

test('parcial código interno → encuentra', async () => {
  const res = await repo.listarTodos({ search: 'JUG-00' });
  assert.equal(res.length, 2); // JUG-001, JUG-002 (JUG-003 está inactivo)
});

test('ignora tildes: "jabon" = "Jabón"', async () => {
  const res = await repo.listarTodos({ search: 'jabon' });
  assert.equal(res.length, 2); // Jabón Rey Limón, Jabón Rey Fresa (Jabón Neutro está inactivo)
  assert.ok(res.every((p) => p.activo === 1));
});

test('ignora mayúsculas: "PIÑATERIA" = "Piñatería"', async () => {
  const res = await repo.listarTodos({ search: 'PIÑATERIA' });
  assert.equal(res.length, 1);
});

test('dos palabras en otro orden', async () => {
  const res = await repo.listarTodos({ search: 'limón jabón' });
  assert.equal(res.length, 1);
  assert.equal(res[0].nombre, 'Jabón Rey Limón');
});

test('% y _ literales no son comodines', async () => {
  const res1 = await repo.listarTodos({ search: '%' });
  const res2 = await repo.listarTodos({ search: '_' });
  assert.equal(res1.length, 0);
  assert.equal(res2.length, 0);
});

test('orden: código exacto primero', async () => {
  // Insertar producto con nombre que contiene dígitos del barcode
  db.prepare(`INSERT INTO products (codigo_interno, codigo_barras, nombre, categoria, stock_actual, activo) VALUES (?, ?, ?, ?, ?, ?)`)
    .run('TEST-001', '111111111111', 'Producto 7501234567890 Especial', 'ASEO', 10, 1);
  
  const res = await repo.listarTodos({ search: '7501234567890' });
  // El barcode exacto debe ir primero
  assert.strictEqual(res.length, 2, 'Should have exactly 2 results');
  assert.strictEqual(res[0].codigoBarras, '7501234567890', 'First result should have exact barcode match');
  assert.strictEqual(res[0].nombre, 'Jabón Rey Limón', 'First result should be Jabón Rey Limón');
});

test('no devuelve inactivos (activo=0)', async () => {
  const res = await repo.listarTodos({ search: 'Jabón' });
  // JUG-003 "Jabón Neutro" está inactivo (activo = 0)
  assert.equal(res.length, 2);
  assert.ok(res.every((p) => p.activo === 1));
  assert.ok(!res.some((p) => p.codigoInterno === 'JUG-003'));
});

test('sin filtros no devuelve inactivos', async () => {
  const res = await repo.listarTodos();
  assert.ok(res.every((p) => p.activo === 1));
  assert.ok(!res.some((p) => p.codigoInterno === 'JUG-003'));
});

test('combinado con categoria y estadoStock', async () => {
  const res = await repo.listarTodos({ search: 'jabon', categoria: 'ASEO', estadoStock: 'STOCK_BAJO' });
  // Solo Jabón Rey Fresa (stock 5 <= min 10)
  assert.equal(res.length, 1);
  assert.equal(res[0].nombre, 'Jabón Rey Fresa');
});