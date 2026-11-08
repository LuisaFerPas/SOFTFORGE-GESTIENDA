import React, { useEffect, useRef, useState } from 'react';
import { registrarAbono } from '../servicios/apartadosService.js';
import { validarAbono } from '../utilidades/validarAbono.js';
import { formatCOP } from '../../inventario/utilidades/formatoMoneda.js';

const MEDIOS_PAGO = [
  { valor: 'EFECTIVO', etiqueta: 'Efectivo' },
  { valor: 'NEQUI', etiqueta: 'Nequi' },
  { valor: 'OTRO', etiqueta: 'Otro' }
];

/**
 * HU-0702 — Modal para registrar un abono adicional sobre un apartado activo.
 */
export function RegistrarAbonoModal({ isOpen, apartado, onClose, onRegistrado }) {
  const [monto, setMonto] = useState('');
  const [medioPago, setMedioPago] = useState('EFECTIVO');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setMonto('');
    setMedioPago('EFECTIVO');
    setEnviando(false);
    setError('');
  }, [isOpen, apartado?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const enfocar = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(enfocar);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const alPresionarTecla = (evento) => {
      if (evento.key === 'Escape' && !enviando) {
        onClose?.();
      }
    };

    window.addEventListener('keydown', alPresionarTecla);
    return () => window.removeEventListener('keydown', alPresionarTecla);
  }, [isOpen, enviando, onClose]);

  if (!isOpen || !apartado) return null;

  const saldoPendiente = numeroSeguro(apartado.saldoPendiente);
  const validacion = validarAbono(monto, saldoPendiente);
  const mostrarError = monto !== '' && !validacion.valido;
  const puedeEnviar = validacion.valido && !enviando;

  const cerrar = () => {
    if (!enviando) onClose?.();
  };

  const manejarEnvio = async (evento) => {
    evento.preventDefault();
    if (!puedeEnviar) return;

    setEnviando(true);
    setError('');

    try {
      await registrarAbono(apartado.id, {
        monto: Number(monto),
        medioPago
      });
    } catch (err) {
      setError(err?.message || 'No se pudo registrar el abono.');
      setEnviando(false);
      return;
    }

    setEnviando(false);
    onRegistrado?.();
  };

  return (
    <div style={estilos.fondo} onClick={cerrar} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-registrar-abono"
        style={estilos.modal}
        onClick={(evento) => evento.stopPropagation()}
      >
        <header style={estilos.encabezado}>
          <div>
            <h2 id="titulo-registrar-abono" style={estilos.titulo}>
              Registrar abono
            </h2>
            <p style={estilos.subtitulo}>
              {apartado.codigo ?? 'Apartado'} · {apartado.clienteNombre ?? 'Cliente'}
            </p>
          </div>
          <button
            type="button"
            onClick={cerrar}
            disabled={enviando}
            aria-label="Cerrar"
            style={estilos.botonCerrar}
          >
            ×
          </button>
        </header>

        <div style={estilos.resumenSaldo}>
          <span>Saldo pendiente</span>
          <strong style={{ color: '#DC2626' }}>
            {formatCOP.format(saldoPendiente)}
          </strong>
        </div>

        <form onSubmit={manejarEnvio}>
          <label htmlFor="monto-abono" style={estilos.etiqueta}>
            Monto del abono
          </label>
          <input
            id="monto-abono"
            ref={inputRef}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={monto}
            onChange={(evento) => setMonto(evento.target.value)}
            disabled={enviando}
            placeholder="Ej: 10000"
            style={estilos.input}
          />

          {mostrarError ? (
            <p role="alert" style={estilos.advertencia}>
              {validacion.error}
            </p>
          ) : null}

          <label htmlFor="medio-pago-abono" style={estilos.etiqueta}>
            Medio de pago
          </label>
          <select
            id="medio-pago-abono"
            value={medioPago}
            onChange={(evento) => setMedioPago(evento.target.value)}
            disabled={enviando}
            style={estilos.input}
          >
            {MEDIOS_PAGO.map((medio) => (
              <option key={medio.valor} value={medio.valor}>
                {medio.etiqueta}
              </option>
            ))}
          </select>

          {error ? (
            <p role="alert" style={estilos.error}>
              {error}
            </p>
          ) : null}

          <footer style={estilos.acciones}>
            <button
              type="button"
              onClick={cerrar}
              disabled={enviando}
              style={estilos.botonSecundario}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!puedeEnviar}
              style={{
                ...estilos.botonPrincipal,
                opacity: puedeEnviar ? 1 : 0.6,
                cursor: puedeEnviar ? 'pointer' : 'not-allowed'
              }}
            >
              {enviando ? 'Registrando...' : 'Registrar abono'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

function numeroSeguro(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

const estilos = {
  fondo: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    zIndex: 1000
  },
  modal: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#FFFDF7',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 20px 45px rgba(0,0,0,0.2)'
  },
  encabezado: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '16px'
  },
  titulo: {
    margin: 0,
    fontSize: '1.15rem',
    fontWeight: 700,
    color: '#1F2937'
  },
  subtitulo: {
    margin: '4px 0 0 0',
    fontSize: '0.85rem',
    color: '#6B7280'
  },
  botonCerrar: {
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '1.5rem',
    lineHeight: 1,
    color: '#6B7280',
    cursor: 'pointer'
  },
  resumenSaldo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
    padding: '10px 12px',
    marginBottom: '16px',
    fontSize: '0.9rem',
    color: '#4B5563'
  },
  etiqueta: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '6px'
  },
  input: {
    width: '100%',
    padding: '9px 12px',
    borderRadius: '8px',
    border: '1px solid #D1D5DB',
    fontSize: '0.9rem',
    outline: 'none',
    marginBottom: '12px',
    backgroundColor: '#FFFFFF',
    boxSizing: 'border-box'
  },
  advertencia: {
    margin: '-4px 0 12px 0',
    fontSize: '0.8rem',
    color: '#B45309'
  },
  error: {
    margin: '0 0 12px 0',
    fontSize: '0.8rem',
    color: '#DC2626'
  },
  acciones: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '4px'
  },
  botonSecundario: {
    padding: '9px 14px',
    fontSize: '0.85rem',
    fontWeight: 600,
    borderRadius: '6px',
    border: '1px solid #D1D5DB',
    backgroundColor: '#FFFFFF',
    color: '#374151',
    cursor: 'pointer'
  },
  botonPrincipal: {
    padding: '9px 14px',
    fontSize: '0.85rem',
    fontWeight: 600,
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#FF6600',
    color: '#FFFFFF'
  }
};
