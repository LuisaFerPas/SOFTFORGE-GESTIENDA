import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, ArrowDownToLine, AlertTriangle, Layers, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../../compartido/contexto/AuthContext';
import { TablaProductos } from './TablaProductos';
import { BuscadorProductos } from './BuscadorProductos';
import { useBusquedaProductos } from '../hooks/useBusquedaProductos';
import { EntradaStockModal } from './EntradaStockModal'; // <-- NUEVO IMPORT
import { HistorialEntradas } from './HistorialEntradas'; // <-- NUEVO IMPORT
import { ProductoModal } from './ProductoModal';
import { BajaProductoModal } from './BajaProductoModal';
import { AlertasStockPanel } from './AlertasStockPanel';
import './catalogo.css';

export function InventarioPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [tabActiva, setTabActiva] = useState(searchParams.get('tab') === 'alertas' ? 'alertas' : 'catalogo'); // 'catalogo' | 'entradas' | 'alertas'
  const esAdmin = user?.role === 'ADMINISTRADOR';

  // Estados de modales y recargas
  const [showEntradaModal, setShowEntradaModal] = useState(false);
  const [showProductoModal, setShowProductoModal] = useState(false);
  const [productoAEditar, setProductoAEditar] = useState(null);
  const [productoAEliminar, setProductoAEliminar] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Hook que maneja estado, debounce y peticiones
  const {
    items: productos,
    cargando,
    error,
    buscar: buscarProductos,
    buscarConDebounce
  } = useBusquedaProductos();

  // Carga inicial del catálogo
  useEffect(() => {
    buscarProductos('');
  }, [buscarProductos]);

  // Búsqueda con debounce al teclear en el buscador
  const manejarBusqueda = useCallback(
    (termino) => buscarConDebounce(termino),
    [buscarConDebounce]
  );

  // Recarga manual (botón reintentar / tras crear/editar/eliminar)
  const recargar = useCallback(
    (termino = '') => buscarProductos(termino),
    [buscarProductos]
  );

  // Manejar producto encontrado exactamente por el escáner
  const manejarProductoEncontrado = useCallback((producto) => {
    console.log('Producto encontrado exactamente:', producto);
  }, []);

  // Búsqueda inmediata (escáner/Enter): si hay un único resultado, avisarlo
  const manejarBusquedaInmediata = useCallback(
    async (termino) => {
      const data = await buscarProductos(termino);
      if (Array.isArray(data) && data.length === 1) {
        manejarProductoEncontrado(data[0]);
      }
    },
    [buscarProductos, manejarProductoEncontrado]
  );

  // Callback cuando se registra una entrada exitosamente
  const handleEntradaExitosa = useCallback(() => {
    // Recargamos el catálogo para reflejar el nuevo stock
    recargar('');
    // Forzamos la recarga del historial cambiando el trigger
    setRefreshTrigger(prev => prev + 1);
  }, [recargar]);

  // Handlers para HU-0501, HU-0502, HU-0503 (Santiago)
  const handleNuevoProducto = useCallback(() => {
    setProductoAEditar(null);
    setShowProductoModal(true);
  }, []);

  const handleEditarProducto = useCallback((producto) => {
    setProductoAEditar(producto);
    setShowProductoModal(true);
  }, []);

  const handleEliminarProducto = useCallback((producto) => {
    setProductoAEliminar(producto);
  }, []);

  const handleProductoGuardado = useCallback(() => {
    recargar('');
  }, [recargar]);

  const handleProductoEliminado = useCallback(() => {
    recargar('');
  }, [recargar]);

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
              onClick={() => setShowEntradaModal(true)} // <-- MODIFICADO: Abre el modal
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
              <span>Entrada de Stock</span>
            </button>

            <button
              onClick={handleNuevoProducto}
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
              <span>Nuevo Producto</span>
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
          {/* Buscador y Tabla */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <BuscadorProductos 
                onBuscar={manejarBusqueda} 
                onBuscarInmediato={manejarBusquedaInmediata}
                onProductoEncontrado={manejarProductoEncontrado}
                placeholder="Buscar por código o nombre..."
              />
            </div>
          </div>
          
          <TablaProductos
            productos={productos}
            cargando={cargando}
            error={error}
            onReintentar={() => recargar()}
            onEditar={handleEditarProducto}
            onEliminar={handleEliminarProducto}
          />
        </>
      )}

      {/* PESTAÑA DE ENTRADAS (HU-0603) - MODIFICADA */}
      {tabActiva === 'entradas' && esAdmin && (
        <div className="panel-card" style={{ padding: '0' }}>
          {/* Le pasamos el trigger para que se recargue cuando se guarde una entrada */}
          <HistorialEntradas key={refreshTrigger} />
        </div>
      )}

      {tabActiva === 'alertas' && esAdmin && <AlertasStockPanel key={refreshTrigger} />}

      {/* MODAL DE ENTRADA DE STOCK (HU-0601 y HU-0602) */}
      <EntradaStockModal 
        isOpen={showEntradaModal} 
        onClose={() => setShowEntradaModal(false)} 
        onSuccess={handleEntradaExitosa}
      />

      {/* MODAL DE REGISTRAR Y MODIFICAR PRODUCTO (HU-0501 y HU-0502) */}
      <ProductoModal
        isOpen={showProductoModal}
        onClose={() => {
          setShowProductoModal(false);
          setProductoAEditar(null);
        }}
        onSuccess={handleProductoGuardado}
        productoAEditar={productoAEditar}
      />

      {/* MODAL DE DAR DE BAJA PRODUCTO (HU-0503) */}
      <BajaProductoModal
        isOpen={Boolean(productoAEliminar)}
        onClose={() => setProductoAEliminar(null)}
        onSuccess={handleProductoEliminado}
        producto={productoAEliminar}
      />
    </div>
  );
}