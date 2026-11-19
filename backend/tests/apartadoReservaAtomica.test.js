import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { SQLiteApartadoRepository } from '../src/modulos/apartados/infraestructura/persistencia/SQLiteApartadoRepository.js';
import { ApartadoService } from '../src/modulos/apartados/servicios/ApartadoService.js';

function preparar() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE products (id INTEGER PRIMARY KEY, nombre TEXT, activo INTEGER, stock_actual INTEGER);
    INSERT INTO products VALUES (1,'Libro',1,3),(2,'Juego',1,1);
    CREATE TABLE apartados (id INTEGER PRIMARY KEY AUTOINCREMENT,codigo TEXT UNIQUE,cliente_nombre TEXT,cliente_telefono TEXT,
      usuario_id INTEGER,total_productos REAL,abono_inicial REAL,saldo_pendiente REAL,fecha_creacion TEXT,fecha_limite TEXT,estado TEXT);
    CREATE TABLE apartado_productos(id INTEGER PRIMARY KEY AUTOINCREMENT,apartado_id INTEGER,producto_id INTEGER,cantidad INTEGER,precio_unitario REAL,subtotal REAL);
    CREATE TABLE apartado_abonos(id INTEGER PRIMARY KEY AUTOINCREMENT,apartado_id INTEGER,usuario_id INTEGER,monto REAL,medio_pago TEXT,saldo_restante REAL,created_at TEXT);
  `);
  return db;
}
function datos(productos) {
  const total = productos.reduce((n,p)=>n+p.subtotal,0);
  return { clienteNombre:'Cliente prueba',usuarioId:1,productos,totalProductos:total,abonoInicial:1000,saldoPendiente:total-1000,estado:'ACTIVO' };
}
const item = (id,cantidad) => ({ productoId:id,cantidad,precioUnitario:5000,subtotal:5000*cantidad });

test('reservar: persiste apartado, abono y descuento de stock juntos',async () => {
  const db = preparar();
  try {
    const r=new SQLiteApartadoRepository(db);
    const id=await r.guardar(datos([item(1,2)]),{reservarStock:true});
    assert.ok(id>0);
    assert.equal(db.prepare('SELECT stock_actual FROM products WHERE id=1').get().stock_actual,1);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM apartado_abonos').get().n,1);
  } finally { db.close(); }
});
test('reservar: si el segundo producto no tiene stock revierte todo el apartado y el primer descuento',async () => {
  const db = preparar();
  try {
    const r=new SQLiteApartadoRepository(db);
    await assert.rejects(r.guardar(datos([item(1,2),item(2,2)]),{reservarStock:true}),/Producto no disponible/);
    assert.equal(db.prepare('SELECT stock_actual FROM products WHERE id=1').get().stock_actual,3);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM apartados').get().n,0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM apartado_productos').get().n,0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM apartado_abonos').get().n,0);
  } finally { db.close(); }
});
test('reservar: consecutivos sin duplicar stock ni generar movimientos tras fallo',async () => {
  const db = preparar();
  try {
    const r=new SQLiteApartadoRepository(db);
    await r.guardar(datos([item(2,1)]),{reservarStock:true});
    await assert.rejects(r.guardar(datos([item(2,1)]),{reservarStock:true}),/Producto no disponible/);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM apartados').get().n,1);
    assert.equal(db.prepare('SELECT stock_actual FROM products WHERE id=2').get().stock_actual,0);
  } finally {db.close();}
});

function servicio(db) {
  return new ApartadoService(new SQLiteApartadoRepository(db), {emit: () => {}}, {
    async buscarPorId(id) {
      const p = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
      return p && {id:p.id,nombre:p.nombre,activo:p.activo,stockActual:p.stock_actual,precioVentaUnitario:5000};
    }
  });
}
test('servicio: registra apartado y reserva exactamente una vez',async () => {
  const db = preparar();
  try {
    const resultado=await servicio(db).crearApartado({clienteNombre:'Cliente',usuarioId:1,
      productos:[{productoId:1,cantidad:2}],abonoInicial:1000});
    assert.equal(resultado.isSuccess,true);
    assert.equal(db.prepare('SELECT stock_actual FROM products WHERE id=1').get().stock_actual,1);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM apartados').get().n,1);
  } finally {db.close();}
});
test('servicio: rechaza productos duplicados antes de registrar',async () => {
  const db = preparar();
  try {
    const r=await servicio(db).crearApartado({clienteNombre:'Cliente',usuarioId:1,
      productos:[{productoId:1,cantidad:2},{productoId:1,cantidad:2}],abonoInicial:1000});
    assert.equal(r.isFailure,true);
    assert.match(r.error,/No repitas/);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM apartados').get().n,0);
  } finally {db.close();}
});
test('servicio: evita cantidades fraccionarias y negativas',async () => {
  const db = preparar();
  try {
    for (const cantidad of [0,-1,1.5]) {
      const r=await servicio(db).crearApartado({clienteNombre:'Cliente',usuarioId:1,
        productos:[{productoId:1,cantidad}],abonoInicial:1000});
      assert.equal(r.isFailure,true);
    }
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM apartados').get().n,0);
  } finally {db.close();}
});
