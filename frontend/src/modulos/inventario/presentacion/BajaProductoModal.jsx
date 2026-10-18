import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { darDeBajaProductoApi } from '../servicios/inventarioService.js';

/**
 * Modal de Confirmación para Dar de Baja un Producto (HU-0503).
 * Aplica desactivación lógica preservando la trazabilidad y el historial contable.
 */
export function BajaProductoModal({ isOpen, onClose, onSuccess, producto }) {
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !producto) return null;

  const handleConfirmar = async () => {
    setEliminando(true);
    setError('');

    try {
      const res = await darDeBajaProductoApi(producto.id);
      if (res && res.success) {
        if (onSuccess) onSuccess(producto);
        onClose();
      } else {
        setError(res?.message || 'No fue posible dar de baja el producto.');
      }
    } catch (err) {
      setError(err.message || 'Error de comunicación al dar de baja el producto.');
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(43, 24, 16, 0.6)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 20px 40px rgba(43, 24, 16, 0.25)',
        border: '1.5px solid #FCA5A5',
        overflow: 'hidden'
      }}>
        {/* Encabezado */}
        <div style={{
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #FEE2E2',
          backgroundColor: '#FFF5F5'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#991B1B' }}>
                Dar de Baja Producto
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#B91C1C' }}>
                Acción de desactivación lógica
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={eliminando}
            style={{
              background: 'none',
              border: 'none',
              color: '#877468',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo */}
        <div style={{ padding: '24px' }}>
          {error && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: '#FEE2E2',
              color: '#991B1B',
              borderRadius: '10px',
              fontSize: '0.85rem',
              marginBottom: '16px',
              border: '1px solid #FCA5A5'
            }}>
              {error}
            </div>
          )}

          <p style={{ margin: '0 0 16px 0', fontSize: '0.95rem', color: '#4A3B32', lineHeight: '1.5' }}>
            ¿Estás seguro de que deseas dar de baja el producto{' '}
            <strong style={{ color: '#2B1810' }}>{producto.nombre}</strong> con código{' '}
            <code style={{
              backgroundColor: '#F4E8DC',
              padding: '2px 6px',
              borderRadius: '6px',
              fontFamily: 'monospace'
            }}>
              {producto.codigoInterno}
            </code>?
          </p>

          <div style={{
            backgroundColor: '#FFFDF7',
            border: '1px solid #F4E8DC',
            borderRadius: '12px',
            padding: '14px',
            fontSize: '0.82rem',
            color: '#877468',
            lineHeight: '1.4'
          }}>
            ℹ️ <strong>Nota de Trazabilidad:</strong> El producto ya no estará disponible para nuevas ventas ni aparecerá en el catálogo activo, pero su historial de movimientos y ventas pasadas se conservará para auditoría contable.
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          borderTop: '1px solid #F4E8DC',
          backgroundColor: '#FAFAF9'
        }}>
          <button
            type="button"
            disabled={eliminando}
            onClick={onClose}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: '1.5px solid #D4A373',
              backgroundColor: '#FFFFFF',
              color: '#532009',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={eliminando}
            onClick={handleConfirmar}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#DC2626',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: eliminando ? 'not-allowed' : 'pointer',
              opacity: eliminando ? 0.7 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)'
            }}
          >
            <Trash2 size={16} />
            {eliminando ? 'Dando de baja...' : 'Dar de baja'}
          </button>
        </div>
      </div>
    </div>
  );
}
