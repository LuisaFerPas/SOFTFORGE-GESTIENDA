import test from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import { CategoriaProducto, esCategoriaValida, normalizarCategoria } from '../src/modulos/inventario/dominio/CategoriaProducto.js';
import { Producto } from '../src/modulos/inventario/dominio/Producto.js';
import { MovimientoStock, TipoMovimientoStock } from '../src/modulos/inventario/dominio/MovimientoStock.js';
import { ProductoMapper } from '../src/modulos/inventario/infraestructura/persistencia/mappers/ProductoMapper.js';
import { SQLiteProductoRepository } from '../src/modulos/inventario/infraestructura/persistencia/SQLiteProductoRepository.js';
import { ProductoService } from '../src/modulos/inventario/aplicacion/ProductoService.js';
import { LectorCodigoMockAdapter } from '../src/modulos/inventario/infraestructura/adaptadores/LectorCodigoMockAdapter.js';

// Setup de base de datos en memoria para pruebas
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

test('1. [Dominio] CategoriaProducto valida exactamente las 5 categorías oficiales de Don Mati', () => {
  assert.strictEqual(esCategoriaValida('Juguetes'), true);
  assert.strictEqual(esCategoriaValida('Aseo'), true);
  assert.strictEqual(esCategoriaValida('Cacharro'), true);
  assert.strictEqual(esCategoriaValida('Maquillaje'), true);
  assert.strictEqual(esCategoriaValida('Piñatería'), true);
  assert.strictEqual(esCategoriaValida('pinateria'), true);

  assert.strictEqual(esCategoriaValida('Ropa'), false);
  assert.strictEqual(esCategoriaValida('Electrodomésticos'), false);
  assert.strictEqual(normalizarCategoria('juguetes'), 'Juguetes');
});

test('2. [Dominio] Producto calcula correctamente márgenes, ganancias y alertas de stock', () => {
  const p = new Producto({
    codigoInterno: 'PROD-001',
    nombre: 'Cuaderno Cuadriculado 100H',
    categoria: CategoriaProducto.CACHARRO,
    costoCompra: 2000,
    precioVentaUnitario: 3000,
    stockActual: 5,
    stockMinimoAlerta: 10
  });

  assert.strictEqual(p.calcularGananciaUnitaria(), 1000);
  assert.strictEqual(p.calcularMargenUtilidad(), 50);
  assert.strictEqual(p.tieneStockBajo(), true);
  assert.strictEqual(p.estaAgotado(), false);

  assert.throws(() => {
    new Producto({ codigoInterno: 'X', nombre: 'Test', categoria: 'CategoriaInexistente' });
  });
  assert.throws(() => {
    new Producto({ codigoInterno: 'X', nombre: 'Test', categoria: 'Aseo', costoCompra: -10 });
  });
});

test('3. [Data Mapper] ProductoMapper transforma correctamente entre SQL y Dominio', () => {
  const filaSql = {
    id: 99,
    codigo_interno: 'JUG-99',
    codigo_barras: '770999999999',
    nombre: 'Muñeca Articulada',
    categoria: 'Juguetes',
    subcategoria: 'Muñecas',
    marca: 'Mattel',
    costo_compra: 30000,
    precio_venta_unitario: 45000,
    precio_venta_mayor: 40000,
    iva_porcentaje: 19,
    stock_actual: 12,
    stock_minimo_alerta: 5,
    fecha_ultima_compra: '2026-10-01',
    fecha_ultima_venta: null,
    activo: 1
  };

  const producto = ProductoMapper.aDominio(filaSql);
  assert.strictEqual(producto.codigoInterno, 'JUG-99');
  assert.strictEqual(producto.costoCompra, 30000);
  assert.strictEqual(producto.calcularMargenUtilidad(), 50);

  const persistencia = ProductoMapper.aPersistencia(producto);
  assert.strictEqual(persistencia.codigo_interno, 'JUG-99');
  assert.strictEqual(persistencia.costo_compra, 30000);
});

