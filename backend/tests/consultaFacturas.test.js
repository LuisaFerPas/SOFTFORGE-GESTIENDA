import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { SQLiteFacturaConsultaRepository } from '../src/modulos/ventas/infraestructura/persistencia/SQLiteFacturaConsultaRepository.js';

function escenario() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE facturas (id INTEGER PRIMARY KEY, venta_id INTEGER, consecutivo TEXT, nombre_cliente TEXT, fecha_emision TEXT, estado TEXT);
    CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT);
    CREATE TABLE sales (id INTEGER PRIMARY KEY, usuario_id INTEGER, total REAL, medio_pago TEXT, monto_efectivo REAL, monto_nequi REAL, monto_otro REAL, cambio REAL, created_at TEXT);
    CREATE TABLE products (id INTEGER PRIMARY KEY, nombre TEXT);
    CREATE TABLE sale_items (id INTEGER PRIMARY KEY, venta_id INTEGER, producto_id INTEGER, cantidad INTEGER, precio_unitario REAL, subtotal REAL);
    INSERT INTO users VALUES (1, 'vendedor');
    INSERT INTO sales VALUES (3, 1, 9000, 'EFECTIVO', 10000, 0, 0, 1000, '2026-10-25T17:00:00');
    INSERT INTO sales VALUES (4, 1, 6000, 'NEQUI', 0, 6000, 0, 0, '2026-10-25T18:00:00');
    INSERT INTO facturas VALUES (1, 3, 'F-0001', 'Consumidor Final', '2026-10-25T17:00:00', 'EMITIDA');
    INSERT INTO facturas VALUES (2, 4, 'F-0002', 'Ana Gómez', '2026-10-25T18:00:00', 'ANULADA');
    INSERT INTO products VALUES (7, 'Carro de juguete');
    INSERT INTO sale_items VALUES (1, 3, 7, 1, 9000, 9000);
  `);
  return { db, repo: new SQLiteFacturaConsultaRepository(db) };
}

test('historial: muestra última factura primero con paginación', () => {
  const {db, repo} = escenario();
  const r = repo.listar({ limite:1, pagina:1 });
  assert.equal(r.facturas.length,1);
  assert.equal(r.facturas[0].consecutivo,'F-0002');
  assert.equal(r.facturas[0].vendedor,'vendedor');
  assert.equal(r.paginacion.total,2);
  assert.equal(r.paginacion.totalPaginas,2);
  db.close();
});

test('historial: filtra nombre, consecutivo y estado de forma independiente', () => {
  const {db, repo} = escenario();
  assert.equal(repo.listar({busqueda:'ana',estado:'ANULADA'}).facturas[0].consecutivo,'F-0002');
  assert.equal(repo.listar({busqueda:'F-0001'}).facturas.length,1);
  assert.equal(repo.listar({estado:'EMITIDA'}).facturas.length,1);
  db.close();
});

test('historial: muestra detalle y productos sin modificar existencias', () => {
  const {db, repo} = escenario();
  const r = repo.obtenerPorConsecutivo('f-0001');
  assert.equal(r.ventaId,3);
  assert.equal(r.vendedor,'vendedor');
  assert.equal(r.items[0].nombre,'Carro de juguete');
  assert.equal(r.items[0].subtotal,9000);
  assert.equal(r.pago.cambio,1000);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM facturas').get().n,2);
  db.close();
});

test('historial: devuelve null si la factura no existe', () => {
  const {db, repo} = escenario();
  assert.equal(repo.obtenerPorConsecutivo('F-9999'),null);
  db.close();
});

test('historial: rechaza datos de búsqueda y paginación inválidos', () => {
  const {db, repo} = escenario();
  assert.throws(() => repo.listar({pagina:0}), /paginación/);
  assert.throws(() => repo.listar({estado:'OTRO'}), /filtros/);
  assert.throws(() => repo.obtenerPorConsecutivo('../123'), /consecutivo/);
  db.close();
});
