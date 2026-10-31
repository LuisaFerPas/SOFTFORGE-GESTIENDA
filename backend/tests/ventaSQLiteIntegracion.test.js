import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { Venta } from '../src/modulos/ventas/dominio/Venta.js';
import { DetalleVenta } from '../src/modulos/ventas/dominio/DetalleVenta.js';
import { VentaService } from '../src/modulos/ventas/servicios/VentaService.js';
import { SQLiteVentaRepository } from '../src/modulos/ventas/infraestructura/persistencia/SQLiteVentaRepository.js';
import { migrarMedioPagoOtro } from '../src/infraestructura/database/migrarMedioPagoOtro.js';

function escenario(legado = false) {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE users(id INTEGER PRIMARY KEY);
    INSERT INTO users(id) VALUES(1);
    CREATE TABLE products (
      id INTEGER PRIMARY KEY, codigo_interno TEXT, nombre TEXT,
      stock_actual INTEGER NOT NULL, precio_venta_unitario REAL NOT NULL,
      fecha_ultima_venta TEXT, activo INTEGER NOT NULL DEFAULT 1
    );
    INSERT INTO products(id,codigo_interno,nombre,stock_actual,precio_venta_unitario)
      VALUES(10,'SKU10','Esmalte',5,5500),(20,'SKU20','Escoba',0,10000);
    CREATE TABLE sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER NOT NULL,
      total REAL NOT NULL,
      medio_pago TEXT NOT NULL CHECK(medio_pago IN ('EFECTIVO','NEQUI','MIXTO')),
      monto_efectivo REAL NOT NULL DEFAULT 0,
      monto_nequi REAL NOT NULL DEFAULT 0,
      cambio REAL NOT NULL DEFAULT 0, created_at TEXT,
      FOREIGN KEY(usuario_id) REFERENCES users(id)
    );
    CREATE TABLE sale_items (
      id INTEGER PRIMARY KEY, venta_id INTEGER NOT NULL,
      producto_id INTEGER, cantidad INTEGER, precio_unitario REAL, subtotal REAL,
      FOREIGN KEY (venta_id) REFERENCES sales(id)
    );
    CREATE TABLE stock_movements (
      id INTEGER PRIMARY KEY, producto_id INTEGER, tipo TEXT, cantidad INTEGER,
      stock_anterior INTEGER, stock_nuevo INTEGER, motivo TEXT,
      usuario_id INTEGER, created_at TEXT
    );
    CREATE TABLE facturas (
      id INTEGER PRIMARY KEY, venta_id INTEGER NOT NULL UNIQUE,
      consecutivo TEXT NOT NULL UNIQUE, FOREIGN KEY(venta_id) REFERENCES sales(id)
    );
  `);
  if (!legado) migrarMedioPagoOtro(db);
  return { db, service: new VentaService(new SQLiteVentaRepository(db), null) };
}

const datos = { items: [{ productoId: 10, cantidad: 2 }, { productoId: 20, cantidad: 1 }] };

test('SD-112: precios confiables de SQLite y entidades de dominio completas', async () => {
  const {db, service} = escenario();
  const r = await service.registrarVenta({ items: [{ productoId: 10, cantidad: 2, precioUnitario: 1 }], medioPago: 'EFECTIVO', montoRecibido: 12000 }, 1);
  assert.equal(r.isSuccess, true, r.error);
  assert.equal(r.getValue().total, 11000);
  assert.equal(r.getValue().cambio, 1000);
  assert.equal(db.prepare('SELECT total FROM sales').get().total, 11000);
  assert.equal(db.prepare('SELECT precio_unitario FROM sale_items').get().precio_unitario, 5500);
  db.close();
});

test('SD-112: agregación y Venta con instancias DetalleVenta', async () => {
  const {db} = escenario();
  let capturada;
  const repositorio = {
    obtenerProductosParaVenta: async () => [{id:10, codigoInterno:'SKU10', nombre:'Esmalte', precioVentaUnitario:5500}],
    guardar: async (venta, detalles, pago) => { capturada = {venta, detalles, pago}; return {id:1, total:venta.total, advertencias:[]}; }
  };
  const servicio = new VentaService(repositorio, null);
  const r = await servicio.registrarVenta({items:[{productoId:10,cantidad:2},{productoId:10,cantidad:1}],medioPago:'NEQUI'},1);
  assert.equal(r.isSuccess,true,r.error);
  assert.equal(capturada.venta instanceof Venta, true);
  assert.equal(capturada.detalles[0] instanceof DetalleVenta, true);
  assert.equal(capturada.venta.total,16500);
  assert.equal(capturada.venta.items.length,1);
  db.close();
});

test('SD-111/112: OTRO aceptado, guardado aparte de Nequi', async () => {
  const {db, service} = escenario();
  const r = await service.registrarVenta({...datos,medioPago:'OTRO'},1);
  assert.equal(r.isSuccess,true,r.error);
  const pago = db.prepare('SELECT medio_pago,monto_nequi,monto_otro FROM sales').get();
  assert.equal(pago.medio_pago,'OTRO');
  assert.equal(pago.monto_nequi,0);
  assert.equal(pago.monto_otro,21000);
  assert.equal(db.prepare('SELECT stock_actual FROM products WHERE id=20').get().stock_actual,-1);
  db.close();
});

test('SD-112: monto insuficiente no cambia ni venta ni stock', async () => {
  const {db, service} = escenario();
  const r = await service.registrarVenta({...datos,medioPago:'EFECTIVO',montoRecibido:200},1);
  assert.equal(r.isFailure,true);
  assert.equal(db.prepare('SELECT COUNT(*) as n FROM sales').get().n,0);
  assert.equal(db.prepare('SELECT stock_actual FROM products WHERE id=20').get().stock_actual,0);
  db.close();
});

test('SD-112: no registra venta si un producto ya no existe', async () => {
  const {db, service} = escenario();
  const r = await service.registrarVenta({items:[{productoId:10,cantidad:1},{productoId:999,cantidad:1}],medioPago:'NEQUI'},1);
  assert.equal(r.isFailure,true);
  assert.equal(db.prepare('SELECT COUNT(*) as n FROM sales').get().n,0);
  db.close();
});

test('SD-112: rechazo de precios inválidos y total positivo', async () => {
  const {db, service} = escenario();
  db.prepare('UPDATE products SET precio_venta_unitario=0 WHERE id=10').run();
  const r = await service.registrarVenta({items:[{productoId:10,cantidad:1}],medioPago:'NEQUI'},1);
  assert.equal(r.isFailure,true);
  db.close();
});

test('Migración: conserva ventas y relaciones ya existentes', () => {
  const {db} = escenario(true);
  db.exec("INSERT INTO sales(id,usuario_id,total,medio_pago,monto_nequi) VALUES(7,1,100,'NEQUI',100);");
  db.exec("INSERT INTO sale_items(id,venta_id,producto_id,cantidad,precio_unitario,subtotal) VALUES(1,7,10,1,100,100);");
  db.exec("INSERT INTO facturas(id,venta_id,consecutivo) VALUES(1,7,'F-0001');");
  migrarMedioPagoOtro(db);
  assert.equal(db.prepare('SELECT id FROM sales').get().id,7);
  assert.equal(db.prepare('SELECT venta_id FROM sale_items').get().venta_id,7);
  assert.equal(db.prepare('SELECT venta_id FROM facturas').get().venta_id,7);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
  migrarMedioPagoOtro(db); // idempotente
  db.close();
});

test('Regresión SD-70: repositorio del Sprint 2 mantiene pago MIXTO y stock negativo', async () => {
  const {db} = escenario();
  const { VentaRepository } = await import('../src/modulos/ventas/dominio/VentaRepository.js');
  const legacy = new VentaService(new VentaRepository(db), null);
  const r = await legacy.procesarVenta({
    items:[{productoId:20,cantidad:2},{productoId:20,cantidad:1}],
    medioPago:'MIXTO',montoEfectivo:10000,montoNequi:20000
  },1);
  assert.equal(r.isSuccess,true,r.error);
  assert.equal(r.getValue().total,30000);
  assert.equal(db.prepare('SELECT stock_actual FROM products WHERE id=20').get().stock_actual,-3);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM sale_items').get().n,1);
  db.close();
});

test('SD-111: controlador devuelve HTTP 201 e ID sin divulgar stock al vendedor', async () => {
  const {db,service} = escenario();
  const { VentaController } = await import('../src/modulos/ventas/presentacion/ventaController.js');
  const controller = new VentaController(service, null);
  let status, cuerpo;
  const res = {
    status(codigo) { status = codigo; return this; },
    json(datos) { cuerpo = datos; return this; }
  };
  await controller.crearVenta({
    user:{id:1,role:'VENDEDOR'},
    body:{items:[{productoId:20,cantidad:2,precioUnitario:1}],medioPago:'NEQUI'}
  },res);
  assert.equal(status,201);
  assert.ok(Number.isSafeInteger(cuerpo.data.id));
  assert.equal(cuerpo.data.total,20000);
  assert.equal(cuerpo.data.advertencias.length,1);
  assert.equal('stockNuevo' in cuerpo.data.advertencias[0],false);
  assert.equal('stockAnterior' in cuerpo.data.advertencias[0],false);
  db.close();
});
