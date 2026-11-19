import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { formatCOP } from '../../inventario/utilidades/formatoMoneda.js';

export function PanelVentasRecientes({ ventas = [], cargando = false, error = '' }) {
  return (
    <div className="panel-card">
      <div className="panel-header">
        <div className="panel-title">
          <ShoppingBag size={18} color="#FF6600" style={{ marginRight: '6px' }} />
          <span>Ventas recientes</span>
        </div>
        <Link to="/ventas/facturas" className="panel-link">Ver todas →</Link>
      </div>

      <div className="panel-list">
        {cargando ? (
          <p style={{ padding: '16px', color: '#6B7280', fontSize: '0.88rem' }}>Consultando ventas...</p>
        ) : error ? (
          <p role="alert" style={{ padding: '16px', color: '#DC2626', fontSize: '0.88rem' }}>No se pudieron cargar las ventas recientes.</p>
        ) : ventas.length === 0 ? (
          <p style={{ padding: '16px', color: '#6B7280', fontSize: '0.88rem' }}>No hay ventas registradas recientemente.</p>
        ) : (
          ventas.map((venta) => (
            <div className="list-item dm-home-list-item dm-home-list-item--sale" key={venta.id}>
              <div className="dm-home-sale-main">
                <span className="sale-time">{venta.hora || '--:--'}</span>
                <div>
                  <div className="item-name" title={venta.itemsResumen}>{venta.itemsResumen}</div>
                  <div className="item-sub">por {venta.vendedor}</div>
                </div>
              </div>
              <div className="sale-price">{formatCOP.format(venta.total)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
