import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import express from 'express';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'clave-pruebas';

const { crearEdicionFacturasRoutes } = await import(
  '../src/modulos/ventas/presentacion/edicionFacturasRoutes.js'
);
const { JWT_SECRET } = await import(
  '../src/modulos/usuarios/presentacion/authMiddleware.js'
);
const { SQLiteVentaRepository } = await import(
  '../src/modulos/ventas/infraestructura/persistencia/SQLiteVentaRepository.js'
);
const { SQLiteSalidaVentaStockRepository } = await import(
  '../src/modulos/ventas/infraestructura/persistencia/SQLiteSalidaVentaStockRepository.js'
);
const { StockService } = await import(
  '../src/modulos/inventario/aplicacion/StockService.js'
);
const { VentaService } = await import(
  '../src/modulos/ventas/servicios/VentaService.js'
);
const { FacturacionService } = await import(
  '../src/modulos/ventas/servicios/FacturacionService.js'
);

function crearDbLegada() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE users (id INTEGER PRIMARY KEY);
    INSERT INTO users VALUES (1), (2);

    CREATE TABLE products (
      id INTEGER PRIMARY KEY,
      codigo_interno TEXT NOT NULL,
      nombre TEXT NOT NULL,
      stock_actual INTEGER,
      precio_venta_unitario REAL NOT NULL,
      fecha_ultima_venta TEXT,
      activo INTEGER NOT NULL DEFAULT 1
    );
    INSERT INTO products VALUES
      (10, 'P-010', 'Producto A', 10, 2500, NULL, 1),
      (20, 'P-020', 'Producto B', 5, 6000, NULL, 1);

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
    INSERT INTO sales (id, usuario_id, total, medio_pago, created_at)
    VALUES (1, 1, 8500, 'EFECTIVO', '2026-10-27T10:00:00');

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
    VALUES (1, 10, 1, 2500, 2500), (1, 20, 1, 6000, 6000);

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
    INSERT INTO stock_movements
      (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id, created_at)
    VALUES
      (10, 'SALIDA_VENTA', 1, 11, 10, 'Venta #1', 1, '2026-10-27T10:00:00'),
      (20, 'SALIDA_VENTA', 1, 6, 5, 'Venta #1', 1, '2026-10-27T10:00:00');

    CREATE TABLE facturas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL UNIQUE,
      consecutivo TEXT NOT NULL UNIQUE,
      nombre_cliente TEXT NOT NULL DEFAULT 'Consumidor Final',
      fecha_emision DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      estado TEXT NOT NULL DEFAULT 'EMITIDA' CHECK(estado IN ('EMITIDA','ANULADA')),
      FOREIGN KEY (venta_id) REFERENCES sales(id)
    );
    CREATE UNIQUE INDEX idx_facturas_consecutivo ON facturas(consecutivo);
    INSERT INTO facturas (id, venta_id, consecutivo, nombre_cliente, fecha_emision, estado)
    VALUES (1, 1, 'F-0001', 'Cliente Original', '2026-10-27T10:00:00', 'EMITIDA');
  `);
  return db;
}

async function crearEscenario() {
  const db = crearDbLegada();
  const app = express();
  app.use(express.json());
  app.use('/api/ventas/facturas', crearEdicionFacturasRoutes(db));
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  return {
    db,
    server,
    base: `http://127.0.0.1:${server.address().port}/api/ventas/facturas`,
    adminToken: jwt.sign({ id: 1, role: 'ADMINISTRADOR' }, JWT_SECRET),
    vendedorToken: jwt.sign({ id: 2, role: 'VENDEDOR' }, JWT_SECRET)
  };
}

async function cerrar({ server, db }) {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  db.close();
}

