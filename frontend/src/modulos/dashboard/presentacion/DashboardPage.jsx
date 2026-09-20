import React from 'react';
import { Plus, Package, BarChart2 } from 'lucide-react';
import { useAuth } from '../../../compartido/contexto/AuthContext';
import { useNavigate } from 'react-router-dom';
import { TarjetasKPI } from './TarjetasKPI';
import { PanelStockBajo } from './PanelStockBajo';
import { PanelVentasRecientes } from './PanelVentasRecientes';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const today = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = today.toLocaleDateString('es-CO', options);
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return (
    <div>
      {/* Header de Bienvenida */}
      <header className="dashboard-header">
        <h1 className="header-title">
          ¡Buen día, {user?.username || 'Administrador'}!
        </h1>
        <p className="header-subtitle">
          {capitalizedDate} · Resumen del día
        </p>
      </header>

      {/* Botones de Acción Rápida */}
      <div className="action-buttons-bar">
        <button className="btn-primary" onClick={() => navigate('/ventas')}>
          <Plus size={18} />
          <span>Nueva venta</span>
        </button>

        <button className="btn-outline" onClick={() => navigate('/inventario')}>
          <Package size={18} />
          <span>Agregar producto</span>
        </button>

        <button className="btn-outline" onClick={() => navigate('/estadisticas')}>
          <BarChart2 size={18} />
          <span>Ver reportes</span>
        </button>
      </div>

      {/* Grid de 4 Tarjetas KPI */}
      <TarjetasKPI />

      {/* Paneles Inferiores: Stock bajo y Ventas recientes */}
      <section className="bottom-grid">
        <PanelStockBajo />
        <PanelVentasRecientes />
      </section>
    </div>
  );
}
