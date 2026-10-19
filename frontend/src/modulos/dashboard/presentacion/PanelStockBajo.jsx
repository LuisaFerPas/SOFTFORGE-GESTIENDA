import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BadgeEstadoStock } from '../../inventario/presentacion/BadgeEstadoStock';

export function PanelStockBajo({ alertas = [], cargando = false, error = '' }) {
  return <div className="panel-card">
    <div className="panel-header">
      <div className="panel-title"><AlertTriangle size={18} color="#EA580C"/><span>Stock bajo y agotados</span></div>
      <Link className="panel-link" to="/inventario?tab=alertas">Ver todos →</Link>
    </div>
    <div className="panel-list">
      {cargando ? <p>Consultando inventario...</p> : error ? <p role="alert">No se pudieron cargar las alertas.</p> :
      alertas.length === 0 ? <p>No hay alertas pendientes.</p> :
      alertas.slice(0, 5).map(p => <div className="list-item" key={p.id}>
        <div><div className="item-name">{p.nombre}</div><div className="item-sub">{p.codigoInterno}</div></div>
        <div style={{textAlign:'right'}}><BadgeEstadoStock producto={p} />
          <div className="stock-min-label">Stock: {p.stockActual} · Mín: {p.stockMinimoAlerta}</div>
        </div>
      </div>)}
    </div>
  </div>;
}
