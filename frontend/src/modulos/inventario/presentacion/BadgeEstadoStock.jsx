import { obtenerEstadoStock } from '../utilidades/estadoStock';

const ESTILOS = {
  AGOTADO: { color: '#991B1B', background: '#FEE2E2', etiqueta: 'Agotado' },
  BAJO: { color: '#92400E', background: '#FEF3C7', etiqueta: 'Stock bajo' },
  NORMAL: { color: '#166534', background: '#DCFCE7', etiqueta: 'Normal' },
  DESCONOCIDO: { color: '#475569', background: '#E2E8F0', etiqueta: 'No disponible' }
};
export function BadgeEstadoStock({ producto }) {
  const estado = obtenerEstadoStock(producto);
  const { etiqueta, ...estilos } = ESTILOS[estado];
  return <span className="estado-stock-badge" style={estilos} aria-label={`Estado de stock: ${etiqueta}`}>{etiqueta}</span>;
}
