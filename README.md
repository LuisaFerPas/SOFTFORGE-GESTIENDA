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
npm install
npm run dev
```
* Servidor escuchando en: `http://localhost:3000`
* Salud del sistema: `http://localhost:3000/api/health`
* Archivo de base de datos local: `backend/gestienda.db` (creado automáticamente)
* **Credenciales por defecto:**
  * Usuario: `admin`
  * Contraseña: `admin123`
  * Rol: `ADMINISTRADOR`

### 2. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```
* Aplicación web en: `http://localhost:5173`

---

