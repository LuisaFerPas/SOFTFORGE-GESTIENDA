import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { SQLiteFacturaConsultaRepository } from '../src/modulos/ventas/infraestructura/persistencia/SQLiteFacturaConsultaRepository.js';
import {
  SQLiteEdicionFacturaRepository,
  asegurarEsquemaEdicion
} from '../src/modulos/ventas/infraestructura/persistencia/SQLiteEdicionFacturaRepository.js';
import {
  SQLiteAnulacionVentaRepository,
  asegurarEsquemaAnulacion
} from '../src/modulos/ventas/infraestructura/persistencia/SQLiteAnulacionVentaRepository.js';

function escenario() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT NOT NULL);
    INSERT INTO users VALUES (1, 'vendedor');
    INSERT INTO users VALUES (2, 'admin1');

    CREATE TABLE products (
      id INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      stock_actual INTEGER NOT NULL DEFAULT 0,
      precio_venta_unitario REAL NOT NULL,
      activo INTEGER NOT NULL DEFAULT 1
    );
    INSERT INTO products VALUES (10, 'Producto A', 10, 2500, 1);

    CREATE TABLE sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      total REAL NOT NULL,
      medio_pago TEXT NOT NULL,
      monto_efectivo REAL NOT NULL DEFAULT 0,
      monto_nequi REAL NOT NULL DEFAULT 0,
      monto_otro REAL NOT NULL DEFAULT 0,
      cambio REAL NOT NULL DEFAULT 0,
      created_at TEXT,
      FOREIGN KEY (usuario_id) REFERENCES users(id)
    );
    INSERT INTO sales
      (id, usuario_id, total, medio_pago, created_at)
    VALUES (1, 1, 2500, 'EFECTIVO', '2026-10-27T10:00:00');

    CREATE TABLE sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL,
      producto_id INTEGER NOT NULL,
      cantidad INTEGER NOT NULL,
      precio_unitario REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (venta_id) REFERENCES sales(id),
      FOREIGN KEY (producto_id) REFERENCES products(id)
    );
    INSERT INTO sale_items (venta_id, producto_id, cantidad, precio_unitario, subtotal)
    VALUES (1, 10, 1, 2500, 2500);

    CREATE TABLE stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      cantidad INTEGER NOT NULL,
      stock_anterior INTEGER NOT NULL,
      stock_nuevo INTEGER NOT NULL,
      costo_unitario REAL DEFAULT 0,
      motivo TEXT,
      usuario_id INTEGER,
      created_at TEXT,
      FOREIGN KEY (producto_id) REFERENCES products(id)
    );

    CREATE TABLE facturas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL UNIQUE,
      consecutivo TEXT NOT NULL UNIQUE,
      nombre_cliente TEXT NOT NULL DEFAULT 'Consumidor Final',
      fecha_emision DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      estado TEXT NOT NULL DEFAULT 'EMITIDA' CHECK(estado IN ('EMITIDA','ANULADA')),
      FOREIGN KEY (venta_id) REFERENCES sales(id)
    );
    INSERT INTO facturas (id, venta_id, consecutivo, nombre_cliente, fecha_emision, estado)
    VALUES (1, 1, 'F-0001', 'Cliente Original', '2026-10-27T10:00:00', 'EMITIDA');
  `);

  asegurarEsquemaEdicion(db);
  asegurarEsquemaAnulacion(db);

  return {
    db,
    consulta: new SQLiteFacturaConsultaRepository(db),
    edicion: new SQLiteEdicionFacturaRepository(db),
    anulacion: new SQLiteAnulacionVentaRepository(db)
  };
}

test('HU-0404.3: listar devuelve el vendedor original de cada factura', () => {
  const { db, consulta } = escenario();
  try {
    const resultado = consulta.listar({ pagina: 1, limite: 10 });
    assert.equal(resultado.facturas.length, 1);
    assert.equal(resultado.facturas[0].vendedor, 'vendedor');
  } finally {
    db.close();
  }
});

test('HU-0404.3: el detalle devuelve el vendedor original', () => {
  const { db, consulta } = escenario();
  try {
    const detalle = consulta.obtenerPorConsecutivo('f-0001');
    assert.equal(detalle.vendedor, 'vendedor');
  } finally {
    db.close();
  }
});

test('HU-0404.3: una factura editada conserva el vendedor de la venta original', async () => {
  const { db, consulta, edicion } = escenario();
  try {
    const resultado = await edicion.reemplazarFactura('F-0001', {
      nombreCliente: 'Cliente Corregido'
    });
    const nueva = consulta.obtenerPorConsecutivo(resultado.nueva.consecutivo);
    assert.equal(nueva.vendedor, 'vendedor');
    assert.equal(nueva.nombreCliente, 'Cliente Corregido');

    const listado = consulta.listar({ pagina: 1, limite: 10 });
    assert.equal(listado.facturas.length, 2);
    assert.deepEqual(listado.facturas.map((factura) => factura.vendedor), ['vendedor', 'vendedor']);
  } finally {
    db.close();
  }
});

test('HU-0404.3: una venta y factura anuladas siguen mostrando su vendedor', async () => {
  const { db, consulta, anulacion } = escenario();
  try {
    await anulacion.anularVentaYFacturaYObtenerItems('F-0001', 2);

    const detalle = consulta.obtenerPorConsecutivo('F-0001');
    assert.equal(detalle.estado, 'ANULADA');
    assert.equal(detalle.vendedor, 'vendedor');

    const listado = consulta.listar({ pagina: 1, limite: 10, estado: 'ANULADA' });
    assert.equal(listado.facturas[0].vendedor, 'vendedor');
  } finally {
    db.close();
  }
});

test('HU-0404.3: sin usuario asociado muestra No disponible', () => {
  const { db, consulta } = escenario();
  try {
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec(`
      INSERT INTO sales (id, usuario_id, total, medio_pago, created_at)
      VALUES (2, 99, 2500, 'EFECTIVO', '2026-10-27T11:00:00');
      INSERT INTO facturas (id, venta_id, consecutivo, nombre_cliente, fecha_emision, estado)
      VALUES (2, 2, 'F-0002', 'Sin vendedor', '2026-10-27T11:00:00', 'EMITIDA');
    `);
    db.exec('PRAGMA foreign_keys = ON');
    const detalle = consulta.obtenerPorConsecutivo('F-0002');
    assert.equal(detalle.vendedor, 'No disponible');
  } finally {
    db.close();
  }
});
