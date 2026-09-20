import express from 'express';
import cors from 'cors';
import { db } from './infraestructura/database/conexion.js';
import { inicializarEsquema } from './infraestructura/database/esquema.js';
import { eventBus } from './shared/EventBus.js';
import { ImpresoraTermicaAdapter } from './infraestructura/impresora/impresoraTermica.js';

// Módulo: Usuarios & Auth
import { UsuarioRepository } from './modulos/usuarios/dominio/UsuarioRepository.js';
import { AuthService } from './modulos/usuarios/servicios/AuthService.js';
import { UsuarioService } from './modulos/usuarios/servicios/UsuarioService.js';
import { AuthController } from './modulos/usuarios/presentacion/authController.js';
import { UsuarioController } from './modulos/usuarios/presentacion/usuarioController.js';
import { crearAuthRoutes } from './modulos/usuarios/presentacion/authRoutes.js';
import { crearUsuarioRoutes } from './modulos/usuarios/presentacion/usuarioRoutes.js';

// Módulo: Inventario & Catálogo
import { ProductoRepository } from './modulos/inventario/dominio/ProductoRepository.js';
import { ProductoService } from './modulos/inventario/servicios/ProductoService.js';
import { StockService } from './modulos/inventario/servicios/StockService.js';
import { ProductoController } from './modulos/inventario/presentacion/productoController.js';
import { crearInventarioRoutes } from './modulos/inventario/presentacion/inventarioRoutes.js';

// Módulo: Ventas & Facturación
import { VentaRepository } from './modulos/ventas/dominio/VentaRepository.js';
import { VentaService } from './modulos/ventas/servicios/VentaService.js';
import { FacturacionService } from './modulos/ventas/servicios/FacturacionService.js';
import { VentaController } from './modulos/ventas/presentacion/ventaController.js';
import { crearVentasRoutes } from './modulos/ventas/presentacion/ventasRoutes.js';

// Módulo: Apartados
import { ApartadoRepository } from './modulos/apartados/dominio/ApartadoRepository.js';
import { ApartadoService } from './modulos/apartados/servicios/ApartadoService.js';
import { ApartadoController } from './modulos/apartados/presentacion/apartadoController.js';
import { crearApartadosRoutes } from './modulos/apartados/presentacion/apartadosRoutes.js';

// Módulo: Reportes & Estadísticas
import { EstadisticasService } from './modulos/reportes/servicios/EstadisticasService.js';
import { ReporteController } from './modulos/reportes/presentacion/reporteController.js';
import { crearReportesRoutes } from './modulos/reportes/presentacion/reportesRoutes.js';

// 1. Inicializar esquema de Base de Datos SQLite
inicializarEsquema();

export const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// 2. Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    app: 'Gestienda Backend API Modular',
    database: 'SQLite (node:sqlite)',
    timestamp: new Date().toISOString()
  });
});

// 3. Inyección de Dependencias y Enrutamiento Modular (DDD)

// -- Módulo Usuarios & Auth (Cristian, Juliana, Juan Camilo, Henrry)
const usuarioRepository = new UsuarioRepository();
const authService = new AuthService(usuarioRepository);
const usuarioService = new UsuarioService(usuarioRepository);
const authController = new AuthController(authService);
const usuarioController = new UsuarioController(usuarioService);

app.use('/api/auth', crearAuthRoutes(authController));
app.use('/api/usuarios', crearUsuarioRoutes(usuarioController));

// -- Módulo Inventario
const productoRepository = new ProductoRepository();
const productoService = new ProductoService(productoRepository);
const stockService = new StockService(productoRepository);
const productoController = new ProductoController(productoService, stockService);

app.use('/api/inventario', crearInventarioRoutes(productoController));

// -- Módulo Ventas
const ventaRepository = new VentaRepository();
const impresoraAdapter = new ImpresoraTermicaAdapter();
const ventaService = new VentaService(ventaRepository, eventBus);
const facturacionService = new FacturacionService(ventaRepository, impresoraAdapter);
const ventaController = new VentaController(ventaService, facturacionService);

app.use('/api/ventas', crearVentasRoutes(ventaController));

// -- Módulo Apartados
const apartadoRepository = new ApartadoRepository();
const apartadoService = new ApartadoService(apartadoRepository, eventBus);
const apartadoController = new ApartadoController(apartadoService);

app.use('/api/apartados', crearApartadosRoutes(apartadoController));

// -- Módulo Reportes
const estadisticasService = new EstadisticasService(db);
const reporteController = new ReporteController(estadisticasService);

app.use('/api/reportes', crearReportesRoutes(reporteController));
