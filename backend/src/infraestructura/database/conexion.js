import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = process.env.DB_PATH || path.resolve(__dirname, '../../../../gestienda.db');

export const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

console.log(`[Database] SQLite nativo conectado en: ${dbPath}`);