test('4. [HU-0607] Sanitización de producto oculta stock y costos al rol VENDEDOR', () => {
  const p = new Producto({
    id: 1,
    codigoInterno: 'JUG-01',
    codigoBarras: '7701234567890',
    nombre: 'Carro de Juguete',
    categoria: CategoriaProducto.JUGUETES,
    costoCompra: 15000,
    precioVentaUnitario: 25000,
    stockActual: 8,
    stockMinimoAlerta: 10
  });

  const vistaVendedor = p.sanitizarParaVendedor();
  assert.strictEqual(vistaVendedor.nombre, 'Carro de Juguete');
  assert.strictEqual(vistaVendedor.precioVentaUnitario, 25000);
  assert.strictEqual(vistaVendedor.stockActual, undefined, 'El Vendedor no debe recibir stockActual');
  assert.strictEqual(vistaVendedor.costoCompra, undefined, 'El Vendedor no debe recibir costoCompra');
  assert.strictEqual(vistaVendedor.stockMinimoAlerta, undefined, 'El Vendedor no debe recibir stockMinimoAlerta');
});

test('5. [Persistencia] SQLiteProductoRepository guarda, consulta por código y ejecuta movimientos atómicos', async () => {
  const db = setupTestDb();
  const repo = new SQLiteProductoRepository(db);

  const prodId = await repo.guardar(new Producto({
    codigoInterno: 'ASEO-01',
    codigoBarras: '770999888111',
    nombre: 'Jabón Multiusos',
    categoria: CategoriaProducto.ASEO,
    costoCompra: 1200,
    precioVentaUnitario: 1800,
    stockActual: 20
  }));

  assert.ok(prodId > 0);

  const encontrado = await repo.buscarPorCodigo('770999888111');
  assert.strictEqual(encontrado.nombre, 'Jabón Multiusos');
  assert.strictEqual(encontrado.stockActual, 20);

  const resEntrada = await repo.registrarMovimientoEnTransaccion({
    productoId: prodId,
    tipo: TipoMovimientoStock.ENTRADA,
    cantidad: 10,
    costoUnitario: 1250,
    motivo: 'Llegada de factura #1040',
    usuarioId: 1
  });

  assert.strictEqual(resEntrada.stockAnterior, 20);
  assert.strictEqual(resEntrada.stockNuevo, 30);

  const productoActualizado = await repo.buscarPorId(prodId);
  assert.strictEqual(productoActualizado.stockActual, 30);
  assert.strictEqual(productoActualizado.costoCompra, 1250);

  const movimientos = await repo.listarMovimientos({ productoId: prodId });
  assert.strictEqual(movimientos.length, 1);
  assert.strictEqual(movimientos[0].tipo, 'ENTRADA');
  assert.strictEqual(movimientos[0].cantidad, 10);
});

test('6. [HU-0607 & Servicio] ProductoService deniega consulta de stock directa a Vendedores', async () => {
  const db = setupTestDb();
  const repo = new SQLiteProductoRepository(db);
  const service = new ProductoService(repo);

  const id = await repo.guardar(new Producto({
    codigoInterno: 'MAQ-01',
    nombre: 'Labial Mate',
    categoria: CategoriaProducto.MAQUILLAJE,
    costoCompra: 5000,
    precioVentaUnitario: 9000,
    stockActual: 15
  }));

  const resVendedor = await service.consultarStockActual(id, 'VENDEDOR');
  assert.strictEqual(resVendedor.isFailure, true);
  assert.ok(resVendedor.error.includes('Acceso restringido'));

  const resAdmin = await service.consultarStockActual(id, 'ADMINISTRADOR');
  assert.strictEqual(resAdmin.isSuccess, true);
  assert.strictEqual(resAdmin.getValue().stockActual, 15);
});

test('7. [Hexagonal - Puerto Hardware] LectorCodigoMockAdapter permite simulación de lectura', async () => {
  const mockAdapter = new LectorCodigoMockAdapter(['770555444333', '770111222333']);
  const codigo1 = await mockAdapter.leerCodigo();
  const codigo2 = await mockAdapter.leerCodigo();

  assert.strictEqual(codigo1, '770555444333');
  assert.strictEqual(codigo2, '770111222333');
});
