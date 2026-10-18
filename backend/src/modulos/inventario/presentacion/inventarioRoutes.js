import { Router } from 'express';
import { verifyToken, requireRole } from '../../usuarios/presentacion/authMiddleware.js';

// IMPORTANTE: Cambiamos la firma para recibir también el stockController
export function crearInventarioRoutes(productoController, stockController) {
  const router = Router();

  // Todas las rutas de inventario requieren token activo
  router.use(verifyToken);

  // Listar productos (con filtro de stock por rol HU-0607)
  router.get('/productos', (req, res) => productoController.listar(req, res));

  // Buscar producto por código de barras o código interno
  router.get('/productos/codigo/:codigo', (req, res) => productoController.obtenerPorCodigo(req, res));

  // Consultar producto por ID
  router.get('/productos/:id', (req, res) => productoController.obtenerPorId(req, res));

  // HU-0607: Consultar stock actual (Exclusivo Administrador)
  router.get('/productos/:id/stock', requireRole(['ADMINISTRADOR']), (req, res) =>
    productoController.consultarStock(req, res)
  );

  // HU-0604: Consultar alertas de stock bajo y agotados (Exclusivo Administrador)
  router.get('/alertas', requireRole(['ADMINISTRADOR']), (req, res) =>
    productoController.obtenerAlertas(req, res)
  );

  // HU-0501: Registrar nuevo producto (Exclusivo Administrador)
  router.post('/productos', requireRole(['ADMINISTRADOR']), (req, res) =>
    productoController.registrar(req, res)
  );

  // HU-0502: Modificar producto (Exclusivo Administrador)
  router.put('/productos/:id', requireRole(['ADMINISTRADOR']), (req, res) =>
    productoController.editar(req, res)
  );

  // HU-0503: Dar de baja producto (Exclusivo Administrador)
  router.delete('/productos/:id', requireRole(['ADMINISTRADOR']), (req, res) =>
    productoController.eliminar(req, res)
  );

  // HU-0601: Registrar entrada de stock (Exclusivo Admin)
  router.post('/stock/entrada', requireRole(['ADMINISTRADOR']), (req, res) => 
    stockController.registrarEntrada(req, res)
  );

  // HU-0603: Ver historial de entradas (Exclusivo Admin)
  router.get('/stock/entradas', requireRole(['ADMINISTRADOR']), (req, res) => 
    stockController.listarEntradas(req, res)
  );

  return router;
}