import React, { useState } from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Calendar, 
  PieChart, 
  Wallet, 
  AlertTriangle 
} from 'lucide-react';
import { useAuth } from '../../../compartido/contexto/AuthContext';
import { ResumenCaja } from './componentes/ResumenCaja';

/**
 * Shell cascarón para la página de Estadísticas y Reportes (HE-08 / HE-09).
 * HU-0700.7 — Exclusiva para ADMINISTRADOR. Paleta Don Mati: Naranja (#FF6600) y Crema (#FFFDF7).
 */
export function EstadisticasPage() {
  const { isAdmin } = useAuth();
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('MES'); // 'DIA' | 'SEMANA' | 'MES' | 'AÑO'
  const [seccionActiva, setSeccionActiva] = useState('ventas'); // 'ventas' | 'productos' | 'financiero' | 'graficas' | 'caja'

  // Control de acceso RBAC
  if (!isAdmin) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        backgroundColor: '#FEF2F2',
        borderRadius: '12px',
        border: '1px solid #FCA5A5',
        margin: '20px'
      }}>
        <AlertTriangle size={48} style={{ color: '#DC2626', margin: '0 auto 12px auto' }} />
        <h2 style={{ color: '#991B1B', fontWeight: 700 }}>Acceso Restringido</h2>
        <p style={{ color: '#7F1D1D', fontSize: '0.95rem' }}>
          El módulo de estadísticas y reportes financieros es exclusivo para usuarios con perfil Administrador.
        </p>
      </div>
    );
  }

  const periodos = [
    { id: 'DIA', label: 'Hoy (Día)' },
    { id: 'SEMANA', label: 'Esta Semana' },
    { id: 'MES', label: 'Este Mes' },
    { id: 'AÑO', label: 'Este Año' }
  ];

  return (
    <div style={{ padding: '8px 0' }}>
      {/* Encabezado Don Mati */}
      <div className="panel-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="header-title" style={{ fontSize: '1.6rem', color: '#1F2937' }}>
            Don Mati — Estadísticas y Reportes
          </h1>
          <p style={{ color: '#6B7280', fontSize: '0.9rem', marginTop: '4px' }}>
            Métricas de ventas, rendimiento de catálogo, balance financiero y caja · HE-08 / HE-09
          </p>
        </div>

        {/* Selector de Período Global */}
        <div style={{
          display: 'flex',
          backgroundColor: '#F3F4F6',
          borderRadius: '8px',
          padding: '4px',
          gap: '4px'
        }}>
          {periodos.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriodoSeleccionado(p.id)}
              style={{
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: periodoSeleccionado === p.id ? '#FF6600' : 'transparent',
                color: periodoSeleccionado === p.id ? '#FFFFFF' : '#4B5563',
                transition: 'all 0.2s ease'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Menú de Subsecciones */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid #E5E7EB',
        marginBottom: '20px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'ventas', label: 'Ventas (HU-0901)', icon: TrendingUp },
          { id: 'productos', label: 'Productos (HU-0902)', icon: ShoppingBag },
          { id: 'financiero', label: 'Financiero (HU-0903)', icon: DollarSign },
          { id: 'graficas', label: 'Gráficas (HU-0904)', icon: BarChart2 },
          { id: 'caja', label: 'Cierre de Caja (HE-08)', icon: Wallet }
        ].map(item => {
          const IconComponent = item.icon;
          const activa = seccionActiva === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setSeccionActiva(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                fontSize: '0.9rem',
                fontWeight: 600,
                border: 'none',
                borderBottom: activa ? '3px solid #FF6600' : '3px solid transparent',
                backgroundColor: activa ? '#FFFDF7' : 'transparent',
                color: activa ? '#FF6600' : '#4B5563',
                cursor: 'pointer',
                borderRadius: '6px 6px 0 0',
                whiteSpace: 'nowrap'
              }}
            >
              <IconComponent size={17} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECCIÓN 1: Ventas por Período (Santiago HU-0901) */}
      {seccionActiva === 'ventas' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div style={{ backgroundColor: '#FFFDF7', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '0.85rem', color: '#6B7280', marginBottom: '4px' }}>Total Ventas ({periodoSeleccionado})</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1F2937' }}>$0</div>
              <div style={{ fontSize: '0.8rem', color: '#059669', marginTop: '4px' }}>Stub conectado a HU-0901</div>
            </div>

            <div style={{ backgroundColor: '#FFFDF7', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '0.85rem', color: '#6B7280', marginBottom: '4px' }}>Transacciones</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1F2937' }}>0</div>
              <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '4px' }}>Ventas confirmadas</div>
            </div>

            <div style={{ backgroundColor: '#FFFDF7', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '0.85rem', color: '#6B7280', marginBottom: '4px' }}>Ticket Promedio</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FF6600' }}>$0</div>
              <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '4px' }}>Promedio por compra</div>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN 2: Productos y Categorías (Juliana HU-0902) */}
      {seccionActiva === 'productos' && (
        <div style={{ backgroundColor: '#FFFDF7', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Rendimiento de Catálogo (HU-0902)</h3>
          <p style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '16px' }}>
            Aquí se desplegarán las tablas TOP 10 productos más vendidos, rotación y alertas de reposición.
          </p>
          <div style={{ padding: '20px', border: '1px dashed #D1D5DB', borderRadius: '8px', textAlign: 'center', color: '#9CA3AF' }}>
            Contenedor preparado para Juliana
          </div>
        </div>
      )}

      {/* SECCIÓN 3: Financiero (Camilo HU-0903) */}
      {seccionActiva === 'financiero' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div style={{ backgroundColor: '#FFFDF7', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px' }}>
              <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>Ingresos Brutos</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>$0</div>
            </div>

            <div style={{ backgroundColor: '#FFFDF7', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px' }}>
              <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>Costos de Mercancía</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>$0</div>
            </div>

            <div style={{ backgroundColor: '#FFFDF7', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px' }}>
              <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>Utilidad Estimada</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FF6600', marginTop: '4px' }}>$0</div>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN 4: Gráficas (Camilo HU-0904) */}
      {seccionActiva === 'graficas' && (
        <div style={{ backgroundColor: '#FFFDF7', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '36px', textAlign: 'center' }}>
          <PieChart size={48} style={{ color: '#FF6600', margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1F2937' }}>Visualización de Gráficas Estadísticas</h3>
          <p style={{ color: '#6B7280', fontSize: '0.9rem', maxWidth: '480px', margin: '6px auto 0 auto' }}>
            Camilo integrará aquí la librería Recharts para renderizar curvas de ventas y gráficos de torta por categoría.
          </p>
        </div>
      )}

      {/* SECCIÓN 5: Cierre de Caja / Pagos del Día (Santiago HU-0801 / Javier HU-0802) */}
      {seccionActiva === 'caja' && (
        <div style={{ backgroundColor: '#FFFDF7', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Resumen de Caja Diaria (HE-08)</h3>
          <ResumenCaja />
        </div>
      )}
    </div>
  );
}
export default EstadisticasPage;
