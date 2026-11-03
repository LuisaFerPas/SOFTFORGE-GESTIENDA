import React, { useState } from 'react';
import { 
  FileText, 
  PlusCircle, 
  Clock, 
  Search, 
  DollarSign, 
  Package, 
  User, 
  Phone,
  AlertCircle
} from 'lucide-react';

/**
 * Shell cascarón para la página de Apartados (HE-07).
 * HU-0700.5 — Don Mati Paleta: Naranja (#FF6600) y Crema (#FFFDF7).
 */
export function ApartadosPage() {
  const [tabActiva, setTabActiva] = useState('activos'); // 'activos' | 'nuevo'
  const [filtroBusqueda, setFiltroBusqueda] = useState('');

  return (
    <div className="apartados-container" style={{ padding: '8px 0' }}>
      {/* Encabezado Don Mati */}
      <div className="panel-header" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="header-title" style={{ fontSize: '1.6rem', color: '#1F2937' }}>
            Don Mati — Apartados
          </h1>
          <p style={{ color: '#6B7280', fontSize: '0.9rem', marginTop: '4px' }}>
            Control de separados con abonos parciales y reserva de mercancía · HE-07
          </p>
        </div>
      </div>

      {/* Selector de Pestañas */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid #E5E7EB',
        marginBottom: '20px'
      }}>
        <button
          onClick={() => setTabActiva('activos')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '0.95rem',
            fontWeight: 600,
            border: 'none',
            borderBottom: tabActiva === 'activos' ? '3px solid #FF6600' : '3px solid transparent',
            backgroundColor: tabActiva === 'activos' ? '#FFFDF7' : 'transparent',
            color: tabActiva === 'activos' ? '#FF6600' : '#4B5563',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            borderRadius: '6px 6px 0 0'
          }}
        >
          <Clock size={18} />
          <span>Apartados Activos</span>
        </button>

        <button
          onClick={() => setTabActiva('nuevo')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '0.95rem',
            fontWeight: 600,
            border: 'none',
            borderBottom: tabActiva === 'nuevo' ? '3px solid #FF6600' : '3px solid transparent',
            backgroundColor: tabActiva === 'nuevo' ? '#FFFDF7' : 'transparent',
            color: tabActiva === 'nuevo' ? '#FF6600' : '#4B5563',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            borderRadius: '6px 6px 0 0'
          }}
        >
          <PlusCircle size={18} />
          <span>Nuevo Apartado</span>
        </button>
      </div>

      {/* PESTAÑA 1: Apartados Activos */}
      {tabActiva === 'activos' && (
        <div>
          {/* Barra de Búsqueda y Filtro */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              position: 'relative',
              flex: 1,
              maxWidth: '420px'
            }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#9CA3AF' }} />
              <input
                type="text"
                placeholder="Buscar por cliente o código AP-XXXX..."
                value={filtroBusqueda}
                onChange={(e) => setFiltroBusqueda(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 38px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.9rem',
                  outline: 'none',
                  backgroundColor: '#FFFDF7'
                }}
              />
            </div>
          </div>

          {/* Tarjeta Placeholder de Apartados Activos */}
          <div style={{
            backgroundColor: '#FFFDF7',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid #F3F4F6'
            }}>
              <div>
                <span style={{
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  marginRight: '8px'
                }}>
                  ACTIVO
                </span>
                <span style={{ fontWeight: 700, color: '#1F2937' }}>AP-0001 (Ejemplo)</span>
              </div>
              <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>Fecha: Hoy</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>Cliente</div>
                <div style={{ fontWeight: 600, color: '#1F2937' }}>Consumidor Ejemplo</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>Total Apartado</div>
                <div style={{ fontWeight: 600, color: '#1F2937' }}>$50.000</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>Abonos Realizados</div>
                <div style={{ fontWeight: 600, color: '#059669' }}>$20.000</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>Saldo Pendiente</div>
                <div style={{ fontWeight: 700, color: '#DC2626', fontSize: '1.05rem' }}>$30.000</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid #F3F4F6' }}>
              <button 
                style={{
                  padding: '8px 14px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid #EF4444',
                  backgroundColor: '#FFFFFF',
                  color: '#EF4444',
                  cursor: 'pointer'
                }}
                onClick={() => alert('Stub de cancelación: Santiago completará HU-0703')}
              >
                Cancelar apartado
              </button>
              <button 
                style={{
                  padding: '8px 14px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#FF6600',
                  color: '#FFFFFF',
                  cursor: 'pointer'
                }}
                onClick={() => alert('Stub de abono: Javier completará HU-0702')}
              >
                Registrar abono
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: Nuevo Apartado (Stub preparado para Juliana HU-0701) */}
      {tabActiva === 'nuevo' && (
        <div style={{
          backgroundColor: '#FFFDF7',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          maxWidth: '720px'
        }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1F2937', marginBottom: '16px' }}>
            Registrar Nuevo Apartado
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Nombre del Cliente *
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#9CA3AF' }} />
                <input
                  type="text"
                  placeholder="Ej: Laura Martínez"
                  style={{
                    width: '100%',
                    padding: '8px 10px 8px 34px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                  readOnly
                  value="Consumidor Final"
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Teléfono de Contacto
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#9CA3AF' }} />
                <input
                  type="text"
                  placeholder="Ej: 3101234567"
                  style={{
                    width: '100%',
                    padding: '8px 10px 8px 34px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                  readOnly
                />
              </div>
            </div>
          </div>

          <div style={{
            border: '1px dashed #D1D5DB',
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center',
            backgroundColor: '#FAF5FF',
            marginBottom: '16px'
          }}>
            <Package size={32} style={{ color: '#9333EA', margin: '0 auto 8px auto' }} />
            <p style={{ fontSize: '0.9rem', color: '#4B5563', margin: 0 }}>
              Aquí se integrará el selector de productos con lector de barras y buscador por nombre (HU-0701).
            </p>
          </div>

          <div style={{
            backgroundColor: '#F9FAFB',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: '#4B5563' }}>
              <span>Total estimado:</span>
              <span style={{ fontWeight: 600, color: '#1F2937' }}>$0</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: '#4B5563' }}>
              <span>Abono inicial requerido:</span>
              <span style={{ fontWeight: 600, color: '#059669' }}>$0</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700, color: '#1F2937', borderTop: '1px solid #E5E7EB', paddingTop: '8px' }}>
              <span>Saldo a financiar:</span>
              <span style={{ color: '#FF6600' }}>$0</span>
            </div>
          </div>

          <button
            style={{
              width: '100%',
              padding: '11px',
              backgroundColor: '#FF6600',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer'
            }}
            onClick={() => alert('Creación de apartado: Juliana conectará HU-0701')}
          >
            Guardar Apartado
          </button>
        </div>
      )}
    </div>
  );
}
