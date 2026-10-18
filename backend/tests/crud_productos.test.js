/**
 * Pruebas Unitarias para el Módulo de Inventario - CRUD de Catálogo de Productos
 * Responsable: Santiago
 * 
 * Historias de Usuario Cubiertas:
 *  - HU-0501: Registrar nuevo producto en el catálogo (Subtareas HU-0501.1 a HU-0501.5)
 *  - HU-0502: Modificar información de producto (Subtareas HU-0502.1 a HU-0502.4)
 *  - HU-0503: Dar de baja producto con baja lógica (Subtareas HU-0503.1 a HU-0503.4)
 */
import test from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import { SQLiteProductoRepository } from '../src/modulos/inventario/infraestructura/persistencia/SQLiteProductoRepository.js';
import { ProductoService } from '../src/modulos/inventario/aplicacion/ProductoService.js';
import { ProductoController } from '../src/modulos/inventario/presentacion/productoController.js';

function setupTestDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVO'
    );

    CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_interno TEXT UNIQUE NOT NULL COLLATE NOCASE,
      codigo_barras TEXT UNIQUE COLLATE NOCASE,
      nombre TEXT NOT NULL,
      categoria TEXT NOT NULL,
      subcategoria TEXT,
      marca TEXT,
      costo_compra REAL NOT NULL DEFAULT 0,
      precio_venta_unitario REAL NOT NULL DEFAULT 0,
      precio_venta_mayor REAL DEFAULT 0,
      iva_porcentaje REAL DEFAULT 0,
      stock_actual INTEGER NOT NULL DEFAULT 0,
      stock_minimo_alerta INTEGER DEFAULT 10,
      fecha_ultima_compra TEXT,
      fecha_ultima_venta TEXT,
      activo INTEGER NOT NULL DEFAULT 1
    );

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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return db;
}

test('HU-0501 [HU-0501.3 / HU-0501.5]: Registrar nuevo producto exitosamente', async () => {
  const db = setupTestDb();
  const repo = new SQLiteProductoRepository(db);
  const service = new ProductoService(repo);

  const res = await service.registrarProducto({
    codigoInterno: 'JUG-001',
    codigoBarras: '7701234567890',
    nombre: 'Carro a Control Remoto',
    categoria: 'Juguetes',
    costoCompra: 25000,
    precioVentaUnitario: 45000,
    precioVentaMayor: 38000,
    ivaPorcentaje: 19,
    stockActual: 15,
    stockMinimoAlerta: 5
  });

  assert.strictEqual(res.isSuccess, true);
  const prod = res.getValue();
  assert.strictEqual(prod.codigoInterno, 'JUG-001');
  assert.strictEqual(prod.nombre, 'Carro a Control Remoto');
  assert.strictEqual(prod.categoria, 'Juguetes');
  assert.strictEqual(prod.stockActual, 15);
  assert.strictEqual(prod.margenUtilidadPorcentaje, 80);
  assert.strictEqual(prod.activo, 1);
});

test('HU-0501 [HU-0501.3 / HU-0501.5]: Rechazar registro si el código interno ya existe', async () => {
  const db = setupTestDb();
  const repo = new SQLiteProductoRepository(db);
  const service = new ProductoService(repo);

  await service.registrarProducto({
    codigoInterno: 'DUP-001',
    nombre: 'Original',
    categoria: 'Aseo',
    precioVentaUnitario: 1000
  });

  const resDuplicado = await service.registrarProducto({
    codigoInterno: 'dup-001', // Insensible a mayúsculas
    nombre: 'Copia',
    categoria: 'Aseo',
    precioVentaUnitario: 1200
  });

  assert.strictEqual(resDuplicado.isFailure, true);
  assert.match(resDuplicado.error, /Ya existe un producto con el código interno/i);
});

test('HU-0501 [HU-0501.3]: Rechazar registro si la categoría no pertenece a las 5 oficiales', async () => {
  const db = setupTestDb();
  const repo = new SQLiteProductoRepository(db);
  const service = new ProductoService(repo);

  const res = await service.registrarProducto({
    codigoInterno: 'CAT-001',
    nombre: 'Producto Raro',
    categoria: 'Ferretería Invalida',
    precioVentaUnitario: 5000
  });

  assert.strictEqual(res.isFailure, true);
  assert.match(res.error, /no es válida/i);
});

test('HU-0501 [HU-0501.3]: Rechazar registro si el código de barras ya existe en otro producto activo', async () => {
  const db = setupTestDb();
  const repo = new SQLiteProductoRepository(db);
  const service = new ProductoService(repo);

  await service.registrarProducto({
    codigoInterno: 'BAR-001',
    codigoBarras: '7709998887771',
    nombre: 'Shampoo 500ml',
    categoria: 'Aseo',
    precioVentaUnitario: 12000
  });

  const resDuplicadoBarras = await service.registrarProducto({
    codigoInterno: 'BAR-002',
    codigoBarras: '7709998887771', // mismo código de barras
    nombre: 'Acondicionador 500ml',
    categoria: 'Aseo',
    precioVentaUnitario: 13000
  });

  assert.strictEqual(resDuplicadoBarras.isFailure, true);
  assert.match(resDuplicadoBarras.error, /código de barras/i);
});

