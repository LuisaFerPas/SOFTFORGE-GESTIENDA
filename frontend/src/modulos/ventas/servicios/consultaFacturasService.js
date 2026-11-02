import { apiFetch } from '../../../compartido/servicios/apiCliente.js';

/** Consultas autenticadas del historial, independientes de la emisión. */
export function listarFacturas({ pagina = 1, q = '', estado = '' } = {}) {
  const parametros = new URLSearchParams({ pagina: String(pagina) });
  if (q.trim()) parametros.set('q', q.trim());
  if (estado) parametros.set('estado', estado);
  return apiFetch(`/ventas/facturas?${parametros.toString()}`);
}

export function consultarFactura(consecutivo) {
  return apiFetch(`/ventas/facturas/${encodeURIComponent(consecutivo)}`);
}
