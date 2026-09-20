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

## 👥 Asignación de Tareas - Sprint 1 (HE-01 & HE-02)

| Desarrollador | Funcionalidad Asignada |
| :--- | :--- |
| **Luisa Fernanda (Líder)** | Cimientos del Monorepo, SQLite, Middlewares Auth/Roles y Dashboard Base |
| **Cristian Javier** | HU-0201 (Login) & HU-0302 (Logout) |
| **Juliana Andrea** | HU-0101 (Registro de Usuarios) & HU-0104 (Listado General) |
| **Juan Camilo** | HU-0102 (Edición de Usuarios) & HU-0103 (Activar/Desactivar) |
| **Henrry Santiago** | HU-0303 (Cambio Rápido de Cajero) & HU-0105 (Control de Vistas por Rol) |
