import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Package, Plus, ArrowDownToLine, AlertTriangle, Layers, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../../compartido/contexto/AuthContext';
import { TablaProductos } from './TablaProductos';
import { useBusquedaProductos } from './hooks/useBusquedaProductos';

export function InventarioPage() {
  const { user } = useAuth();
  const [tabActiva, setTabActiva] = useState('catalogo'); // 'catalogo' | 'entradas' | 'alertas'
  const esAdmin = user?.role === 'ADMINISTRADOR';
  
  // Estado para el catálogo de productos
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const recargarClave = useRef(0);
  
  // Hook para búsqueda de productos
  const { items: itemsBusqueda, cargando: cargandoBusqueda, error: errorBusqueda, buscar: buscarProductos, buscarConDebounce } = useBusquedaProductos();
  
  // Sincronizar resultados de búsqueda con estado local
  useEffect(() => {
    if (!cargandoBusqueda && !errorBusqueda) {
      setProductos(itemsBusqueda);
      setError(null);
    }
  }, [itemsBusqueda, cargandoBusqueda, errorBusqueda]);
  
  // Manejar producto encontrado (cuando la búsqueda devuelve exactamente 1 resultado)
  const manejarProductoEncontrado = (producto) => {
    // Aquí se podría abrir automáticamente el modal de edición o mostrar notificación
    console.log('Producto encontrado exactamente:', producto);
    // Por ahora solo lo logueamos; Santiago puede implementar la lógica real
  };
  
  // Función para cargar productos (llamada al montar y al reintentar)
  const cargarProductos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      // Forzar actualización invalidando el caché del hook
      await buscarProductos(''); // Búsqueda vacía para obtener todos
      // El hook ya maneja el estado de cargando y error
    } catch (err) {
      setError(err.message);
      setCargando(false);
    }
  }, [buscarProductos]);
  
  // Efecto inicial para cargar productos
  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header Principal */}
      <div className="panel-header" style={{ marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 className="header-title" style={{ fontSize: '1.75rem', margin: 0 }}>
              Inventario de Productos
            </h1>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: esAdmin ? '#FEF3C7' : '#E0F2FE',
              color: esAdmin ? '#92400E' : '#0369A1',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <ShieldCheck size={14} />
              {esAdmin ? 'Vista Administrador' : 'Vista Vendedor (Stock Protegido)'}
            </span>
          </div>
          <p style={{ color: '#877468', fontSize: '0.9rem', margin: 0 }}>
            Catálogo general, reabastecimiento y control de existencias · Variedades Don Mati
          </p>
        </div>

        {/* Botones de Acción (Solo Administrador) */}
        {esAdmin && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setTabActiva('entradas')}
              className="btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '12px',
                border: '1.5px solid #D4A373',
                backgroundColor: '#FFFDF7',
                color: '#532009',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              <ArrowDownToLine size={18} />
              <span>+ Entrada de Stock</span>
            </button>

            <button
              onClick={() => setTabActiva('catalogo')}
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '12px',
                backgroundColor: '#FF6600',
                color: 'white',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(255, 102, 0, 0.25)'
              }}
            >
              <Plus size={18} />
              <span>+ Nuevo Producto</span>
            </button>
          </div>
        )}
      </div>

      {/* Barra de Pestañas (Tabs) */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid #F4E8DC',
        marginBottom: '24px'
      }}>
        <button
          onClick={() => setTabActiva('catalogo')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: tabActiva === 'catalogo' ? '3px solid #FF6600' : '3px solid transparent',
            color: tabActiva === 'catalogo' ? '#FF6600' : '#877468',
            fontWeight: tabActiva === 'catalogo' ? 800 : 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '-2px',
            transition: 'all 0.2s'
          }}
        >
          <Layers size={18} />
          <span>Catálogo de Productos</span>
        </button>

        {esAdmin && (
          <button
            onClick={() => setTabActiva('entradas')}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: tabActiva === 'entradas' ? '3px solid #FF6600' : '3px solid transparent',
              color: tabActiva === 'entradas' ? '#FF6600' : '#877468',
              fontWeight: tabActiva === 'entradas' ? 800 : 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '-2px',
              transition: 'all 0.2s'
            }}
          >
            <ArrowDownToLine size={18} />
            <span>Entradas de Mercancía</span>
          </button>
        )}

        {esAdmin && (
          <button
            onClick={() => setTabActiva('alertas')}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: tabActiva === 'alertas' ? '3px solid #FF6600' : '3px solid transparent',
              color: tabActiva === 'alertas' ? '#FF6600' : '#877468',
              fontWeight: tabActiva === 'alertas' ? 800 : 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '-2px',
              transition: 'all 0.2s'
            }}
          >
            <AlertTriangle size={18} />
            <span>Alertas de Stock</span>
          </button>
        )}
      </div>

       {/* Contenido según la pestaña seleccionada */}
       {tabActiva === 'catalogo' && (
         <>
           <div className="panel-header" style={{ marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
             <div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                 <h1 className="header-title" style={{ fontSize: '1.75rem', margin: 0 }}>
                   Catálogo de Productos
                 </h1>
                 <span style={{
                   fontSize: '0.75rem',
                   fontWeight: 700,
                   padding: '4px 10px',
                   borderRadius: '20px',
                   backgroundColor: esAdmin ? '#FEF3C7' : '#E0F2FE',
                   color: esAdmin ? '#92400E' : '#0369A1',
                   display: 'inline-flex',
                   alignItems: 'center',
                   gap: '4px'
                 }}>
                   <ShieldCheck size={14} />
                   {esAdmin ? 'Vista Administrador' : 'Vista Vendedor (Stock Protegido)'}
                 </span>
               </div>
               <p style={{ color: '#877468', fontSize: '0.9rem', margin: 0 }}>
                 Catálogo general, reabastecimiento y control de existencias · Variedades Don Mati
               </p>
             </div>
             
             {/* Botones de Acción (Solo Administrador) */}
             {esAdmin && (
               <div style={{ display: 'flex', gap: '10px' }}>
                 <button
                   onClick={() => setTabActiva('entradas')}
                   className="btn-secondary"
                   style={{
                     display: 'inline-flex',
                     alignItems: 'center',
                     gap: '8px',
                     padding: '10px 16px',
                     borderRadius: '12px',
                     border: '1.5px solid #D4A373',
                     backgroundColor: '#FFFDF7',
                     color: '#532009',
                     fontWeight: 700,
                     fontSize: '0.88rem',
                     cursor: 'pointer'
                   }}
                 >
                   <ArrowDownToLine size={18} />
                   <span>+ Entrada de Stock</span>
                 </button>
                 
                 <button
                   onClick={() => setTabActiva('catalogo')}
                   className="btn-primary"
                   style={{
                     display: 'inline-flex',
                     alignItems: 'center',
                     gap: '8px',
                     padding: '10px 18px',
                     borderRadius: '12px',
                     backgroundColor: '#FF6600',
                     color: 'white',
                     border: 'none',
                     fontWeight: 700,
                     fontSize: '0.88rem',
                     cursor: 'pointer',
                     boxShadow: '0 4px 14px rgba(255, 102, 0, 0.25)'
                   }}
                 >
                   <Plus size={18} />
                   <span>+ Nuevo Producto</span>
                 </button>
               </div>
             )}
           </div>
           
           {/* Buscador y Tabla */}
           <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
             <div style={{ flex: 1, minWidth: 0 }}>
               <BuscadorProductos 
                 onBuscar={buscarProductos} 
                 onProductoEncontrado={manejarProductoEncontrado}
                 placeholder="Buscar por código o nombre..."
               />
             </div>
           </div>
           
           <TablaProductos
             productos={productos}
             cargando={cargando}
             error={error}
             onReintentar={cargarProductos}
             onEditar={(p) => {
               // Placeholder - Santiago implementará esto
               console.log('Editar producto:', p);
               // abrirModalEditar(p); 
             }}
             onEliminar={(p) => {
               // Placeholder - Santiago implementará esto
               console.log('Eliminar producto:', p);
               // confirmarBaja(p); 
             }}
             recargarClave={recargarClave}
           />
         </>
       )}

      {tabActiva === 'entradas' && esAdmin && (
        <div className="panel-card" style={{ padding: '32px' }}>
          <div style={{
            backgroundColor: '#FFFDF7',
            border: '1.5px dashed #D4A373',
            borderRadius: '16px',
            padding: '36px 24px',
            textAlign: 'center',
            color: '#532009'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              backgroundColor: '#FEF3C7',
              color: '#D97706',
              borderRadius: '16px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <ArrowDownToLine size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px 0', color: '#2B1810' }}>
              Módulo de Entradas de Mercancía y Reabastecimiento
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#877468', maxWidth: '600px', margin: '0 auto 20px auto', lineHeight: '1.5' }}>
              Espacio donde Juliana conectará el <strong>EntradaStockModal</strong> (búsqueda por código/lector o nombre) y la tabla de <strong>HistorialEntradas</strong> (Kardex).
            </p>
          </div>
        </div>
      )}

      {tabActiva === 'alertas' && esAdmin && (
        <div className="panel-card" style={{ padding: '32px' }}>
          <div style={{
            backgroundColor: '#FFFDF7',
            border: '1.5px dashed #FCA5A5',
            borderRadius: '16px',
            padding: '36px 24px',
            textAlign: 'center',
            color: '#532009'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              borderRadius: '16px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <AlertTriangle size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px 0', color: '#2B1810' }}>
              Panel de Alertas de Stock Bajo y Agotados
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#877468', maxWidth: '600px', margin: '0 auto 20px auto', lineHeight: '1.5' }}>
              Espacio donde Camilo conectará el listado de productos críticos donde <code>stock_actual &lt;= stock_minimo_alerta</code> y productos agotados (HU-0604).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
