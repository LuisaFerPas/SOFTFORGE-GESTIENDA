# Gestienda — Sistema de Gestión de Inventario y Facturación

Sistema de punto de venta e inventario para la cacharrería **Variedades Don Mati** (Popayán, Colombia), desarrollado por el equipo **SOFTFORGE** (Universidad del Cauca).

---

## 🏛️ Arquitectura del Proyecto (Monorepo)

```text
gestienda/
├── backend/       # Servidor Node.js (Express, better-sqlite3, DDD, JWT)
├── frontend/      # SPA React + Vite (Paleta cálida, responsive)
├── .gitignore
└── README.md
```

---

## 🚀 Puesta en Marcha Rápida

### 1. Backend (Servidor Node.js + Base de Datos SQLite)

```bash
cd backend
cp .env.example .env    # Copia plantilla y edita JWT_SECRET
# nano .env             # Define JWT_SECRET (mínimo 32 caracteres)
npm install
npm run dev
```
* Servidor escuchando en: `http://localhost:3000`
* Salud del sistema: `http://localhost:3000/api/health`
* Archivo de base de datos local: `backend/gestienda.db` (creado automáticamente)
* **Credenciales por defecto (seed):**
  * `admin1` / `admin123` — ADMINISTRADOR
  * `admin2` / `admin123` — ADMINISTRADOR
  * `vendedor` / `vendedor123` — VENDEDOR

> **Importante:** `JWT_SECRET` es obligatorio. El servidor no arrancará sin él.

### 2. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```
* Aplicación web en: `http://localhost:5173`

---