test('HU-0502 [HU-0502.2 / HU-0502.4]: Modificar información de un producto existente', async () => {
  const db = setupTestDb();
  const repo = new SQLiteProductoRepository(db);
  const service = new ProductoService(repo);

  const reg = await service.registrarProducto({
    codigoInterno: 'MOD-001',
    nombre: 'Balón Plástico',
    categoria: 'Juguetes',
    costoCompra: 5000,
    precioVentaUnitario: 10000
  });

  const id = reg.getValue().id;

  const modRes = await service.modificarProducto(id, {
    nombre: 'Balón Plástico Profesional',
    categoria: 'Juguetes',
    costoCompra: 6000,
    precioVentaUnitario: 12000,
    stockMinimoAlerta: 8
  });

  assert.strictEqual(modRes.isSuccess, true);
  const modProd = modRes.getValue();
  assert.strictEqual(modProd.nombre, 'Balón Plástico Profesional');
  assert.strictEqual(modProd.precioVentaUnitario, 12000);
  assert.strictEqual(modProd.stockMinimoAlerta, 8);
  assert.strictEqual(modProd.codigoInterno, 'MOD-001'); // preservado
});

test('HU-0502 [HU-0502.2]: Impedir modificar el código interno para mantener trazabilidad', async () => {
  const db = setupTestDb();
  const repo = new SQLiteProductoRepository(db);
  const service = new ProductoService(repo);

  const reg = await service.registrarProducto({
    codigoInterno: 'LOCK-001',
    nombre: 'Muñeca',
    categoria: 'Juguetes',
    precioVentaUnitario: 15000
  });

  const id = reg.getValue().id;

  const modRes = await service.modificarProducto(id, {
    codigoInterno: 'LOCK-CAMBIADO',
    nombre: 'Muñeca Nueva'
  });

  assert.strictEqual(modRes.isFailure, true);
  assert.match(modRes.error, /no puede ser modificado/i);
});

test('HU-0503 [HU-0503.2 / HU-0503.4]: Dar de baja (desactivar lógicamente) un producto', async () => {
  const db = setupTestDb();
  const repo = new SQLiteProductoRepository(db);
  const service = new ProductoService(repo);

  const reg = await service.registrarProducto({
    codigoInterno: 'BAJA-001',
    nombre: 'Plato Desechable',
    categoria: 'Piñatería',
    precioVentaUnitario: 3000
  });

  const id = reg.getValue().id;

  const bajaRes = await service.darDeBajaProducto(id);
  assert.strictEqual(bajaRes.isSuccess, true);

  // Listar productos no debe incluir el inactivo
  const lista = await service.listarProductos();
  assert.strictEqual(lista.getValue().some(p => p.id === id), false);

  // Intentar dar de baja nuevamente debe fallar
  const bajaDoble = await service.darDeBajaProducto(id);
  assert.strictEqual(bajaDoble.isFailure, true);
  assert.match(bajaDoble.error, /ya se encuentra inactivo/i);
});

test('HU-0503 [HU-0503.2]: La baja es estrictamente lógica (conserva el registro en BD con activo=0)', async () => {
  const db = setupTestDb();
  const repo = new SQLiteProductoRepository(db);
  const service = new ProductoService(repo);

  const reg = await service.registrarProducto({
    codigoInterno: 'TRAZA-001',
    nombre: 'Pelota Antiestrés',
    categoria: 'Juguetes',
    precioVentaUnitario: 8000
  });

  const id = reg.getValue().id;
  await service.darDeBajaProducto(id);

  // Verificar directamente en SQLite que el registro SIGUE EXISTIENDO físicamente
  const filaSqlite = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  assert.ok(filaSqlite, 'El registro debe permanecer en la base de datos');
  assert.strictEqual(filaSqlite.activo, 0, 'El campo activo debe ser 0 (baja lógica)');
  assert.strictEqual(filaSqlite.codigo_interno, 'TRAZA-001');
});

test('HU-0501.4 / HU-0502.3 / HU-0503.3: Controlador HTTP responde con estados y datos correctos (201, 200, 200)', async () => {
  const db = setupTestDb();
  const repo = new SQLiteProductoRepository(db);
  const service = new ProductoService(repo);
  const controller = new ProductoController(service, null);

  // Helper para simular respuesta express
  const crearRes = () => {
    const res = {
      statusCode: null,
      jsonData: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      }
    };
    return res;
  };

  // 1. Registrar (HU-0501.4) -> 201 Created
  const reqReg = {
    body: {
      codigoInterno: 'CTRL-001',
      nombre: 'Esmalte Brillo',
      categoria: 'Maquillaje',
      costoCompra: 2000,
      precioVentaUnitario: 5000
    }
  };
  const resReg = crearRes();
  await controller.registrar(reqReg, resReg);

  assert.strictEqual(resReg.statusCode, 201);
  assert.strictEqual(resReg.jsonData.success, true);
  const prodId = resReg.jsonData.data.id;

  // 2. Editar (HU-0502.3) -> 200 OK
  const reqEdit = {
    params: { id: prodId },
    body: {
      nombre: 'Esmalte Brillo Extra',
      precioVentaUnitario: 6000
    }
  };
  const resEdit = crearRes();
  await controller.editar(reqEdit, resEdit);

  assert.strictEqual(resEdit.statusCode, 200);
  assert.strictEqual(resEdit.jsonData.data.nombre, 'Esmalte Brillo Extra');

  // 3. Eliminar (HU-0503.3) -> 200 OK
  const reqDel = { params: { id: prodId } };
  const resDel = crearRes();
  await controller.eliminar(reqDel, resDel);

  assert.strictEqual(resDel.statusCode, 200);
  assert.strictEqual(resDel.jsonData.success, true);
});


