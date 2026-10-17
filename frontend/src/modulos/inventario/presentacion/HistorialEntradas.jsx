import React, { useState, useEffect } from 'react';
import { obtenerHistorialEntradasApi } from '../servicios/inventarioService.js';
import { CalendarDays, Inbox } from 'lucide-react';

export function HistorialEntradas() {
  const [entradas, setEntradas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('todos'); // 'todos' | 'hoy' | 'semana' | 'mes'

  useEffect(() => {
    cargarHistorial(filtroFecha);
  }, [filtroFecha]);

  const calcularFechas = (filtro) => {
    const ahora = new Date();
    let inicio = null;
    let fin = null;

    if (filtro === 'hoy') {
      inicio = new Date(ahora.setHours(0, 0, 0, 0)).toISOString();
      fin = new Date(ahora.setHours(23, 59, 59, 999)).toISOString();
    } else if (filtro === 'semana') {
      const diaSemana = ahora.getDay(); // 0 es domingo
      const diff = ahora.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1); // Lunes como inicio
      inicio = new Date(ahora.setDate(diff)).setHours(0, 0, 0, 0);
      fin = new Date().toISOString(); // Hasta ahora
    } else if (filtro === 'mes') {
      inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();
      fin = new Date().toISOString();
    }

    return {
      fechaInicio: inicio ? new Date(inicio).toISOString() : undefined,
      fechaFin: fin ? new Date(fin).toISOString() : undefined
    };
  };

  const cargarHistorial = async (filtro) => {
    setCargando(true);
    setError('');
    try {
      const fechas = calcularFechas(filtro);
      const data = await obtenerHistorialEntradasApi({ limite: 100, ...fechas });
      setEntradas(data);
    } catch (err) {
      setError('Error al cargar el historial de entradas.');
    } finally {
      setCargando(false);
    }
  };

  const formatearFecha = (isoString) => {
    if (!isoString) return 'N/A';
    const fecha = new Date(isoString);
    return fecha.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }); 
  };

  const styles = {
    container: { padding: '24px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' },
    title: { color: '#5C2C0A', margin: 0, fontSize: '1.3rem', fontWeight: 800 },
    filtrosContainer: { display: 'flex', gap: '8px', backgroundColor: '#FFFDF7', padding: '4px', borderRadius: '10px', border: '1px solid #F4E8DC' },
    filtroBtn: (activo) => ({
      padding: '8px 16px',
      border: 'none',
      borderRadius: '8px',
      backgroundColor: activo ? '#FF6600' : 'transparent',
      color: activo ? 'white' : '#877468',
      fontWeight: activo ? 'bold' : 'normal',
      cursor: 'pointer',
      transition: 'all 0.2s',
      fontSize: '0.85rem'
    }),
    tableContainer: { backgroundColor: 'white', borderRadius: '8px', padding: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
    th: { padding: '12px 10px', borderBottom: '2px solid #FDE047', color: '#5C2C0A', fontSize: '0.9rem' },
    td: { padding: '12px 10px', borderBottom: '1px solid #f0f0f0', fontSize: '0.9rem', color: '#2B1810' },
    emptyState: { textAlign: 'center', padding: '40px', color: '#877468' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Historial de Reabastecimientos</h2>
        
        {/* Filtros de Fecha (HU-0603.4) */}
        <div style={styles.filtrosContainer}>
          <button onClick={() => setFiltroFecha('todos')} style={styles.filtroBtn(filtroFecha === 'todos')}>
            Todos
          </button>
          <button onClick={() => setFiltroFecha('hoy')} style={styles.filtroBtn(filtroFecha === 'hoy')}>
            Hoy
          </button>
          <button onClick={() => setFiltroFecha('semana')} style={styles.filtroBtn(filtroFecha === 'semana')}>
            Esta Semana
          </button>
          <button onClick={() => setFiltroFecha('mes')} style={styles.filtroBtn(filtroFecha === 'mes')}>
            Este Mes
          </button>
        </div>
      </div>

      {error && <p style={{ color: '#DC2626' }}>{error}</p>}

      {cargando ? (
        <p style={{ color: '#877468' }}>Cargando historial...</p>
      ) : entradas.length === 0 ? (
        <div style={styles.emptyState}>
          <Inbox size={48} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
          <p>No hay entradas de stock registradas en este periodo.</p>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Fecha / Hora</th>
                <th style={styles.th}>Producto</th>
                <th style={styles.th}>Cantidad</th>
                <th style={styles.th}>Costo Unit.</th>
                <th style={styles.th}>Usuario</th>
              </tr>
            </thead>
            <tbody>
              {entradas.map((entrada) => (
                <tr key={entrada.id}>
                  <td style={styles.td}>{formatearFecha(entrada.created_at || entrada.createdAt)}</td>
                  <td style={styles.td}>
                    <span style={{ fontWeight: 'bold', color: '#5C2C0A' }}>{entrada.producto_nombre}</span> <br/>
                    <span style={{ fontSize: '0.75rem', color: '#877468' }}>{entrada.codigo_interno}</span>
                  </td>
                  <td style={{ ...styles.td, color: '#16A34A', fontWeight: 'bold' }}>
                    +{entrada.cantidad}
                  </td>
                  <td style={styles.td}>${entrada.costo_unitario || 0}</td>
                  <td style={styles.td}>{entrada.usuario_nombre || 'Sistema'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}