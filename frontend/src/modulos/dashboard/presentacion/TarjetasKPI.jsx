import React from 'react';
import { ShoppingCart, TrendingUp, AlertTriangle, FileText } from 'lucide-react';

export function TarjetasKPI() {
  return (
    <section className="kpi-grid">
      {/* KPI 1: Ventas Hoy */}
      <div className="kpi-card">
        <div className="kpi-icon-pill" style={{ backgroundColor: '#FFF2E8', color: '#FF6600' }}>
          <ShoppingCart size={22} />
        </div>
        <div className="kpi-value">$487.500</div>
        <div className="kpi-label">Ventas hoy</div>
        <div style={{ fontSize: '0.78rem', color: '#9A7558', marginTop: '2px' }}>
          23 transacciones
        </div>
      </div>

      {/* KPI 2: Ganancia Estimada */}
      <div className="kpi-card">
        <div className="kpi-icon-pill" style={{ backgroundColor: '#FFF9E6', color: '#D97706' }}>
          <TrendingUp size={22} />
        </div>
        <div className="kpi-value">$142.200</div>
        <div className="kpi-label">Ganancia estimada</div>
        <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
          ↑ 12% vs ayer
        </div>
      </div>

      {/* KPI 3: Stock Bajo */}
      <div className="kpi-card">
        <div className="kpi-icon-pill" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
          <AlertTriangle size={22} />
        </div>
        <div className="kpi-value" style={{ color: '#DC2626' }}>7 productos</div>
        <div className="kpi-label">Stock bajo</div>
        <div style={{ fontSize: '0.78rem', color: '#DC2626', fontWeight: 700, marginTop: '2px' }}>
          Requieren reposición
        </div>
      </div>

      {/* KPI 4: Apartados Activos */}
      <div className="kpi-card">
        <div className="kpi-icon-pill" style={{ backgroundColor: '#F3E8FF', color: '#7E22CE' }}>
          <FileText size={22} />
        </div>
        <div className="kpi-value" style={{ color: '#7E22CE' }}>4 pendientes</div>
        <div className="kpi-label">Apartados activos</div>
        <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: '2px' }}>
          Valor: $236.000
        </div>
      </div>
    </section>
  );
}
