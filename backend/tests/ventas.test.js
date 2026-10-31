import 'dotenv/config'; 
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import express from 'express';
import jwt from 'jsonwebtoken';

import { VentaService } from '../src/modulos/ventas/servicios/VentaService.js';
import { SQLiteVentaRepository } from '../src/modulos/ventas/infraestructura/persistencia/SQLiteVentaRepository.js';
import { SQLiteSalidaVentaStockRepository } from '../src/modulos/ventas/infraestructura/persistencia/SQLiteSalidaVentaStockRepository.js';
import { StockService } from '../src/modulos/inventario/aplicacion/StockService.js';
import { SQLiteProductoRepository } from '../src/modulos/inventario/infraestructura/persistencia/SQLiteProductoRepository.js';
import { crearEdicionFacturasRoutes } from '../src/modulos/ventas/presentacion/edicionFacturasRoutes.js';
import { JWT_SECRET } from '../src/modulos/usuarios/presentacion/authMiddleware.js';

// NUEVO IMPORT: Necesario para tus pruebas de Facturación
import { FacturacionService } from '../src/modulos/ventas/servicios/FacturacionService.js';

/**
 * SD-118 / HU-0305.3: pruebas de integración con los repositorios reales.
 * La base existe solo en memoria; NO usa gestienda-demo.db.
 */
