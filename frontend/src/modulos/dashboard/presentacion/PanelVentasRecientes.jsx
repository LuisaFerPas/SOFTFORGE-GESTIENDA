import React from 'react';

export function PanelVentasRecientes() {
  return (
    <div className="panel-card">
      <div className="panel-header">
        <div className="panel-title">
          <span>Ventas recientes</span>
        </div>
        <a href="/ventas" className="panel-link">Ver todas →</a>
      </div>

      <div className="panel-list">
        <div className="list-item">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="sale-time">10:42</span>
            <div>
              <div className="item-name">Shampoo Sedal rizos x2</div>
              <div className="item-sub">por María</div>
            </div>
          </div>
          <div className="sale-price">$18.600</div>
        </div>

        <div className="list-item">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="sale-time">10:28</span>
            <div>
              <div className="item-name">Juguete carros pista loop</div>
              <div className="item-sub">por María</div>
            </div>
          </div>
          <div className="sale-price">$45.000</div>
        </div>

        <div className="list-item">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="sale-time">09:55</span>
            <div>
              <div className="item-name">Maquillaje sombras x12</div>
              <div className="item-sub">por Admin</div>
            </div>
          </div>
          <div className="sale-price">$32.000</div>
        </div>

        <div className="list-item">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="sale-time">09:31</span>
            <div>
              <div className="item-name">Velas piñata x20 unid.</div>
              <div className="item-sub">por María</div>
            </div>
          </div>
          <div className="sale-price">$12.000</div>
        </div>

        <div className="list-item">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="sale-time">09:10</span>
            <div>
              <div className="item-name">Crema Pond's + Colgate</div>
              <div className="item-sub">por Admin</div>
            </div>
          </div>
          <div className="sale-price">$38.500</div>
        </div>
      </div>
    </div>
  );
}
