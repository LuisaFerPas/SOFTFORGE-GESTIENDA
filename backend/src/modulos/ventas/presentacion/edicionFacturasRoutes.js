import { Router } from 'express';
import { verifyToken, requireRole } from '../../usuarios/presentacion/authMiddleware.js';
import {
  SQLiteEdicionFacturaRepository,
  asegurarEsquemaEdicion
} from '../infraestructura/persistencia/SQLiteEdicionFacturaRepository.js';
import {
  SQLiteAnulacionVentaRepository,
  asegurarEsquemaAnulacion
} from '../infraestructura/persistencia/SQLiteAnulacionVentaRepository.js';
import { EdicionFacturaService } from '../servicios/EdicionFacturaService.js';
import { ReutilizacionVentaService } from '../servicios/ReutilizacionVentaService.js';

function codigoHttp(mensaje) {
  if (!mensaje) return 500;
  if (mensaje === 'Permisos insuficientes') return 403;
  if (mensaje.startsWith('No se encontró una factura')) return 404;
  if (mensaje.startsWith('El consecutivo') ||
      mensaje.startsWith('El nombre del cliente')) return 400;
  if (mensaje.startsWith('Solo se pueden') ||
      mensaje.startsWith('La venta') ||
      mensaje.startsWith('No se puede reutilizar') ||
      mensaje.startsWith('No se pudo') ||
      mensaje.startsWith('Stock inválido')) return 409;
  return 500;
}

function responderError(res, error, contexto) {
  const mensaje = typeof error === 'string' ? error : error?.message;
  const status = codigoHttp(mensaje);
  if (status === 500) {
    console.error(`[Facturas] ${contexto}:`, error);
    return res.status(500).json({
      success: false,
      message: 'No fue posible completar la operación.'
    });
  }
  return res.status(status).json({ success: false, message: mensaje });
}

export function crearEdicionFacturasRoutes(db) {
  asegurarEsquemaEdicion(db);
  asegurarEsquemaAnulacion(db);

  const edicionService = new EdicionFacturaService(
    new SQLiteEdicionFacturaRepository(db)
  );
  const reutilizacionService = new ReutilizacionVentaService(
    new SQLiteAnulacionVentaRepository(db)
  );

  const router = Router();
  router.use(verifyToken, requireRole(['ADMINISTRADOR']));

  router.put('/:consecutivo', async (req, res) => {
    const resultado = await edicionService.editarFactura(
      req.params.consecutivo, req.body, req.user
    );
    if (resultado.isFailure) {
      return responderError(res, resultado.error, 'Error al editar factura');
    }
    return res.status(200).json({ success: true, data: resultado.getValue() });
  });

  router.post('/:consecutivo/reutilizar', async (req, res) => {
    const resultado = await reutilizacionService.anularYCargarCarrito(
      req.params.consecutivo, req.user
    );
    if (resultado.isFailure) {
      return responderError(res, resultado.error, 'Error al reutilizar venta');
    }
    return res.status(200).json({ success: true, data: resultado.getValue() });
  });

  return router;
}
