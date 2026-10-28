import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle, LoaderCircle, PencilLine, ReceiptText, ShieldCheck, UserRound, X
} from 'lucide-react';
import { editarFactura } from '../../servicios/ventasService';
import './EdicionFactura.css';

const dinero = (valor) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0
}).format(Number(valor) || 0);

/**
 * HU-0404 Fase A: corrige únicamente el nombre del cliente.
 * La factura anterior queda ANULADA y se emite una nueva con otro consecutivo.
 */
export function ModalEditarFactura({ abierto, factura, onCerrar, onGuardada }) {
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const modalRef = useRef(null);
  const enCursoRef = useRef(false);
  const guardandoRef = useRef(false);
  const cerrarRef = useRef(onCerrar);

  cerrarRef.current = onCerrar;
  guardandoRef.current = guardando;

  useEffect(() => {
    if (!abierto) return;
    setNombre(factura?.nombreCliente ?? '');
    setError('');
    setGuardando(false);
    enCursoRef.current = false;
  }, [abierto, factura?.consecutivo, factura?.nombreCliente]);

  useEffect(() => {
    if (!abierto) return undefined;
    const previo = document.activeElement;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    inputRef.current?.focus();

    function manejarTeclado(evento) {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        if (!guardandoRef.current) cerrarRef.current?.();
        return;
      }
      if (evento.key !== 'Tab') return;
      const focos = [...(modalRef.current?.querySelectorAll(
        'button:not(:disabled), input:not(:disabled)'
      ) || [])];
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

  if (!abierto || !factura) return null;

  async function guardar(evento) {
    evento.preventDefault();
    if (enCursoRef.current || guardando) return;

    const limpio = nombre.trim();
    if (!limpio) {
      setError('Ingresa el nombre del cliente.');
      inputRef.current?.focus();
      return;
    }
    if (limpio.length > 150) {
      setError('El nombre del cliente no puede superar 150 caracteres.');
      inputRef.current?.focus();
      return;
    }
    if (limpio === String(factura.nombreCliente ?? '').trim()) {
      setError('El nombre del cliente no cambió.');
      inputRef.current?.focus();
      return;
    }

    enCursoRef.current = true;
    setGuardando(true);
    setError('');
    try {
      const respuesta = await editarFactura(factura.consecutivo, { nombreCliente: limpio });
      const nueva = respuesta?.data?.nueva;
      if (!nueva?.consecutivo) {
        throw new Error('El servidor no devolvió la factura corregida.');
      }
      onGuardada?.(respuesta.data);
      cerrarRef.current?.();
    } catch (err) {
      const mensaje = err?.message || 'No se pudo corregir el nombre del cliente.';
      const errorDeRed = /failed to fetch|network|conexi[oó]n|timeout|tiempo de espera/i.test(mensaje);
      setError(errorDeRed
        ? 'No recibimos respuesta del servidor. Verifica el historial antes de volver a intentarlo.'
        : mensaje);
    } finally {
      enCursoRef.current = false;
      setGuardando(false);
    }
  }

  return createPortal(
    <div
      className="fh-overlay"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget && !guardando) cerrarRef.current?.();
      }}
    >
      <section
        ref={modalRef}
        className="fh-modal ef-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ef-titulo"
        aria-describedby="ef-descripcion"
        aria-busy={guardando}
      >
        <header className="fh-modal-head">
          <div className="fh-modal-identity">
            <span className="fh-modal-symbol"><PencilLine size={23} /></span>
            <div>
              <p className="fh-overline">HU-0404 · CORRECCIÓN DE FACTURA</p>
              <h2 id="ef-titulo">Corregir nombre del cliente</h2>
              <p id="ef-descripcion">{factura.consecutivo} · Venta #{factura.ventaId}</p>
            </div>
          </div>
          <button
            className="fh-icon-button"
            type="button"
            aria-label="Cerrar corrección"
            onClick={() => cerrarRef.current?.()}
            disabled={guardando}
          >
            <X size={20} />
          </button>
        </header>

        <form className="ef-form" onSubmit={guardar}>
          <div className="fh-modal-body">
            <div className="ef-summary" aria-label="Datos de la factura">
              <div><span>Factura</span><b>{factura.consecutivo}</b></div>
              <div><span>Venta</span><b>#{factura.ventaId}</b></div>
              <div><span>Total</span><b>{dinero(factura.total)}</b></div>
            </div>

            <label className="ef-label" htmlFor="ef-nombre">
              <UserRound size={17} /> Nombre del cliente
            </label>
            <input
              ref={inputRef}
              id="ef-nombre"
              className="ef-input"
              type="text"
              value={nombre}
              maxLength={150}
              autoComplete="name"
              disabled={guardando}
              onChange={(evento) => {
                setNombre(evento.target.value);
                if (error) setError('');
              }}
              aria-invalid={Boolean(error)}
              aria-describedby="ef-ayuda"
            />
            <p id="ef-ayuda" className="ef-help">
              Solo se actualiza el nombre. Los productos, cantidades, totales y el inventario no cambian.
            </p>

            <div className="ef-warning">
              <ReceiptText size={19} aria-hidden="true" />
              <p>
                La factura <b>{factura.consecutivo}</b> quedará <b>ANULADA</b> y se generará una
                nueva factura <b>EMITIDA</b> con otro consecutivo.
              </p>
            </div>

            {error && (
              <div className="ef-error" role="alert">
                <AlertCircle size={18} aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <p className="ef-note">
              <ShieldCheck size={16} aria-hidden="true" />
              Operación exclusiva del administrador. La venta y el stock permanecen intactos.
            </p>
          </div>

          <footer className="fh-modal-footer">
            <button
              type="button"
              className="fh-btn fh-btn--subtle"
              onClick={() => cerrarRef.current?.()}
              disabled={guardando}
            >
              Cancelar
            </button>
            <button type="submit" className="fh-btn fh-btn--primary" disabled={guardando}>
              {guardando
                ? <><LoaderCircle className="fh-rotate" size={18} /> Guardando…</>
                : <><PencilLine size={18} /> Guardar corrección</>}
            </button>
          </footer>
        </form>
      </section>
    </div>,
    document.body
  );
}
