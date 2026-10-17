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

  // Endpoints mutacionales para compañeros (Santiago / Juliana)
  router.post('/productos', requireRole(['ADMINISTRADOR']), (req, res) => {
    if (typeof productoController.registrar === 'function') {
      return productoController.registrar(req, res);
    }
    res.status(501).json({ message: 'Endpoint pendiente de implementación por Santiago' });
  });

  router.put('/productos/:id', requireRole(['ADMINISTRADOR']), (req, res) => {
    if (typeof productoController.editar === 'function') {
      return productoController.editar(req, res);
    }
    res.status(501).json({ message: 'Endpoint pendiente de implementación por Santiago' });
  });

  router.delete('/productos/:id', requireRole(['ADMINISTRADOR']), (req, res) => {
    if (typeof productoController.eliminar === 'function') {
      return productoController.eliminar(req, res);
    }
    res.status(501).json({ message: 'Endpoint pendiente de implementación por Santiago' });
  });

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