import { apiFetch } from '../../../compartido/servicios/apiCliente.js';

/**
 * Servicio API para Estadísticas y Reportes (HE-08 / HE-09).
 * HU-0700.8 — Centralización de llamadas HTTP para métricas, reportes y caja.
 */

/**
 * Consulta el reporte de ventas agrupado por período (Día, Semana, Mes o Año).
 * HU-0901 (Santiago)
 * @param {'DIA'|'SEMANA'|'MES'|'AÑO'} periodo
 */
export async function consultarVentasPorPeriodo(periodo = 'MES') {
  return apiFetch(`/estadisticas/ventas?periodo=${encodeURIComponent(periodo)}`);
}

/**
 * Consulta el desempeño de productos (más vendidos, por categoría y alertas de reposición).
 * HU-0902 (Juliana)
 */
export async function consultarDesempenioProductos() {
  return apiFetch('/estadisticas/productos');
}

/**
 * Consulta ingresos, costos y utilidad neta con desglose por categoría.
 * HU-0903 (Camilo)
 * @param {'DIA'|'SEMANA'|'MES'|'AÑO'} periodo
 */
export async function consultarResumenFinanciero(periodo = 'MES') {
  return apiFetch(`/estadisticas/financiero?periodo=${encodeURIComponent(periodo)}`);
}

/**
 * Consulta el listado de todos los pagos registrados durante el día actual.
 * HU-0801
 * @returns {Promise<{ success: boolean, data: Array<{ id: number, hora: string, fechaHora: string, monto: number, medioPago: string, tipo: string, referenciaId: number }> }>}
 */
export async function consultarPagosDelDia() {
  return apiFetch('/pagos/dia');
}

/**
 * Consulta los totales del día agrupados por medio de pago (Efectivo, Nequi, etc.).
 * HU-0802 (Javier)
 */
export async function consultarTotalesPorMedio() {
  return apiFetch('/pagos/dia/totales');
}
