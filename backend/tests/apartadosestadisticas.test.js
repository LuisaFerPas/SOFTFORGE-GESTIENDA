import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { ApartadoService } from '../src/modulos/apartados/servicios/ApartadoService.js';
import { EstadisticasService } from '../src/modulos/reportes/servicios/EstadisticasService.js';

// =====================================================================
// CONFIGURACIÓN DE MOCKS Y BASE DE DATOS EN MEMORIA
// =====================================================================

const productoRepositoryMock = {
  async buscarPorId(id) {
    const productos = {
      1: { id: 1, nombre: 'Shampoo', stockActual: 10, precioVentaUnitario: 15000 },
      2: { id: 2, nombre: 'Juguete', stockActual: 2, precioVentaUnitario: 25000 },
      3: { id: 3, nombre: 'Crema', stockActual: 0, precioVentaUnitario: 10000 }
    };
    return productos[id] || null;
  }
};

const apartadoRepositoryMock = {};
const eventBusMock = { emit: () => {} };

function prepararBD() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE products (
      id INTEGER PRIMARY KEY,
      nombre TEXT,
      categoria TEXT,       /* <-- COLUMNA AGREGADA */
      stock_actual INTEGER,
      stock_minimo_alerta INTEGER DEFAULT 5,
      precio_venta_unitario REAL,
      costo_compra REAL,
      activo INTEGER DEFAULT 1
    );
    /* INSERT ACTUALIZADO CON CATEGORÍA */
    INSERT INTO products VALUES (1, 'Shampoo', 'Aseo', 10, 5, 15000, 10000, 1);
    INSERT INTO products VALUES (2, 'Juguete', 'Juguetes', 2, 5, 25000, 15000, 1);
    INSERT INTO products VALUES (3, 'Crema', 'Cuidado Personal', 0, 5, 10000, 6000, 1);

    CREATE TABLE sale_items (
      id INTEGER PRIMARY KEY,
      producto_id INTEGER,
      cantidad INTEGER,
      subtotal REAL
    );
    INSERT INTO sale_items VALUES (1, 1, 5, 75000);
    INSERT INTO sale_items VALUES (2, 2, 1, 25000);
  `);
  return db;
}

// =====================================================================
// PRUEBAS DEL SPRINT
// =====================================================================

test('HU-0701.2: crearApartado() falla si el producto no tiene stock suficiente', async () => {
  const service = new ApartadoService(apartadoRepositoryMock, eventBusMock, productoRepositoryMock);
  
  const payload = {
    clienteNombre: 'Cliente Prueba',
    abonoInicial: 10000,
    productos: [{ productoId: 2, cantidad: 5 }] // Pide 5, pero solo hay 2
  };

  const resultado = await service.crearApartado(payload);
  
  assert.equal(resultado.isFailure, true);
  assert.match(resultado.error, /Producto no disponible: "Juguete"/);
});

test('HU-0701.2: crearApartado() falla si el abono es mayor al total', async () => {
  const service = new ApartadoService(apartadoRepositoryMock, eventBusMock, productoRepositoryMock);
  
  const payload = {
    clienteNombre: 'Cliente Prueba',
    abonoInicial: 50000, // Total sería 15000 (1 Shampoo)
    productos: [{ productoId: 1, cantidad: 1 }]
  };

  const resultado = await service.crearApartado(payload);
  
  assert.equal(resultado.isFailure, true);
  assert.match(resultado.error, /no puede ser mayor al total/);
});

test('HU-0701.2: crearApartado() es exitoso con datos válidos', async () => {
  const service = new ApartadoService(apartadoRepositoryMock, eventBusMock, productoRepositoryMock);
  
  const payload = {
    clienteNombre: 'Cliente Prueba',
    abonoInicial: 5000,
    productos: [{ productoId: 1, cantidad: 1 }] // Shampoo: 15000
  };

  const resultado = await service.crearApartado(payload);
  
  assert.equal(resultado.isSuccess, true);
  assert.equal(resultado.getValue().data.total, 15000);
  assert.equal(resultado.getValue().data.saldoPendiente, 10000); // 15000 - 5000
});

test('HU-0902.2: consultarDesempenioProductos() devuelve los 4 reportes esperados', async () => {
  const db = prepararBD();
  const service = new EstadisticasService(db);
  
  const data = await service.consultarDesempenioProductos();
  
  assert.ok(data.masVendidos.length > 0, 'Debe haber productos más vendidos');
  assert.ok(data.porCategoria.length > 0, 'Debe haber ventas por categoría');
  assert.ok(data.alertasStock.length > 0, 'Debe haber alertas de stock');
  assert.ok(data.ganancias.length > 0, 'Debe haber cálculo de ganancias');
  
  // Verificamos que el Top 1 sea el Shampoo (5 vendidos)
  assert.equal(data.masVendidos[0].nombre, 'Shampoo');
  assert.equal(data.masVendidos[0].total_unidades, 5);
  
  db.close();
});