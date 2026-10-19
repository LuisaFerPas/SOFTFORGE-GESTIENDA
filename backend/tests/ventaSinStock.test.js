import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { VentaRepository } from '../src/modulos/ventas/dominio/VentaRepository.js';
import { VentaService } from '../src/modulos/ventas/servicios/VentaService.js';
import { Producto } from '../src/modulos/inventario/dominio/Producto.js';

function preparar() {
  const db = new DatabaseSync(':memory:');
  db.exec(`PRAGMA foreign_keys = ON;
    CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT);
    INSERT INTO users VALUES (1, 'admin1');
    CREATE TABLE products (id INTEGER PRIMARY KEY, codigo_interno TEXT, nombre TEXT,
      categoria TEXT, precio_venta_unitario REAL, stock_actual INTEGER, fecha_ultima_venta TEXT, activo INTEGER DEFAULT 1);
    INSERT INTO products VALUES (10,'DEMO-001','Producto agotado','Aseo',1000,0,NULL,1);
    INSERT INTO products VALUES (20,'DEMO-002','Producto normal','Juguetes',2500,3,NULL,1);
    CREATE TABLE sales (id INTEGER PRIMARY KEY,usuario_id INTEGER NOT NULL,total REAL NOT NULL,
      medio_pago TEXT NOT NULL,monto_efectivo REAL,monto_nequi REAL,cambio REAL,created_at TEXT,
      FOREIGN KEY(usuario_id) REFERENCES users(id));
    CREATE TABLE sale_items (id INTEGER PRIMARY KEY,venta_id INTEGER NOT NULL,producto_id INTEGER NOT NULL,
      cantidad INTEGER NOT NULL,precio_unitario REAL,subtotal REAL,
      FOREIGN KEY(venta_id) REFERENCES sales(id),FOREIGN KEY(producto_id) REFERENCES products(id));
    CREATE TABLE stock_movements (id INTEGER PRIMARY KEY, producto_id INTEGER NOT NULL,
      tipo TEXT NOT NULL, cantidad INTEGER, stock_anterior INTEGER, stock_nuevo INTEGER,
      motivo TEXT, usuario_id INTEGER, created_at TEXT,
      FOREIGN KEY(producto_id) REFERENCES products(id));
  `);
  return { db, service: new VentaService(new VentaRepository(db), null) };
}

test('SD-70: venta con stock cero no se bloquea, queda -2 y emite advertencia', async () => {
  const {db, service} = preparar();
  const r = await service.procesarVenta({items:[{productoId:10,cantidad:2}],medioPago:'NEQUI'}, 1);
  assert.equal(r.isSuccess, true);
  assert.equal(r.getValue().total, 2000);
  assert.equal(r.getValue().advertencias.length, 1);
  assert.equal(r.getValue().advertencias[0].stockNuevo, -2);
  assert.equal(db.prepare('SELECT stock_actual FROM products WHERE id = 10').get().stock_actual, -2);
  assert.equal(db.prepare('SELECT stock_nuevo FROM stock_movements').get().stock_nuevo, -2);
  db.close();
});

test('SD-70: pago insuficiente revierte todas las operaciones', async () => {
  const {db, service} = preparar();
  const r = await service.procesarVenta({items:[{productoId:20,cantidad:1}],medioPago:'EFECTIVO',montoRecibido:100}, 1);
  assert.equal(r.isFailure, true);
  assert.equal(db.prepare('SELECT stock_actual FROM products WHERE id = 20').get().stock_actual, 3);
  assert.equal(db.prepare('SELECT COUNT(*) total FROM sales').get().total, 0);
  db.close();
});

test('SD-70: dos productos incluyendo uno inexistente no dejan venta parcial', async () => {
  const {db, service} = preparar();
  const r = await service.procesarVenta({items:[{productoId:20,cantidad:1},{productoId:999,cantidad:1}],medioPago:'NEQUI'}, 1);
  assert.equal(r.isFailure, true);
  assert.equal(db.prepare('SELECT COUNT(*) total FROM sales').get().total, 0);
  assert.equal(db.prepare('SELECT stock_actual FROM products WHERE id = 20').get().stock_actual, 3);
  db.close();
});

test('SD-70: ventas duplicadas del mismo producto se agrupan; pago mixto validado', async () => {
  const {db, service} = preparar();
  const r = await service.procesarVenta({items:[{productoId:20,cantidad:2},{productoId:20,cantidad:2}],medioPago:'MIXTO',montoEfectivo:4000,montoNequi:6000},1);
  assert.equal(r.isSuccess,true);
  assert.equal(r.getValue().total,10000);
  assert.equal(db.prepare('SELECT stock_actual FROM products WHERE id = 20').get().stock_actual,-1);
  assert.equal(db.prepare('SELECT COUNT(*) total FROM sale_items').get().total,1);
  assert.equal(r.getValue().advertencias.length,1);
  db.close();
});

test('SD-70: nunca acepta cantidades fraccionarias, negativas o productos sin código', async () => {
  const {db, service} = preparar();
  for (const cantidad of [-1, 0, 1.5]) {
    const r = await service.procesarVenta({items:[{productoId:10,cantidad}],medioPago:'NEQUI'},1);
    assert.equal(r.isFailure,true);
  }
  const modelo = new Producto({codigoInterno:'DEMO-NEG-1',nombre:'Negativo por venta',categoria:'Aseo',stockActual:-3});
  assert.equal(modelo.estaAgotado(),true);
  db.close();
});

test('SD-70/HU-0607: advertencia del vendedor no revela cantidades de inventario', async () => {
  const { db, service } = preparar();
  const { VentaController } = await import('../src/modulos/ventas/presentacion/ventaController.js');
  const controller = new VentaController(service, null);
  let status, respuesta;
  const res = { status(c) { status = c; return this; }, json(value) { respuesta = value; return this; } };
  await controller.crearVenta({
    user: { id: 1, role: 'VENDEDOR' },
    body: { items: [{ productoId: 10, cantidad: 1 }], medioPago: 'NEQUI' }
  }, res);
  assert.equal(status, 201);
  assert.equal(respuesta.data.advertencias.length, 1);
  assert.equal('stockAnterior' in respuesta.data.advertencias[0], false);
  assert.equal('stockNuevo' in respuesta.data.advertencias[0], false);
  db.close();
});