function pedir(escenario, ruta, { method = 'POST', token } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${escenario.base}${ruta}`, { method, headers });
}

function stock(db) {
  return db.prepare('SELECT id, stock_actual FROM products ORDER BY id')
    .all().map((fila) => ({ ...fila }));
}

function ajustes(db) {
  return db.prepare(`
    SELECT * FROM stock_movements WHERE tipo = 'AJUSTE_POSITIVO' ORDER BY id
  `).all();
}

test('HU-0404 Fase B: anula venta/factura, reingresa stock y registra Kardex', async () => {
  const escenario = await crearEscenario();
  try {
    const respuesta = await pedir(escenario, '/F-0001/reutilizar', {
      token: escenario.adminToken
    });
    const body = await respuesta.json();

    assert.equal(respuesta.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.ventaAnuladaId, 1);
    assert.equal(body.data.facturaAnulada.estado, 'ANULADA');
    assert.equal(body.data.nombreCliente, 'Cliente Original');
    assert.equal(body.data.items.length, 2);
    assert.equal(body.data.preciosActualizados, false);
    assert.deepEqual(body.data.items, [
      {
        productoId: 10, nombre: 'Producto A', cantidad: 1,
        precioOriginal: 2500, precioVentaUnitario: 2500, subtotalActual: 2500
      },
      {
        productoId: 20, nombre: 'Producto B', cantidad: 1,
        precioOriginal: 6000, precioVentaUnitario: 6000, subtotalActual: 6000
      }
    ]);

    assert.equal(
      escenario.db.prepare('SELECT estado FROM sales WHERE id = 1').get().estado,
      'ANULADA'
    );
    assert.equal(
      escenario.db.prepare("SELECT estado FROM facturas WHERE consecutivo = 'F-0001'").get().estado,
      'ANULADA'
    );
    assert.deepEqual(stock(escenario.db), [
      { id: 10, stock_actual: 11 },
      { id: 20, stock_actual: 6 }
    ]);

    const movimientos = ajustes(escenario.db);
    assert.equal(movimientos.length, 2);
    assert.equal(movimientos[0].motivo, 'Anulación venta #1 / factura F-0001');
    assert.equal(movimientos[0].usuario_id, 1);
    assert.equal(movimientos[0].stock_anterior, 10);
    assert.equal(movimientos[0].stock_nuevo, 11);
    assert.equal(movimientos[1].stock_anterior, 5);
    assert.equal(movimientos[1].stock_nuevo, 6);
  } finally {
    await cerrar(escenario);
  }
});

test('HU-0404 Fase B: devuelve precios vigentes y marca preciosActualizados', async () => {
  const escenario = await crearEscenario();
  try {
    escenario.db.prepare(
      'UPDATE products SET precio_venta_unitario = 6500 WHERE id = 20'
    ).run();

    const respuesta = await pedir(escenario, '/F-0001/reutilizar', {
      token: escenario.adminToken
    });
    const body = await respuesta.json();

    assert.equal(respuesta.status, 200);
    assert.equal(body.data.preciosActualizados, true);
    const item = body.data.items.find((i) => i.productoId === 20);
    assert.deepEqual(item, {
      productoId: 20, nombre: 'Producto B', cantidad: 1,
      precioOriginal: 6000, precioVentaUnitario: 6500, subtotalActual: 6500
    });
  } finally {
    await cerrar(escenario);
  }
});

test('HU-0404 Fase B: sin token 401, VENDEDOR 403, factura inexistente 404', async () => {
  const escenario = await crearEscenario();
  try {
    const sinToken = await pedir(escenario, '/F-0001/reutilizar');
    assert.equal(sinToken.status, 401);

    const vendedor = await pedir(escenario, '/F-0001/reutilizar', {
      token: escenario.vendedorToken
    });
    assert.equal(vendedor.status, 403);

    const noExiste = await pedir(escenario, '/F-9999/reutilizar', {
      token: escenario.adminToken
    });
    assert.equal(noExiste.status, 404);

    const invalido = await pedir(escenario, '/ABC/reutilizar', {
      token: escenario.adminToken
    });
    assert.equal(invalido.status, 400);
  } finally {
    await cerrar(escenario);
  }
});

test('HU-0404 Fase B: rechaza factura no emitida o venta ya anulada', async () => {
  const primero = await crearEscenario();
  try {
    primero.db.prepare(
      "UPDATE facturas SET estado = 'ANULADA' WHERE consecutivo = 'F-0001'"
    ).run();
    const facturaAnulada = await pedir(primero, '/F-0001/reutilizar', {
      token: primero.adminToken
    });
    assert.equal(facturaAnulada.status, 409);
  } finally {
    await cerrar(primero);
  }

  const segundo = await crearEscenario();
  try {
    segundo.db.prepare("UPDATE sales SET estado = 'ANULADA' WHERE id = 1").run();
    const ventaAnulada = await pedir(segundo, '/F-0001/reutilizar', {
      token: segundo.adminToken
    });
    assert.equal(ventaAnulada.status, 409);
  } finally {
    await cerrar(segundo);
  }
});

test('HU-0404 Fase B: producto inactivo o precio inválido hace rollback', async () => {
  const inactivo = await crearEscenario();
  try {
    inactivo.db.prepare('UPDATE products SET activo = 0 WHERE id = 10').run();
    const respuesta = await pedir(inactivo, '/F-0001/reutilizar', {
      token: inactivo.adminToken
    });
    assert.equal(respuesta.status, 409);
    assert.equal(
      inactivo.db.prepare('SELECT estado FROM sales WHERE id = 1').get().estado,
      'COMPLETADA'
    );
    assert.equal(
      inactivo.db.prepare("SELECT estado FROM facturas WHERE consecutivo = 'F-0001'").get().estado,
      'EMITIDA'
    );
    assert.deepEqual(stock(inactivo.db), [
      { id: 10, stock_actual: 10 },
      { id: 20, stock_actual: 5 }
    ]);
    assert.equal(ajustes(inactivo.db).length, 0);
  } finally {
    await cerrar(inactivo);
  }

  const precio = await crearEscenario();
  try {
    precio.db.prepare('UPDATE products SET precio_venta_unitario = 0 WHERE id = 20').run();
    const respuesta = await pedir(precio, '/F-0001/reutilizar', {
      token: precio.adminToken
    });
    assert.equal(respuesta.status, 409);
    assert.deepEqual(stock(precio.db), [
      { id: 10, stock_actual: 10 },
      { id: 20, stock_actual: 5 }
    ]);
    assert.equal(ajustes(precio.db).length, 0);
  } finally {
    await cerrar(precio);
  }
});

test('HU-0404 Fase B: doble anulación no duplica stock ni movimientos', async () => {
  const escenario = await crearEscenario();
  try {
    const primera = await pedir(escenario, '/F-0001/reutilizar', {
      token: escenario.adminToken
    });
    assert.equal(primera.status, 200);

    const segunda = await pedir(escenario, '/F-0001/reutilizar', {
      token: escenario.adminToken
    });
    assert.equal(segunda.status, 409);
    assert.deepEqual(stock(escenario.db), [
      { id: 10, stock_actual: 11 },
      { id: 20, stock_actual: 6 }
    ]);
    assert.equal(ajustes(escenario.db).length, 2);
  } finally {
    await cerrar(escenario);
  }
});

test('HU-0404 Fase B: la nueva venta es independiente y vuelve a descontar stock', async () => {
  const escenario = await crearEscenario();
  try {
    const reutilizar = await pedir(escenario, '/F-0001/reutilizar', {
      token: escenario.adminToken
    });
    assert.equal(reutilizar.status, 200);

    const stockService = new StockService(new SQLiteSalidaVentaStockRepository(escenario.db));
    const ventaRepository = new SQLiteVentaRepository(escenario.db, stockService);
    const ventaService = new VentaService(ventaRepository, null, stockService);
    const facturacionService = new FacturacionService(ventaRepository, null);

    const nuevaVenta = await ventaService.registrarVenta({
      items: [{ productoId: 10, cantidad: 2 }],
      medioPago: 'EFECTIVO',
      montoRecibido: 10000
    }, 1);
    assert.equal(nuevaVenta.isSuccess, true, nuevaVenta.error);
    const ventaId = nuevaVenta.getValue().id;
    assert.notEqual(ventaId, 1);

    const nuevaFactura = await facturacionService.generarFactura(ventaId, 'Nuevo Cliente');
    assert.equal(nuevaFactura.isSuccess, true, nuevaFactura.error);
    assert.equal(nuevaFactura.getValue().estado, 'EMITIDA');
    assert.equal(nuevaFactura.getValue().ventaId, ventaId);
    assert.notEqual(nuevaFactura.getValue().consecutivo, 'F-0001');

    assert.equal(
      escenario.db.prepare('SELECT estado FROM sales WHERE id = 1').get().estado,
      'ANULADA'
    );
    assert.equal(
      escenario.db.prepare('SELECT estado FROM sales WHERE id = ?').get(ventaId).estado,
      'COMPLETADA'
    );
    assert.deepEqual(stock(escenario.db), [
      { id: 10, stock_actual: 9 },
      { id: 20, stock_actual: 6 }
    ]);
  } finally {
    await cerrar(escenario);
  }
});

test('HU-0404 Fase B: listarDelDia excluye la venta anulada', async () => {
  const escenario = await crearEscenario();
  try {
    const respuesta = await pedir(escenario, '/F-0001/reutilizar', {
      token: escenario.adminToken
    });
    assert.equal(respuesta.status, 200);

    const repositorio = new SQLiteVentaRepository(escenario.db);
    const ventas = await repositorio.listarDelDia('2026-10-27');
    assert.deepEqual(ventas, []);
  } finally {
    await cerrar(escenario);
  }
});
