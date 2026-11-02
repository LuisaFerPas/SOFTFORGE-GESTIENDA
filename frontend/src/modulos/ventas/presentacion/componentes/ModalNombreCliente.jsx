import { useState, useRef, useEffect } from 'react';
import { FileText, X, Printer, SkipForward, Loader2 } from 'lucide-react';

/**
 * HU-0403: Modal para capturar el nombre del cliente al finalizar una venta.
 *
 * Criterios de aceptación:
 *  CA-1: Confirmar con nombre → se envía el nombre al backend y se imprime en el ticket.
 *  CA-2: Saltar / dejar en blanco → se emite factura sin nombre (Consumidor Final).
 *
 * Props:
 *  - ventaId: number — ID de la venta recién registrada.
 *  - visible: boolean — controla si el modal se muestra.
 *  - onConfirmar(ventaId, nombreCliente): función del padre que llama a la API.
 *  - onSaltar(ventaId): emite sin nombre.
 *  - onCerrar(): cierra sin acción.
 */
export function ModalNombreCliente({ ventaId, visible, onConfirmar, onSaltar, onCerrar }) {
  const [nombre, setNombre]     = useState('');
  const [cargando, setCargando] = useState(false);
  const inputRef = useRef(null);

  // Enfocar el input automáticamente al abrirse
  useEffect(() => {
    if (visible) {
      setNombre('');
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [visible]);

  // Manejar tecla Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (visible && e.key === 'Escape') {
        onSaltar?.(ventaId);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, ventaId, onSaltar]);

  if (!visible) return null;

  async function handleConfirmar() {
    setCargando(true);
    try {
      await onConfirmar(ventaId, nombre.trim() || null);
    } finally {
      setCargando(false);
    }
  }

  async function handleSaltar() {
    setCargando(true);
    try {
      // CA-2: saltar = nombre null / Consumidor Final
      await onSaltar(ventaId);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-factura-titulo"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(43, 24, 16, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        animation: 'fadeIn 0.15s ease'
      }}
      onClick={e => { if (e.target === e.currentTarget && !cargando) onCerrar?.(); }}
    >
      <div style={{
        background: '#ffffff',
        borderRadius: 20,
        padding: '30px 28px',
        maxWidth: 460,
        width: '100%',
        boxShadow: '0 24px 60px rgba(67, 23, 4, 0.25)',
        border: '1.5px solid var(--border-card, #f4e8dc)',
        position: 'relative',
        animation: 'slideDown 0.18s ease-out'
      }}>
        {/* Botón cerrar */}
        <button
          type="button"
          aria-label="Cerrar modal"
          disabled={cargando}
          onClick={handleSaltar}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: '#f9fafb',
            border: 'none',
            cursor: 'pointer',
            color: '#6b7280',
            width: 32,
            height: 32,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.12s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
          onMouseLeave={e => e.currentTarget.style.background = '#f9fafb'}
        >
          <X size={18} />
        </button>

        {/* Encabezado con ícono */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            background: 'var(--orange-light, #FFF2E8)',
            color: 'var(--primary-orange, #FF6600)',
            borderRadius: 14,
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <FileText size={24} />
          </div>
          <div>
            <h2 id="modal-factura-titulo" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-title, #2B1810)' }}>
              Facturación Térmica
            </h2>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted, #877468)', fontWeight: 600 }}>
              Venta #{ventaId} registrada con éxito
            </div>
          </div>
        </div>

        <p style={{
          color: 'var(--text-body, #4A3B32)',
          fontSize: '0.92rem',
          margin: '14px 0 20px',
          lineHeight: 1.5
        }}>
          ¿Deseas personalizar el comprobante con el nombre del cliente?
          Puedes escribirlo o presionar <strong>Omitir</strong> para emitirlo como <em>Consumidor Final</em>.
        </p>

        {/* Input de Nombre (CA-1) */}
        <div style={{ marginBottom: 22 }}>
          <label
            htmlFor="input-nombre-cliente"
            style={{
              display: 'block',
              fontWeight: 700,
              marginBottom: 6,
              fontSize: '0.88rem',
              color: 'var(--text-title, #2B1810)'
            }}
          >
            Nombre del Cliente <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(opcional)</span>
          </label>
          <input
            id="input-nombre-cliente"
            ref={inputRef}
            type="text"
            maxLength={100}
            placeholder="Ej: Andrés Gómez / Don Pedro"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirmar();
              }
            }}
            disabled={cargando}
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '1.5px solid var(--border-card, #f4e8dc)',
              borderRadius: 12,
              fontSize: '1rem',
              color: 'var(--text-title, #2B1810)',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s'
            }}
          />
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
          {/* CA-2: Omitir / Consumidor Final */}
          <button
            id="btn-saltar-nombre-cliente"
            type="button"
            onClick={handleSaltar}
            disabled={cargando}
            style={{
              padding: '11px 18px',
              border: '1.5px solid var(--border-card, #f4e8dc)',
              borderRadius: 12,
              background: '#fdfaf7',
              color: 'var(--text-body, #4A3B32)',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s'
            }}
          >
            <SkipForward size={16} /> Omitir (Consumidor Final)
          </button>

          {/* CA-1: Confirmar con nombre */}
          <button
            id="btn-confirmar-nombre-cliente"
            type="button"
            onClick={handleConfirmar}
            disabled={cargando}
            style={{
              padding: '11px 22px',
              border: 'none',
              borderRadius: 12,
              background: 'var(--primary-orange, #FF6600)',
              color: '#ffffff',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.92rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(255, 102, 0, 0.3)',
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => !cargando && (e.currentTarget.style.background = '#e65c00')}
            onMouseLeave={e => !cargando && (e.currentTarget.style.background = '#FF6600')}
          >
            {cargando ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Emitiendo...
              </>
            ) : (
              <>
                <Printer size={17} /> Emitir Factura
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