function prepararVenta() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL
    );
    INSERT INTO users VALUES (1, 'cajero-pruebas');

    CREATE TABLE products (
      id INTEGER PRIMARY KEY,
      codigo_interno TEXT NOT NULL,
      codigo_barras TEXT,
      nombre TEXT NOT NULL,
      categoria TEXT NOT NULL,
      subcategoria TEXT,
      marca TEXT,
      costo_compra REAL NOT NULL DEFAULT 0,
      precio_venta_unitario REAL NOT NULL,
      precio_venta_mayor REAL DEFAULT 0,
      iva_porcentaje REAL DEFAULT 0,
      stock_actual INTEGER,
      stock_minimo_alerta INTEGER DEFAULT 10,
      fecha_ultima_compra TEXT,
      fecha_ultima_venta TEXT,
      activo INTEGER NOT NULL DEFAULT 1
    );

    INSERT INTO products
      (id, codigo_interno, nombre, categoria, precio_venta_unitario, stock_actual)
    VALUES
      (10, 'ASE-010', 'Producto A', 'Aseo', 2500, 5),
      (20, 'ASE-020', 'Producto B', 'Aseo', 6000, 0),
      (30, 'ASE-030', 'Producto C', 'Aseo', 3000, NULL),
      (40, 'ASE-040', 'Producto D', 'Aseo', 3500, 7),
      (50, 'ASE-050', 'Producto E', 'Aseo', 2000, -2);

    CREATE TABLE sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      total REAL NOT NULL,
      medio_pago TEXT NOT NULL,
      monto_efectivo REAL NOT NULL DEFAULT 0,
      monto_nequi REAL NOT NULL DEFAULT 0,
      cambio REAL NOT NULL DEFAULT 0,
      created_at TEXT,
      FOREIGN KEY (usuario_id) REFERENCES users(id)
    );

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

    CREATE TABLE stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      cantidad INTEGER NOT NULL,
      stock_anterior INTEGER NOT NULL,
      stock_nuevo INTEGER NOT NULL,
      motivo TEXT,
      usuario_id INTEGER,
      created_at TEXT,
      FOREIGN KEY (producto_id) REFERENCES products(id)
    );
  `);

  // Ambos repositorios y StockService comparten la misma DatabaseSync.
  const productos = new SQLiteProductoRepository(db);
  const salidas = new StockService(new SQLiteSalidaVentaStockRepository(db));
  const ventas = new VentaService(new SQLiteVentaRepository(db, salidas), null, salidas);
  const contar = (tabla) =>
    db.prepare(`SELECT COUNT(*) AS total FROM ${tabla}`).get().total;

  return { db, productos, ventas, contar };
}

test('SD-118 / HU-0305.3: al vender dos productos disminuye el stock consultado mediante SQLiteProductoRepository', async () => {
  const { db, productos, ventas, contar } = prepararVenta();
  try {
    const antesA = await productos.buscarPorId(10);
    const antesD = await productos.buscarPorId(40);
    assert.equal(antesA.stockActual, 5);
    assert.equal(antesD.stockActual, 7);

    const resultado = await ventas.registrarVenta({
      items: [
        { productoId: 10, cantidad: 2 },
        { productoId: 40, cantidad: 3 }
      ],
      medioPago: 'NEQUI'
    }, 1);

    assert.equal(resultado.isSuccess, true, resultado.error);
    assert.equal(resultado.getValue().total, 15500);

    // Criterio de Jira: verificar mediante el repositorio SQLiteProductoRepository.
    const despuesA = await productos.buscarPorId(10);
    const despuesD = await productos.buscarPorId(40);
    assert.equal(despuesA.stockActual, antesA.stockActual - 2);
    assert.equal(despuesD.stockActual, antesD.stockActual - 3);
    assert.equal(despuesA.stockActual, 3);
    assert.equal(despuesD.stockActual, 4);

    // Ni el servicio ni el repositorio deben descontar dos veces.
    assert.equal(contar('sales'), 1);
    assert.equal(contar('sale_items'), 2);
    assert.equal(contar('stock_movements'), 2);
    assert.equal(db.isTransaction, false);
  } finally {
    db.close();
  }
});

test('SD-117 / HU-0305.2: permite stock cero, queda negativo y registra advertencia en servidor', async () => {
  const { db, productos, ventas, contar } = prepararVenta();
  const avisos = [];
  const advertir = console.warn;
  console.warn = (...partes) => avisos.push({ texto: partes.join(' '), enTransaccion: db.isTransaction });
  try {
    const resultado = await ventas.registrarVenta({
      items: [{ productoId: 20, cantidad: 2 }], medioPago: 'NEQUI'
    }, 1);
    assert.equal(resultado.isSuccess, true, resultado.error);
    assert.equal((await productos.buscarPorId(20)).stockActual, -2);
    assert.equal(contar('sales'), 1);
    assert.equal(resultado.getValue().advertencias.length, 1);
    assert.equal(avisos.length, 1);
    assert.match(avisos[0].texto, /\[Inventario\].*stock insuficiente/);
    assert.match(avisos[0].texto, /Venta #1/);
    assert.equal(avisos[0].enTransaccion, false, 'El log se emite tras el COMMIT');
    assert.equal(db.isTransaction, false);
  } finally {
    console.warn = advertir;
    db.close();
  }
});

test('SD-117 / HU-0305.2: permite stock NULL, lo trata como cero y avisa al servidor', async () => {
  const { db, productos, ventas } = prepararVenta();
  const avisos = [];
  const advertir = console.warn;
  console.warn = (...partes) => avisos.push({ texto: partes.join(' '), enTransaccion: db.isTransaction });
  try {
    const filaInicial = db.prepare('SELECT stock_actual FROM products WHERE id = 30').get();
    assert.equal(filaInicial.stock_actual, null);

    const resultado = await ventas.registrarVenta({
      items: [{ productoId: 30, cantidad: 1 }], medioPago: 'NEQUI'
    }, 1);
    assert.equal(resultado.isSuccess, true, resultado.error);
    assert.equal((await productos.buscarPorId(30)).stockActual, -1);
    assert.equal(resultado.getValue().advertencias.length, 1);
    assert.equal(avisos.length, 1);
    assert.match(avisos[0].texto, /stock insuficiente/);
    assert.equal(avisos[0].enTransaccion, false, 'El log se emite tras el COMMIT');
    assert.equal(db.isTransaction, false);
  } finally {
    console.warn = advertir;
    db.close();
  }
});

test('HU-0404.5: VENDEDOR recibe 403 al intentar editar una factura vía PUT /api/ventas/facturas/:consecutivo', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'VENDEDOR');
    INSERT INTO users VALUES (1, 'vendedor-pruebas', 'VENDEDOR');
    INSERT INTO users VALUES (2, 'admin-pruebas', 'ADMINISTRADOR');

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
      estado TEXT NOT NULL DEFAULT 'COMPLETADA',
      created_at TEXT,
      FOREIGN KEY (usuario_id) REFERENCES users(id)
    );
    INSERT INTO sales (id, usuario_id, total, medio_pago, estado, created_at)
    VALUES (1, 1, 2500, 'EFECTIVO', 'COMPLETADA', '2026-10-27T10:00:00');

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
    VALUES (1, 1, 'F-0001', 'Cliente Prueba', '2026-10-27T10:00:00', 'EMITIDA');
  `);

  const app = express();
  app.use(express.json());
  app.use('/api/ventas/facturas', crearEdicionFacturasRoutes(db));

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}/api/ventas/facturas`;

  const token = jwt.sign({ id: 1, role: 'VENDEDOR' }, JWT_SECRET);

  try {
    const respuesta = await fetch(`${base}/F-0001`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ nombreCliente: 'Cliente Editado' })
    });
    const body = await respuesta.json();
    assert.equal(respuesta.status, 403);
    assert.equal(body.success, false);
    assert.equal(body.message, 'Permisos insuficientes');
  } finally {
    await new Promise((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
    db.close();
  }
});

// ==========================================================
// NUEVAS PRUEBAS: Equipo 2 (Juliana) - HU-0402.5
// ==========================================================

test('HU-0402.5: FacturacionService.construirTicket() incluye todos los campos requeridos', () => {
  // 1. Instanciamos el servicio con dependencias nulas (ya que solo probamos la función pura)
  const facturacionService = new FacturacionService(null, null);

  // 2. Simulamos un objeto "venta" con productos mockeados
  const ventaMock = {
    id: 101,
    total: 45000,
    items: [
      { descripcion: 'Shampoo Sedal', cantidad: 2, precioUnitario: 15000, subtotal: 30000 },
      { descripcion: 'Juguete Carros', cantidad: 1, precioUnitario: 15000, subtotal: 15000 }
    ]
  };

  // 3. Ejecutamos el método
  const ticket = facturacionService.construirTicket(ventaMock, 'Maria Perez');

  // 4. Verificamos que el ticket tenga la estructura correcta
  assert.equal(ticket.cliente, 'Maria Perez');
  assert.equal(ticket.total, 45000);
  assert.equal(ticket.items.length, 2);
  
  // Verificamos el primer producto del ticket
  assert.equal(ticket.items[0].nombre, 'Shampoo Sedal');
  assert.equal(ticket.items[0].cantidad, 2);
  assert.equal(ticket.items[0].precio, 15000);
  assert.equal(ticket.items[0].subtotal, 30000);

  // Verificamos que el encabezado y pie estén definidos
  assert.equal(ticket.encabezado, 'VARIEDADES DON MATI');
  assert.ok(ticket.pie.includes('Gracias'));
});

test('HU-0402.1: construirTicket() lanza error si la venta no tiene items', () => {
  const facturacionService = new FacturacionService(null, null);
  assert.throws(() => {
    facturacionService.construirTicket(null, 'Cliente');
  }, /Datos de venta inválidos/);
});