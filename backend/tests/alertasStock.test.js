import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { seedProductos } from '../src/infraestructura/database/seedProductos.js';
import { SQLiteProductoRepository } from '../src/modulos/inventario/infraestructura/persistencia/SQLiteProductoRepository.js';
import { ProductoService } from '../src/modulos/inventario/aplicacion/ProductoService.js';
import { ProductoController } from '../src/modulos/inventario/presentacion/productoController.js';

function prepare() {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE products (
    id INTEGER PRIMARY KEY, codigo_interno TEXT UNIQUE NOT NULL COLLATE NOCASE,
    codigo_barras TEXT, nombre TEXT, categoria TEXT, subcategoria TEXT, marca TEXT,
    costo_compra REAL DEFAULT 0, precio_venta_unitario REAL DEFAULT 0,
    precio_venta_mayor REAL DEFAULT 0, iva_porcentaje REAL DEFAULT 0,
    stock_actual INTEGER DEFAULT 0, stock_minimo_alerta INTEGER DEFAULT 10,
    fecha_ultima_compra TEXT, fecha_ultima_venta TEXT, activo INTEGER DEFAULT 1
  );`);
  seedProductos(db);
  const service = new ProductoService(new SQLiteProductoRepository(db));
  return { db, service };
}

test('SD-68: alertas muestran 6 bajos + 6 agotados; orden y categorías reales de DB', async () => {
  const {db, service} = prepare();
  const result = await service.obtenerAlertasStock('ADMINISTRADOR');
  assert.equal(result.isSuccess, true);
  const alertas = result.getValue();
  assert.equal(alertas.length, 12);
  assert.equal(alertas.filter(p => p.estaAgotado).length, 6);
  assert.equal(alertas.filter(p => p.tieneStockBajo).length, 6);
  assert.ok(alertas.every(p => p.stockActual <= p.stockMinimoAlerta));
  assert.ok(alertas.every((p, i) => !i || alertas[i-1].stockActual <= p.stockActual));
  db.close();
});

test('SD-68: un producto inactivo no se muestra y VENDEDOR no obtiene alertas', async () => {
  const {db, service} = prepare();
  db.prepare('UPDATE products SET activo = 0 WHERE codigo_interno = ?').run('DEMO-JUG-003');
  assert.equal((await service.obtenerAlertasStock('ADMINISTRADOR')).getValue().length, 11);
  const r = await service.obtenerAlertasStock('VENDEDOR');
  assert.equal(r.isFailure, true);
  db.close();
});

test('SD-68: controlador responde con lista y resumen', async () => {
  const {db, service} = prepare();
  const controller = new ProductoController(service, null);
  let status, respuesta;
  const res = { status(n) {status=n;return this;}, json(x) {respuesta=x;return this;} };
  await controller.obtenerAlertas({user:{role:'ADMINISTRADOR'}}, res);
  assert.equal(status, 200);
  assert.equal(respuesta.resumen.total, 12);
  assert.equal(respuesta.resumen.bajos, 6);
  assert.equal(respuesta.resumen.agotados, 6);
  assert.equal(respuesta.data.length, 12);
  db.close();
});
