import React from 'react';
import { ShoppingCart, TrendingUp, AlertTriangle, FileText } from 'lucide-react';
import { useAuth } from '../../../compartido/contexto/AuthContext';
import { formatCOP } from '../../inventario/utilidades/formatoMoneda.js';

export function TarjetasKPI({
  ventasHoy = { total: 0, transacciones: 0 },
  gananciaEstimada = { total: 0, margenTexto: '' },
  apartadosActivos = { cantidad: 0, totalValor: 0 },
  cargando = false,
  alertas = [],
  alertasCargando = false,
  alertasError = ''
}) {
  const { isAdmin } = useAuth();

  return (
    <section className="kpi-grid" style={{ gridTemplateColumns: isAdmin ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)' }}>
      {/* KPI 1: Ventas Hoy */}
      <div className="kpi-card">
        <div className="kpi-icon-pill" style={{ backgroundColor: '#FFF2E8', color: '#FF6600' }}>
          <ShoppingCart size={22} />
        </div>
        <div className="kpi-value">{cargando ? '...' : formatCOP.format(ventasHoy.total || 0)}</div>
        <div className="kpi-label">Ventas hoy</div>
        <div style={{ fontSize: '0.78rem', color: '#9A7558', marginTop: '2px' }}>
          {cargando ? 'Consultando...' : `${ventasHoy.transacciones || 0} ${(ventasHoy.transacciones || 0) === 1 ? 'transacción' : 'transacciones'}`}
        </div>
      </div>

      {/* KPI 2: Ganancia Estimada (Exclusivo Administrador) */}
      {isAdmin && (
        <div className="kpi-card">
          <div className="kpi-icon-pill" style={{ backgroundColor: '#FFF9E6', color: '#D97706' }}>
            <TrendingUp size={22} />
          </div>
          <div className="kpi-value">{cargando ? '...' : formatCOP.format(gananciaEstimada.total || 0)}</div>
          <div className="kpi-label">Ganancia estimada</div>
          <div style={{ fontSize: '0.78rem', color: (gananciaEstimada.total || 0) > 0 ? '#059669' : '#6B7280', fontWeight: 600, marginTop: '2px' }}>
            {cargando ? 'Consultando...' : (gananciaEstimada.margenTexto || 'Sin ventas hoy')}
          </div>
        </div>
      )}

      {/* KPI 3: Stock Bajo (Exclusivo Administrador: Vendedor no puede ver cantidades de stock) */}
      {isAdmin && (
        <div className="kpi-card">
          <div className="kpi-icon-pill" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
            <AlertTriangle size={22} />
          </div>
          <div className="kpi-value" style={{ color: '#DC2626' }}>{alertasCargando ? 'Cargando...' : alertasError ? 'Sin datos' : `${alertas.length} productos`}</div>
          <div className="kpi-label">Stock bajo</div>
          <div style={{ fontSize: '0.78rem', color: '#DC2626', fontWeight: 700, marginTop: '2px' }}>
            {alertasError ? 'Error al consultar alertas' : 'Requieren reposición'}
          </div>
        </div>
      )}

      {/* KPI 4: Apartados Activos */}
      <div className="kpi-card">
        <div className="kpi-icon-pill" style={{ backgroundColor: '#F3E8FF', color: '#7E22CE' }}>
          <FileText size={22} />
        </div>
        <div className="kpi-value" style={{ color: '#7E22CE' }}>
          {cargando ? '...' : `${apartadosActivos.cantidad || 0} ${(apartadosActivos.cantidad || 0) === 1 ? 'pendiente' : 'pendientes'}`}
        </div>
        <div className="kpi-label">Apartados activos</div>
        <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: '2px' }}>
          {cargando ? 'Consultando...' : `Valor: ${formatCOP.format(apartadosActivos.totalValor || 0)}`}
        </div>
      </div>
    </section>
  );
}
