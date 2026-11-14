import React, { useState } from 'react';
import { 
  PlusCircle, 
  Clock, 
  Search
} from 'lucide-react';
import { ListaApartadosActivos } from './ListaApartadosActivos';
import { CrearApartadoModal } from './CrearApartadoModal'; // <-- NUEVO IMPORT

export function ApartadosPage() {
  const [tabActiva, setTabActiva] = useState('activos');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [refresh, setRefresh] = useState(0); // Para recargar la lista

  const handleApartadoCreado = () => {
    setRefresh(prev => prev + 1);
    setTabActiva('activos'); // HU-0701.5: Redirigir a pestaña Activos
  };

  return (
    <div className="apartados-container" style={{ padding: '8px 0' }}>
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

      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #E5E7EB', marginBottom: '20px' }}>
        <button
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '420px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#9CA3AF' }} />
              <input
                type="text"
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

      {/* HU-0701.4: Integramos el nuevo componente */}
      {tabActiva === 'nuevo' && (
        <CrearApartadoModal onCreado={handleApartadoCreado} />
      )}
    </div>
  );
}