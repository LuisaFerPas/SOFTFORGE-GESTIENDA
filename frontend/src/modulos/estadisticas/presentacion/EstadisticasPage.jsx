import React, { useState, useEffect } from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Wallet, 
  AlertTriangle,
  LoaderCircle
} from 'lucide-react';
import { useAuth } from '../../../compartido/contexto/AuthContext';
import { ResumenCaja } from './componentes/ResumenCaja';
import { ListadoPagosDia } from './componentes/ListadoPagosDia';
import { consultarDesempenioProductos } from '../servicios/estadisticasService';

export function EstadisticasPage() {
  const { isAdmin } = useAuth();
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('MES');
  const [seccionActiva, setSeccionActiva] = useState('ventas');

  // Estados para HU-0902.4
  const [datosProductos, setDatosProductos] = useState(null);
  const [cargandoProductos, setCargandoProductos] = useState(false);
  const [errorProductos, setErrorProductos] = useState('');

  // Cargar datos cuando se abre la pestaña de productos
  useEffect(() => {
    if (seccionActiva === 'productos' && !datosProductos) {
      cargarDesempenioProductos();
    }
  }, [seccionActiva]);

  const cargarDesempenioProductos = async () => {
    setCargandoProductos(true);
    setErrorProductos('');
    try {
      const respuesta = await consultarDesempenioProductos();
      setDatosProductos(respuesta.data);
    } catch (err) {
      setErrorProductos(err.message || 'Error al cargar los datos.');
    } finally {
      setCargandoProductos(false);
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#FEF2F2', borderRadius: '12px', border: '1px solid #FCA5A5', margin: '20px' }}>
        <AlertTriangle size={48} style={{ color: '#DC2626', margin: '0 auto 12px auto' }} />
        <h2 style={{ color: '#991B1B', fontWeight: 700 }}>Acceso Restringido</h2>
        <p style={{ color: '#7F1D1D', fontSize: '0.95rem' }}>El módulo de estadísticas es exclusivo para Administradores.</p>
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
      <div className="panel-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="header-title" style={{ fontSize: '1.6rem', color: '#1F2937' }}>Don Mati — Estadísticas y Reportes</h1>
          <p style={{ color: '#6B7280', fontSize: '0.9rem', marginTop: '4px' }}>Métricas de ventas, rendimiento de catálogo, balance financiero y caja</p>
        </div>

        <div style={{ display: 'flex', backgroundColor: '#F3F4F6', borderRadius: '8px', padding: '4px', gap: '4px' }}>
          {periodos.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriodoSeleccionado(p.id)}
              style={{
                border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                backgroundColor: periodoSeleccionado === p.id ? '#FF6600' : 'transparent', color: periodoSeleccionado === p.id ? '#FFFFFF' : '#4B5563'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #E5E7EB', marginBottom: '20px', overflowX: 'auto' }}>
        {[
          { id: 'ventas', label: 'Ventas (HU-0901)', icon: TrendingUp },
          { id: 'productos', label: 'Productos (HU-0902)', icon: ShoppingBag },
          { id: 'financiero', label: 'Financiero (HU-0903)', icon: DollarSign },
          { id: 'graficas', label: 'Gráficas (HU-0904)', icon: BarChart2 },
          { id: 'caja', label: 'Cierre de Caja', icon: Wallet }
        ].map(item => {
          const IconComponent = item.icon;
          const activa = seccionActiva === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setSeccionActiva(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', fontSize: '0.9rem', fontWeight: 600, border: 'none',
                borderBottom: activa ? '3px solid #FF6600' : '3px solid transparent', backgroundColor: activa ? '#FFFDF7' : 'transparent',
                color: activa ? '#FF6600' : '#4B5563', cursor: 'pointer', borderRadius: '6px 6px 0 0', whiteSpace: 'nowrap'
              }}
            >
              <IconComponent size={17} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {seccionActiva === 'ventas' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div style={{ backgroundColor: '#FFFDF7', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '0.85rem', color: '#6B7280', marginBottom: '4px' }}>Total Ventas ({periodoSeleccionado})</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1F2937' }}>$0</div>
          </div>
          <div style={{ backgroundColor: '#FFFDF7', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '0.85rem', color: '#6B7280', marginBottom: '4px' }}>Transacciones</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1F2937' }}>0</div>
          </div>
        </div>
      )}

      {/* HU-0902.4: Sección de Productos */}
      {seccionActiva === 'productos' && (
        <div>
          {cargandoProductos ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
              <LoaderCircle size={32} className="pos-spin" style={{ margin: '0 auto 12px auto' }} />
              <p>Cargando desempeño de productos...</p>
            </div>
          ) : errorProductos ? (
            <div style={{ padding: '20px', backgroundColor: '#FEF2F2', color: '#DC2626', borderRadius: '8px' }}>
              {errorProductos}
            </div>
          ) : datosProductos ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Tabla 1: TOP 10 Productos */}
              <div style={{ backgroundColor: '#FFFDF7', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={20} color="#FF6600" /> Top 10 Productos Más Vendidos
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E5E7EB', textAlign: 'left', color: '#6B7280' }}>
                      <th style={{ padding: '10px 8px' }}>Producto</th>
                      <th style={{ padding: '10px 8px' }}>Unidades Vendidas</th>
                      <th style={{ padding: '10px 8px' }}>Ingreso Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datosProductos.masVendidos.map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '10px 8px', fontWeight: 500 }}>{p.nombre}</td>
                        <td style={{ padding: '10px 8px' }}>{p.total_unidades}</td>
                        <td style={{ padding: '10px 8px', color: '#059669', fontWeight: 600 }}>${p.ingreso_total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tabla 2: Ventas por Categoría */}
              <div style={{ backgroundColor: '#FFFDF7', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingBag size={20} color="#FF6600" /> Ventas por Categoría
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E5E7EB', textAlign: 'left', color: '#6B7280' }}>
                      <th style={{ padding: '10px 8px' }}>Categoría</th>
                      <th style={{ padding: '10px 8px' }}>Unidades</th>
                      <th style={{ padding: '10px 8px' }}>Ingreso Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datosProductos.porCategoria.map((c, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '10px 8px', fontWeight: 500 }}>{c.categoria}</td>
                        <td style={{ padding: '10px 8px' }}>{c.total_unidades}</td>
                        <td style={{ padding: '10px 8px', color: '#059669', fontWeight: 600 }}>${c.ingreso_total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tabla 3: Alertas de Stock */}
              <div style={{ backgroundColor: '#FFFDF7', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={20} color="#DC2626" /> Alertas de Stock
                </h3>
                {datosProductos.alertasStock.length === 0 ? (
                  <p style={{ color: '#6B7280' }}>No hay productos con alertas de stock.</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #E5E7EB', textAlign: 'left', color: '#6B7280' }}>
                        <th style={{ padding: '10px 8px' }}>Producto</th>
                        <th style={{ padding: '10px 8px' }}>Stock Actual</th>
                        <th style={{ padding: '10px 8px' }}>Mínimo</th>
                        <th style={{ padding: '10px 8px' }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datosProductos.alertasStock.map((a, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '10px 8px', fontWeight: 500 }}>{a.nombre}</td>
                          <td style={{ padding: '10px 8px' }}>{a.stock_actual}</td>
                          <td style={{ padding: '10px 8px' }}>{a.stock_minimo_alerta}</td>
                          <td style={{ padding: '10px 8px' }}>
                            <span style={{ 
                              padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                              backgroundColor: a.estado === 'AGOTADO' ? '#FEE2E2' : '#FEF3C7',
                              color: a.estado === 'AGOTADO' ? '#DC2626' : '#D97706'
                            }}>
                              {a.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

            </div>
          ) : null}
        </div>
      )}

      {seccionActiva === 'financiero' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div style={{ backgroundColor: '#FFFDF7', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>Ingresos Brutos</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>$0</div>
          </div>
        </div>
      )}

      {seccionActiva === 'graficas' && (
        <div style={{ backgroundColor: '#FFFDF7', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '36px', textAlign: 'center' }}>
          <BarChart2 size={48} style={{ color: '#FF6600', margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1F2937' }}>Visualización de Gráficas Estadísticas</h3>
          <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Sección reservada para HU-0904.</p>
        </div>
      )}

      {seccionActiva === 'caja' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: '#FFFDF7', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Resumen de Caja Diaria</h3>
            <ResumenCaja />
          </div>

          <div style={{ backgroundColor: '#FFFDF7', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '24px' }}>
            <ListadoPagosDia />
          </div>
        </div>
      )}
    </div>
  );
}

export default EstadisticasPage;