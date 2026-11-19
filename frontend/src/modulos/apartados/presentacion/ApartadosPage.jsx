import React, { useState } from 'react';
import { 
  PlusCircle, 
  Clock, 
  Search
} from 'lucide-react';
import { ListaApartadosActivos } from './ListaApartadosActivos';
import { CrearApartadoModal } from './CrearApartadoModal';
import './apartadosResponsive.css';

export function ApartadosPage() {
  const [tabActiva, setTabActiva] = useState('activos');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [refresh, setRefresh] = useState(0); // Para recargar la lista

  const handleApartadoCreado = () => {
    setRefresh(prev => prev + 1);
    setTabActiva('activos'); // Redirigir a pestaña Activos
  };

  return (
    <div className="apartados-container apartados-page">
      <div className="panel-header apartados-page-header">
        <div>
          <h1 className="header-title">
            Don Mati — Apartados
          </h1>
          <p style={{ color: '#6B7280', fontSize: '0.9rem', marginTop: '4px' }}>
            Control de separados con abonos parciales y reserva de mercancía
          </p>
        </div>
      </div>

      <div className="apartados-tabs" role="tablist" aria-label="Secciones de apartados">
        <button
          type="button"
          role="tab"
          aria-selected={tabActiva === 'activos'}
          onClick={() => setTabActiva('activos')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '0.95rem', fontWeight: 600,
            border: 'none', borderBottom: tabActiva === 'activos' ? '3px solid #FF6600' : '3px solid transparent',
            backgroundColor: tabActiva === 'activos' ? '#FFFDF7' : 'transparent', color: tabActiva === 'activos' ? '#FF6600' : '#4B5563',
            cursor: 'pointer', transition: 'all 0.2s ease', borderRadius: '6px 6px 0 0'
          }}
        >
          <Clock size={18} />
          <span>Apartados Activos</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={tabActiva === 'nuevo'}
          onClick={() => setTabActiva('nuevo')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '0.95rem', fontWeight: 600,
            border: 'none', borderBottom: tabActiva === 'nuevo' ? '3px solid #FF6600' : '3px solid transparent',
            backgroundColor: tabActiva === 'nuevo' ? '#FFFDF7' : 'transparent', color: tabActiva === 'nuevo' ? '#FF6600' : '#4B5563',
            cursor: 'pointer', transition: 'all 0.2s ease', borderRadius: '6px 6px 0 0'
          }}
        >
          <PlusCircle size={18} />
          <span>Nuevo Apartado</span>
        </button>
      </div>

      {tabActiva === 'activos' && (
        <div>
          <div className="apartados-search-row">
            <div className="apartados-search-field">
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#9CA3AF' }} />
              <input
                type="search"
                aria-label="Buscar apartado por cliente o código"
                placeholder="Buscar por cliente o código AP-XXXX..."
                value={filtroBusqueda}
                onChange={(e) => setFiltroBusqueda(e.target.value)}
                style={{ width: '100%', padding: '9px 12px 9px 38px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', outline: 'none', backgroundColor: '#FFFDF7' }}
              />
            </div>
          </div>

          {/* Le pasamos la key para forzar el re-render al crear un apartado */}
          <ListaApartadosActivos key={refresh} filtro={filtroBusqueda} />
        </div>
      )}

      {/* Componente para creación de apartados */}
      {tabActiva === 'nuevo' && (
        <CrearApartadoModal onCreado={handleApartadoCreado} />
      )}
    </div>
  );
}