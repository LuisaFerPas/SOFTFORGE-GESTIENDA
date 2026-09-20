import React from 'react';
import { AlertTriangle } from 'lucide-react';

export function PanelStockBajo() {
  return (
    <div className="panel-card">
      <div className="panel-header">
        <div className="panel-title">
          <AlertTriangle size={18} color="#EA580C" />
          <span>Stock bajo</span>
        </div>
        <a href="/inventario" className="panel-link">Ver todos →</a>
      </div>

      <div className="panel-list">
        <div className="list-item">
          <div>
            <div className="item-name">Crema facial Pond's 200g</div>
            <div className="item-sub">COS-0041</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="badge-stock">2 und.</span>
            <div className="stock-min-label">Mín: 5</div>
          </div>
        </div>

        <div className="list-item">
          <div>
            <div className="item-name">Muñeca bailarina rosada</div>
            <div className="item-sub">JUG-0118</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="badge-stock">1 und.</span>
            <div className="stock-min-label">Mín: 3</div>
          </div>
        </div>

        <div className="list-item">
          <div>
            <div className="item-name">Bolsas piñata colores x10</div>
            <div className="item-sub">PIÑ-0023</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="badge-stock">3 und.</span>
            <div className="stock-min-label">Mín: 8</div>
          </div>
        </div>

        <div className="list-item">
          <div>
            <div className="item-name">Jabón Rey limón x3</div>
            <div className="item-sub">ASE-0076</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="badge-agotado">Agotado</span>
            <div className="stock-min-label">Mín: 6</div>
          </div>
        </div>
      </div>
    </div>
  );
}
