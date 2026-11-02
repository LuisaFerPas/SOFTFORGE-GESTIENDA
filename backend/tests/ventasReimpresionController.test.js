import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { VentaController } from '../src/modulos/ventas/presentacion/ventaController.js';
import { FacturacionService } from '../src/modulos/ventas/servicios/FacturacionService.js';
import { SQLiteVentaRepository } from '../src/modulos/ventas/infraestructura/persistencia/SQLiteVentaRepository.js';
import { Result } from '../src/shared/Result.js';

function crearEscenario() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE users (id INTEGER PRIMARY KEY);
    INSERT INTO users VALUES (1);
    CREATE TABLE sales (id INTEGER PRIMARY KEY, usuario_id INTEGER, total REAL,
      medio_pago TEXT, created_at TEXT, FOREIGN KEY(usuario_id) REFERENCES users(id));
    INSERT INTO sales VALUES (7,1,15000,'NEQUI','2026-10-25T14:00:00.000Z');
    CREATE TABLE sale_items (id INTEGER PRIMARY KEY, venta_id INTEGER, producto_id INTEGER,
      cantidad INTEGER, precio_unitario REAL, subtotal REAL);
    INSERT INTO sale_items VALUES (1,7,10,2,7500,15000);
    CREATE TABLE facturas (id INTEGER PRIMARY KEY, venta_id INTEGER NOT NULL UNIQUE,
      consecutivo TEXT NOT NULL UNIQUE, nombre_cliente TEXT NOT NULL DEFAULT 'Consumidor Final',
      fecha_emision TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, estado TEXT NOT NULL DEFAULT 'EMITIDA',
      FOREIGN KEY(venta_id) REFERENCES sales(id));
    INSERT INTO facturas VALUES (1,7,'F-0001','Camila','2026-10-25T14:05:00.000Z','EMITIDA');
  `);
  let llamadasImpresora = 0;
  const impresora = { async imprimirTicketVenta() { llamadasImpresora++; } };
  const servicio = new FacturacionService(new SQLiteVentaRepository(db), impresora);
  const controlador = new VentaController(null, servicio);
  return { db, controlador, servicio, contarImpresiones: () => llamadasImpresora };
}

async function llamar(controlador, consecutivo) {
  let codigo = 200;
  let cuerpo;
  const res = {
    status(valor) { codigo = valor; return this; },
    json(valor) { cuerpo = valor; return this; }
  };
  await controlador.reimprimirFactura({ params: { consecutivo }, user: { id: 1, role: 'VENDEDOR' } }, res);
  return { codigo, cuerpo };
}

test('SD-122: factura EMITIDA se consulta por consecutivo y queda lista para reimpresión', async () => {
  const e = crearEscenario();
  try {
    const { codigo, cuerpo } = await llamar(e.controlador, 'F-0001');
    assert.equal(codigo, 200);
    assert.equal(cuerpo.success, true);
    assert.equal(cuerpo.data.factura.consecutivo, 'F-0001');
    assert.equal(cuerpo.data.factura.nombreCliente, 'Camila');
    assert.equal(cuerpo.data.venta.total, 15000);
    assert.equal(cuerpo.data.venta.items.length, 1);
    assert.equal(cuerpo.data.venta.items[0].cantidad, 2);
    assert.equal(cuerpo.data.venta.items[0].precioUnitario, 7500);
    assert.equal(cuerpo.data.impresionRealizada, false);
    assert.equal(cuerpo.data.estadoImpresion, 'PENDIENTE');
    assert.equal(e.contarImpresiones(), 0, 'No afirmar impresión ni llamar un adaptador stub');
  } finally { e.db.close(); }
});

test('SD-122: consecutivo inexistente produce HTTP 404 y mensaje comprensible', async () => {
  const e = crearEscenario();
  try {
    const { codigo, cuerpo } = await llamar(e.controlador, 'F-9999');
    assert.equal(codigo, 404);
    assert.equal(cuerpo.success, false);
    assert.match(cuerpo.message, /no se encontró una factura/i);
  } finally { e.db.close(); }
});

test('SD-122: consecutivo inválido devuelve HTTP 400', async () => {
  const e = crearEscenario();
  try {
    for (const numero of ['', '123', 'F-1', '../../secret', null, {}]) {
      const { codigo } = await llamar(e.controlador, numero);
      assert.equal(codigo, 400, String(numero));
    }
  } finally { e.db.close(); }
});

test('SD-122: una factura ANULADA no se prepara para impresión', async () => {
  const e = crearEscenario();
  try {
    e.db.prepare("UPDATE facturas SET estado='ANULADA' WHERE id=1").run();
    const { codigo, cuerpo } = await llamar(e.controlador, 'F-0001');
    assert.equal(codigo, 409);
    assert.match(cuerpo.message, /anulada/i);
  } finally { e.db.close(); }
});

test('SD-122: consultar para reimpresión no cambia ni factura ni venta ni stock', async () => {
  const e = crearEscenario();
  try {
    const antes = e.db.prepare('SELECT * FROM facturas').all();
    const ventaAntes = e.db.prepare('SELECT * FROM sales').all();
    for (let i = 0; i < 2; i++) assert.equal((await llamar(e.controlador, 'f-0001')).codigo, 200);
    assert.deepEqual(e.db.prepare('SELECT * FROM facturas').all(), antes);
    assert.deepEqual(e.db.prepare('SELECT * FROM sales').all(), ventaAntes);
    assert.equal(e.contarImpresiones(), 0);
  } finally { e.db.close(); }
});

test('SD-122: errores internos no se envían al usuario', async () => {
  const controller = new VentaController(null, {
    async prepararReimpresion() { return Result.fail('SQLITE_ERROR: datos privados'); }
  });
  const { codigo, cuerpo } = await llamar(controller, 'F-0001');
  assert.equal(codigo, 500);
  assert.doesNotMatch(cuerpo.message, /SQLITE_ERROR/);
});
