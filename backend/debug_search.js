import { DatabaseSync } from 'node:sqlite';
import { SQLiteProductoRepository } from './src/modulos/inventario/infraestructura/persistencia/SQLiteProductoRepository.js';

const db = new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo_interno TEXT UNIQUE NOT NULL COLLATE NOCASE,
    codigo_barras TEXT UNIQUE COLLATE NOCASE,
    nombre TEXT NOT NULL,
    categoria TEXT NOT NULL,
    stock_actual INTEGER DEFAULT 0,
    stock_minimo_alerta INTEGER DEFAULT 10,
    activo INTEGER NOT NULL DEFAULT 1
  );
`);

// Insert test data
const stmt = db.prepare(`
  INSERT INTO products (codigo_interno, codigo_barras, nombre, categoria, stock_actual, stock_minimo_alerta, activo)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
stmt.run('JUG-001', '7501234567890', 'Jabón Rey Limón', 'ASEO', 50, 10, 1);
stmt.run('JUG-002', '7501234567891', 'Jabón Rey Fresa', 'ASEO', 5, 10, 1);
stmt.run('CAC-001', '7501234567892', 'Cacharro Grande', 'CACHARRO', 0, 5, 1);
stmt.run('MAQ-001', '7501234567893', 'Maquillaje Set', 'MAQUILLAJE', 20, 10, 1);
stmt.run('PIN-001', '7501234567894', 'Piñata Estrella', 'PIÑATERIA', 15, 10, 1);
stmt.run('JUG-003', '7501234567895', 'Jabón Neutro', 'ASEO', 100, 10, 0);

// Insert the test product
stmt.run('TEST-001', '111111111111', 'Producto 7501234567890 Especial', 'ASEO', 10, 10, 1);

const repo = new SQLiteProductoRepository(db);

console.log('All products:');
db.prepare('SELECT id, codigo_interno, codigo_barras, nombre FROM products ORDER BY id').all().forEach(p => {
  console.log(`  ${p.id}: ${p.codigo_interno} | ${p.codigo_barras} | ${p.nombre}`);
});

console.log('\nSearching for 7501234567890:');
repo.listarTodos({ search: '7501234567890' }).then(res => {
  console.log('Results count:', res.length);
  res.forEach((r, i) => {
    console.log(`  Result ${i}:`);
    console.log(`    codigo_interno: ${r.codigoInterno}`);
    console.log(`    codigo_barras: ${r.codigoBarras}`);
    console.log(`    nombre: ${r.nombre}`);
    console.log(`    categoria: ${r.categoria}`);
  });
}).catch(e => {
  console.error('Error:', e);
});
