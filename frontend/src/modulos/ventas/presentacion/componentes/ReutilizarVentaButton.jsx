import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, AlertTriangle, LoaderCircle, RotateCcw, ShoppingCart, X
} from 'lucide-react';
import { anularYCargarCarrito } from '../../servicios/ventasService';
import './EdicionFactura.css';

const dinero = (valor) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0
}).format(Number(valor) || 0);

/**
 * HU-0404 Fase B: anula venta/factura, devuelve stock y precarga el carrito.
 * La nueva venta se registra únicamente cuando el cajero confirma el cobro en el POS.
 */
export function ReutilizarVentaButton({ factura }) {
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const modalRef = useRef(null);
  const cancelarRef = useRef(null);
  const enCursoRef = useRef(false);
  const procesandoRef = useRef(false);
  const montadoRef = useRef(false);

  procesandoRef.current = procesando;

  useEffect(() => {
    montadoRef.current = true;
    return () => { montadoRef.current = false; };
  }, []);

  useEffect(() => {
    if (!abierto) return undefined;
    setError('');
    setProcesando(false);
    enCursoRef.current = false;

    const previo = document.activeElement;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cancelarRef.current?.focus();

    function manejarTeclado(evento) {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        if (!procesandoRef.current) setAbierto(false);
        return;
      }
      if (evento.key !== 'Tab') return;
      const focos = [...(modalRef.current?.querySelectorAll('button:not(:disabled)') || [])];
      if (!focos.length) return;
      const primero = focos[0];
      const ultimo = focos[focos.length - 1];
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener('keydown', manejarTeclado);
    return () => {
      document.body.style.overflow = overflowAnterior;
      document.removeEventListener('keydown', manejarTeclado);
      if (previo?.isConnected) previo.focus({ preventScroll: true });
    };
  }, [abierto]);

  if (!factura || factura.estado !== 'EMITIDA') return null;

  async function confirmar() {
    if (enCursoRef.current || procesando) return;
    enCursoRef.current = true;
    setProcesando(true);
    setError('');

    try {
      const respuesta = await anularYCargarCarrito(factura.consecutivo);
      const datos = respuesta?.data;
      if (!datos || !Array.isArray(datos.items) || datos.items.length === 0) {
        throw new Error('El servidor no devolvió los productos para cargar el carrito.');
      }
      navigate('/ventas', {
        state: {
          carritoPrecargado: {
            ...datos,
            consecutivo: factura.consecutivo
          }
        }
      });
    } catch (err) {
      if (!montadoRef.current) return;
      const mensaje = err?.message || 'No se pudo anular y reutilizar la venta.';
      const errorDeRed = /failed to fetch|network|conexi[oó]n|timeout|tiempo de espera/i.test(mensaje);
      setError(errorDeRed
        ? 'No recibimos respuesta del servidor. Verifica el historial antes de volver a intentarlo.'
        : mensaje);
    } finally {
      enCursoRef.current = false;
      if (montadoRef.current) setProcesando(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="fh-view fh-reuse"
        onClick={() => setAbierto(true)}
        title={`Anular ${factura.consecutivo} y cargar sus productos en el POS`}
      >
        <RotateCcw size={16} /> Anular y cargar
      </button>

      {abierto && createPortal(
        <div
          className="fh-overlay"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget && !procesando) setAbierto(false);
          }}
        >
          <section
            ref={modalRef}
            className="fh-modal ef-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ef-reuso-titulo"
            aria-describedby="ef-reuso-descripcion"
            aria-busy={procesando}
          >
            <header className="fh-modal-head">
              <div className="fh-modal-identity">
                <span className="fh-modal-symbol ef-symbol--danger"><RotateCcw size={23} /></span>
                <div>
                  <p className="fh-overline">HU-0404 · ANULAR Y REUTILIZAR</p>
                  <h2 id="ef-reuso-titulo">¿Anular esta venta?</h2>
                  <p id="ef-reuso-descripcion">{factura.consecutivo} · Venta #{factura.ventaId}</p>
                </div>
              </div>
              <button
                className="fh-icon-button"
                type="button"
                aria-label="Cerrar anulación"
                onClick={() => setAbierto(false)}
                disabled={procesando}
              >
                <X size={20} />
              </button>
            </header>

            <div className="fh-modal-body">
              <div className="ef-summary" aria-label="Datos de la factura">
                <div><span>Cliente</span><b>{factura.nombreCliente}</b></div>
                <div><span>Factura</span><b>{factura.consecutivo}</b></div>
                <div><span>Total</span><b>{dinero(factura.total)}</b></div>
              </div>

              <div className="ef-danger-note">
                <AlertTriangle size={21} aria-hidden="true" />
                <div>
                  <strong>Esta acción no se puede deshacer.</strong>
                  <p>La venta y la factura quedarán marcadas como ANULADAS.</p>
                </div>
              </div>

              <ul className="ef-warning-list">
                <li>El stock de cada producto volverá al inventario.</li>
                <li>Los productos se cargarán en el carrito del punto de venta con los precios vigentes.</li>
                <li>Podrás ajustar cantidades antes de registrar la nueva venta.</li>
                <li>La nueva factura solo se emitirá si el cajero lo confirma al finalizar el cobro.</li>
              </ul>

              {error && (
                <div className="ef-error" role="alert">
                  <AlertCircle size={18} aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <p className="ef-note">
                <ShoppingCart size={16} aria-hidden="true" />
                Operación exclusiva del administrador.
              </p>
            </div>

            <footer className="fh-modal-footer">
              <button
                ref={cancelarRef}
                type="button"
                className="fh-btn fh-btn--subtle"
                onClick={() => setAbierto(false)}
                disabled={procesando}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="fh-btn ef-btn--danger"
                onClick={confirmar}
                disabled={procesando}
              >
                {procesando
                  ? <><LoaderCircle className="fh-rotate" size={18} /> Anulando…</>
                  : <><RotateCcw size={18} /> Anular y cargar carrito</>}
              </button>
            </footer>
          </section>
        </div>,
        document.body
      )}
    </>
  );
}
