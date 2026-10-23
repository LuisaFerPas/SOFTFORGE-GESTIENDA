import { db } from './conexion.js';
import bcrypt from 'bcryptjs';
import { seedProductos } from './seedProductos.js';

export function inicializarEsquema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ADMINISTRADOR', 'VENDEDOR')),
      status TEXT NOT NULL DEFAULT 'ACTIVO' CHECK(status IN ('ACTIVO', 'INACTIVO')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
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

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id INTEGER NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('ENTRADA', 'SALIDA_VENTA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'MERMA')),
      cantidad INTEGER NOT NULL,
      stock_anterior INTEGER NOT NULL,
      stock_nuevo INTEGER NOT NULL,
      costo_unitario REAL DEFAULT 0,
      motivo TEXT,
      usuario_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (producto_id) REFERENCES products(id) ON DELETE RESTRICT,
      FOREIGN KEY (usuario_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      total REAL NOT NULL,
      medio_pago TEXT NOT NULL CHECK(medio_pago IN ('EFECTIVO','NEQUI','MIXTO')),
      monto_efectivo REAL NOT NULL DEFAULT 0,
      monto_nequi REAL NOT NULL DEFAULT 0,
      cambio REAL NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL,
      producto_id INTEGER NOT NULL,
      cantidad INTEGER NOT NULL CHECK(cantidad > 0),
      precio_unitario REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (venta_id) REFERENCES sales(id),
      FOREIGN KEY (producto_id) REFERENCES products(id) ON DELETE RESTRICT
    );


    CREATE TABLE IF NOT EXISTS facturas (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id       INTEGER NOT NULL UNIQUE,
      consecutivo    TEXT    NOT NULL UNIQUE,
      nombre_cliente TEXT    NOT NULL DEFAULT 'Consumidor Final',
      fecha_emision  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      estado         TEXT    NOT NULL DEFAULT 'EMITIDA'
                     CHECK(estado IN ('EMITIDA','ANULADA')),
      FOREIGN KEY (venta_id) REFERENCES sales(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_facturas_consecutivo ON facturas(consecutivo);
    CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
    CREATE INDEX IF NOT EXISTS idx_sale_items_venta ON sale_items(venta_id);

    CREATE INDEX IF NOT EXISTS idx_products_codigo_barras ON products(codigo_barras);
    CREATE INDEX IF NOT EXISTS idx_products_codigo_interno ON products(codigo_interno);
    CREATE INDEX IF NOT EXISTS idx_products_categoria ON products(categoria);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_producto ON stock_movements(producto_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_fecha ON stock_movements(created_at);
  `);

  // Asegurar que si la tabla products ya existÃƒÂ­a sin la columna 'activo', se le agregue
  try {
    const tableInfo = db.prepare("PRAGMA table_info(products);").all();
    const hasActivo = tableInfo.some(col => col.name === 'activo');
    if (!hasActivo) {
      db.exec("ALTER TABLE products ADD COLUMN activo INTEGER NOT NULL DEFAULT 1;");
    }
  } catch (e) {
    // Ignorar si ya existe
  }

  // HU-0300.5: Migracion defensiva — crear tabla facturas si la BD ya existia sin ella.
  try {
    const tablaFacturas = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='facturas';").get();
    if (!tablaFacturas) {
      db.exec(`
        CREATE TABLE facturas (
          id             INTEGER PRIMARY KEY AUTOINCREMENT,
          venta_id       INTEGER NOT NULL UNIQUE,
          consecutivo    TEXT    NOT NULL UNIQUE,
          nombre_cliente TEXT    NOT NULL DEFAULT 'Consumidor Final',
          fecha_emision  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          estado         TEXT    NOT NULL DEFAULT 'EMITIDA'
                         CHECK(estado IN ('EMITIDA','ANULADA')),
          FOREIGN KEY (venta_id) REFERENCES sales(id)
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_facturas_consecutivo ON facturas(consecutivo);
      `);
    }
  } catch (e) {
    // Ignorar si ya existe
  }

  // SD-73: opt-in explÃƒÂ­cito; nunca sembrar datos ficticios en producciÃƒÂ³n.
  if (process.env.NODE_ENV !== 'production' && process.env.GESTIENDA_SEED_DEMO === 'true') {
    seedProductos(db);
  }

  // Usuarios Semilla
  const usuariosSemilla = [
    { username: 'admin1', password: 'admin123', role: 'ADMINISTRADOR' },
    { username: 'admin2', password: 'admin123', role: 'ADMINISTRADOR' },
    { username: 'vendedor', password: 'vendedor123', role: 'VENDEDOR' }
  ];

  // INSERT OR IGNORE: solo inserta si el username no existe todavÃƒÂ­a.
  // No usar INSERT OR REPLACE porque SQLite lo implementa como DELETE+INSERT,
  // lo que viola la FK de stock_movements.usuario_id si ya hay movimientos registrados.
  const insertarUsuario = db.prepare(`
    INSERT OR IGNORE INTO users (username, password_hash, role, status)
    VALUES (?, ?, ?, 'ACTIVO')
  `);

  for (const usuario of usuariosSemilla) {
    const passwordHash = bcrypt.hashSync(usuario.password, bcrypt.genSaltSync(10));
    insertarUsuario.run(usuario.username, passwordHash, usuario.role);
  }
}
