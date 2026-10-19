/** SD-67: criterio único de estado para listado, pestaña y dashboard. */
export function obtenerEstadoStock(producto) {
  const stock = Number(producto?.stockActual);
  const minimo = Number(producto?.stockMinimoAlerta);
  if (!Number.isFinite(stock) || !Number.isFinite(minimo)) return 'DESCONOCIDO';
  if (stock <= 0) return 'AGOTADO';
  if (stock <= minimo) return 'BAJO';
  return 'NORMAL';
}
