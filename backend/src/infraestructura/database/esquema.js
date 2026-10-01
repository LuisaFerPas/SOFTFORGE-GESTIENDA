import { db } from './conexion.js';
import bcrypt from 'bcryptjs';

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
      codigo_interno TEXT UNIQUE NOT NULL,
      codigo_barras TEXT UNIQUE,
      nombre TEXT NOT NULL,
      categoria TEXT NOT NULL,
      subcategoria TEXT,
      marca TEXT,
      costo_compra REAL NOT NULL DEFAULT 0,
      precio_venta_unitario REAL NOT NULL DEFAULT 0,
      precio_venta_mayor REAL DEFAULT 0,
      iva_porcentaje REAL DEFAULT 0,
      stock_actual INTEGER NOT NULL DEFAULT 0,
      stock_minimo_alerta INTEGER DEFAULT 0,
      fecha_ultima_compra TEXT,
      fecha_ultima_venta TEXT
    );
  `);

  const usuariosSemilla = [
    { username: 'admin1', password: 'admin123', role: 'ADMINISTRADOR' },
    { username: 'admin2', password: 'admin123', role: 'ADMINISTRADOR' },
    { username: 'vendedor', password: 'vendedor123', role: 'VENDEDOR' }
  ];

  const insertarUsuario = db.prepare(`
    INSERT OR REPLACE INTO users (username, password_hash, role, status)
    VALUES (?, ?, ?, 'ACTIVO')
  `);

  for (const usuario of usuariosSemilla) {
    const passwordHash = bcrypt.hashSync(usuario.password, bcrypt.genSaltSync(10));
    insertarUsuario.run(usuario.username, passwordHash, usuario.role);
    console.log(`[Database] Usuario semilla creado: ${usuario.username} (${usuario.role})`);
  }
}