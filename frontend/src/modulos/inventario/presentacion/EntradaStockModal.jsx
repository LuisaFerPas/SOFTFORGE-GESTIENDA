import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Package, CheckCircle } from 'lucide-react';
import { obtenerProductoPorCodigoApi, registrarEntradaStockApi } from '../servicios/inventarioService.js';

export function EntradaStockModal({ isOpen, onClose, onSuccess }) {
  const [codigo, setCodigo] = useState('');
  const [producto, setProducto] = useState(null);
  const [buscando, setBuscando] = useState(false);
  
  // Campos del formulario
  const [cantidad, setCantidad] = useState('');
  const [costoUnitario, setCostoUnitario] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [notas, setNotas] = useState('');

  const [error, setError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const [guardando, setGuardando] = useState(false);

  const inputCodigoRef = useRef(null);

  // Autofoco al abrir el modal (HU-0601.1)
  useEffect(() => {
    if (isOpen && inputCodigoRef.current) {
      setTimeout(() => inputCodigoRef.current.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Buscar producto por código (HU-0601.1 y HU-0602.1)
  const handleBuscarProducto = async (e) => {
    if (e) e.preventDefault();
    if (!codigo.trim()) return;

    setBuscando(true);
    setError('');
    setProducto(null);

    try {
      const prod = await obtenerProductoPorCodigoApi(codigo.trim());
      if (prod) {
        setProducto(prod);
        // Prellenar el costo con el costo actual del producto si existe
        setCostoUnitario(prod.costoCompra || '');
        setCantidad('');
      } else {
        setError('Producto no encontrado. Verifique el código.');
      }
    } catch (err) {
      setError('Error al buscar el producto o no existe.');
    } finally {
      setBuscando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones (HU-0602.3)
    if (!producto) {
      setError('Debe buscar y seleccionar un producto primero.');
      return;
    }
    const cantNum = Number(cantidad);
    if (!Number.isInteger(cantNum) || cantNum <= 0) {
      setError('La cantidad debe ser un número entero mayor a cero.');
      return;
    }

    setGuardando(true);
    try {
      await registrarEntradaStockApi({
        productoId: producto.id,
        cantidad: cantNum,
        costoUnitario: costoUnitario ? Number(costoUnitario) : 0,
        motivo: proveedor ? `Prov: ${proveedor}. ${notas}` : notas
      });

      setMensajeExito('¡Entrada de stock registrada exitosamente!');
      
      // Limpiar formulario después de 2 segundos y cerrar
      setTimeout(() => {
        setMensajeExito('');
        setProducto(null);
        setCodigo('');
        setCantidad('');
        setCostoUnitario('');
        setProveedor('');
        setNotas('');
        if (onSuccess) onSuccess(); // Para recargar la tabla de inventario
        onClose();
      }, 2000);

    } catch (err) {
      setError(err.message || 'Error al registrar la entrada.');
    } finally {
      setGuardando(false);
    }
  };

  // --- Estilos (basados en Figma) ---
  const styles = {
    overlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { backgroundColor: 'white', padding: '30px', borderRadius: '16px', width: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    title: { color: '#5C2C0A', margin: 0, fontSize: '1.4rem' },
    closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#877468' },
    label: { color: '#5C2C0A', fontWeight: 'bold', marginBottom: '5px', display: 'block', fontSize: '0.9rem' },
    input: { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #FDE047', backgroundColor: '#FFFDF5', marginBottom: '15px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
    searchRow: { display: 'flex', gap: '10px', marginBottom: '15px' },
    searchBtn: { padding: '10px 15px', backgroundColor: '#F97316', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' },
    card: { backgroundColor: '#FFF8E7', padding: '15px', borderRadius: '8px', border: '1px solid #FDE047', marginBottom: '20px' },
    row: { display: 'flex', gap: '15px' },
    col: { flex: 1 },
    btnSubmit: { width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#FDE047', color: '#5C2C0A', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', marginTop: '10px' },
    error: { color: '#DC2626', fontSize: '0.9rem', marginBottom: '10px', fontWeight: 'bold' },
    success: { color: '#16A34A', fontSize: '0.9rem', marginBottom: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Entrada de Stock</h2>
          <button onClick={onClose} style={styles.closeBtn}><X size={24} /></button>
        </div>

        {mensajeExito ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <CheckCircle size={60} color="#16A34A" style={{ margin: '0 auto 20px' }} />
            <p style={styles.success}>{mensajeExito}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            
            {/* Buscador de Código (HU-0601.1) */}
            <label style={styles.label}>Escanear o Buscar Producto:</label>
            <div style={styles.searchRow}>
              <input 
                ref={inputCodigoRef}
                type="text" 
                style={{...styles.input, marginBottom: 0}} 
                placeholder="Escanee código de barras o escriba el código interno" 
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBuscarProducto(e)}
              />
              <button type="button" onClick={handleBuscarProducto} style={styles.searchBtn} disabled={buscando}>
                <Search size={18} />
              </button>
            </div>

            {error && <p style={styles.error}>{error}</p>}

            {/* Minitarjeta del Producto (HU-0602.2) */}
            {producto && (
              <div style={styles.card}>
                <h4 style={{ margin: '0 0 5px 0', color: '#5C2C0A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={18} /> {producto.nombre}
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#877468' }}>
                  <strong>Categoría:</strong> {producto.categoria || 'N/A'} | <strong>Marca:</strong> {producto.marca || 'N/A'}
                </p>
                <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#F97316', fontWeight: 'bold' }}>
                  Stock Actual: {producto.stockActual} unidades
                </p>
              </div>
            )}

            {/* Formulario de Entrada (HU-0601.2) */}
            <div style={styles.row}>
              <div style={styles.col}>
                <label style={styles.label}>Cantidad a Ingresar:</label>
                <input 
                  type="number" 
                  min="1" 
                  step="1"
                  style={styles.input} 
                  placeholder="Ej: 10"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  required
                />
              </div>
              <div style={styles.col}>
                <label style={styles.label}>Costo Unitario Compra:</label>
                <input 
                  type="number" 
                  min="0"
                  style={styles.input} 
                  placeholder="Ej: 1500"
                  value={costoUnitario}
                  onChange={(e) => setCostoUnitario(e.target.value)}
                />
              </div>
            </div>

            <label style={styles.label}>Proveedor / Factura:</label>
            <input 
              type="text" 
              style={styles.input} 
              placeholder="Nombre del proveedor o # de factura"
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
            />

            <label style={styles.label}>Notas Adicionales:</label>
            <input 
              type="text" 
              style={styles.input} 
              placeholder="Observaciones opcionales"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />

            <button type="submit" style={styles.btnSubmit} disabled={guardando || !producto}>
              {guardando ? 'Guardando...' : 'Registrar Entrada'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}