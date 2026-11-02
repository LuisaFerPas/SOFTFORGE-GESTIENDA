import { Router } from 'express';
import { verifyToken } from '../../usuarios/presentacion/authMiddleware.js';
import { SQLiteFacturaConsultaRepository } from '../infraestructura/persistencia/SQLiteFacturaConsultaRepository.js';

/** GET /api/ventas/facturas y GET /api/ventas/facturas/:consecutivo */
export function crearConsultaFacturasRoutes(db) {
  const router = Router();
  const repo = new SQLiteFacturaConsultaRepository(db);
  router.use(verifyToken);

  router.get('/', (req, res) => {
    try {
      const resultado = repo.listar({
        pagina: req.query.pagina === undefined ? 1 : Number(req.query.pagina),
        limite: 10,
        busqueda: req.query.q ?? '',
        estado: req.query.estado ?? ''
      });
      return res.status(200).json({ success: true, data: resultado.facturas, paginacion: resultado.paginacion });
    } catch (error) {
      if (/no son válidos|no son válidas/.test(error.message)) {
        return res.status(400).json({ success: false, message: error.message });
      }
      console.error('[Facturas] Error al listar:', error);
      return res.status(500).json({ success: false, message: 'No fue posible consultar las facturas.' });
    }
  });

  router.get('/:consecutivo', (req, res) => {
    try {
      const factura = repo.obtenerPorConsecutivo(req.params.consecutivo);
      if (!factura) return res.status(404).json({ success: false, message: 'No se encontró la factura solicitada.' });
      return res.status(200).json({ success: true, data: factura });
    } catch (error) {
      if (error.message.startsWith('El consecutivo')) {
        return res.status(400).json({ success: false, message: error.message });
      }
      console.error('[Facturas] Error al consultar detalle:', error);
      return res.status(500).json({ success: false, message: 'No fue posible consultar el detalle de la factura.' });
    }
  });
  return router;
}
