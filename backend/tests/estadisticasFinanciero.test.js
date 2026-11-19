import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { EstadisticasService } from '../src/modulos/reportes/servicios/EstadisticasService.js';

function configurar() {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE sales (id INTEGER PRIMARY KEY, total REAL, created_at TEXT);
    CREATE TABLE products (id INTEGER PRIMARY KEY, categoria TEXT, costo_compra REAL);
    CREATE TABLE sale_items (id INTEGER PRIMARY KEY, venta_id INTEGER, producto_id INTEGER, cantidad INTEGER, subtotal REAL);
    INSERT INTO products VALUES (1,'Hogar',3000),(2,'Juguetes',1200);
    INSERT INTO sales VALUES (1,18000,datetime('now'));
    INSERT INTO sale_items VALUES (1,1,1,2,12000),(2,1,2,1,6000);`);
  return db;
}
test('HU-0903: calcula ingresos, costos, utilidad y categorías sin duplicar el total', async () => {
  const db = configurar();
  try {
    const resultado = await new EstadisticasService(db).consultarResumenFinanciero('MES');
    assert.equal(resultado.ingresosBrutos,18000);
    assert.equal(resultado.costoProductos,7200);
    assert.equal(resultado.utilidadEstimada,10800);
    assert.equal(resultado.numeroTransacciones,1);
    assert.equal(resultado.porCategoria.length,2);
    assert.equal(resultado.porCategoria.reduce((s,c)=>s+c.ingresos,0),18000);
  } finally { db.close(); }
});
test('HU-0903: lista vacía sin divisiones inválidas', async () => {
  const db = configurar();
  db.exec('DELETE FROM sale_items; DELETE FROM sales;');
  try {
    const resultado = await new EstadisticasService(db).consultarResumenFinanciero('DIA');
    assert.equal(resultado.ingresosBrutos,0);
    assert.deepEqual(resultado.porCategoria,[]);
  } finally { db.close(); }
});
test('HU-0903: rechaza períodos que no estén permitidos', async () => {
  const db = configurar();
  try { await assert.rejects(() => new EstadisticasService(db).consultarResumenFinanciero('DESDE 1900'), RangeError); }
  finally { db.close(); }
});
