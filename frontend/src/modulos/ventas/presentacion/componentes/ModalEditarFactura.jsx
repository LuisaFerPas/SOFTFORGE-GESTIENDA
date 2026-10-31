import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle, FileText, LoaderCircle, PencilLine, ReceiptText, ShieldCheck,
  UserRound, X
} from 'lucide-react';
import { editarFactura } from '../../servicios/ventasService';
import { consultarFactura } from '../../servicios/consultaFacturasService';
import './EdicionFactura.css';

const dinero = (valor) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0
}).format(Number(valor) || 0);

/**
 * HU-0404 Fase A: corrige únicamente el nombre del cliente.
 * Carga el detalle de la factura, muestra productos en solo lectura y, al guardar,
 * anula la original y emite una nueva con el mismo venta_id y reemplaz_a.
 */
export function ModalEditarFactura({ abierto, factura, onCerrar, onGuardada }) {
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState('');
  const [resultado, setResultado] = useState(null);
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
    setResultado(null);
    setCargandoDetalle(false);
    setErrorDetalle('');
    enCursoRef.current = false;

    const cargar = async () => {
      setCargandoDetalle(true);
      setErrorDetalle('');
      try {
        const respuesta = await consultarFactura(factura.consecutivo);
        setDetalle(respuesta?.data ?? null);
      } catch (e) {
        setErrorDetalle(e.message || 'No se pudo cargar el detalle de la factura.');
      } finally {
        setCargandoDetalle(false);
      }
    };
    cargar();
  }, [abierto, factura?.consecutivo]);

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
      setResultado({ original: factura.consecutivo, nueva: nueva.consecutivo });
      onGuardada?.(respuesta.data);
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

  if (resultado) {
    return createPortal(
      <div
        className="fh-overlay"
        onMouseDown={(evento) => {
          if (evento.target === evento.currentTarget) cerrarRef.current?.();
        }}
      >
        <section
          ref={modalRef}
          className="fh-modal ef-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ef-resultado-titulo"
          aria-describedby="ef-resultado-desc"
        >
          <header className="fh-modal-head">
            <div className="fh-modal-identity">
              <span className="fh-modal-symbol"><PencilLine size={23} /></span>
              <div>
                <p className="fh-overline">HU-0404 · CORRECCIÓN COMPLETADA</p>
                <h2 id="ef-resultado-titulo">Factura corregida</h2>
                <p id="ef-resultado-desc">{resultado.original} → {resultado.nueva}</p>
              </div>
            </div>
            <button
              className="fh-icon-button"
              type="button"
              aria-label="Cerrar"
              onClick={() => cerrarRef.current?.()}
            >
              <X size={20} />
            </button>
          </header>
          <div className="fh-modal-body">
            <div className="ef-summary">
              <div><span>Factura original</span><b>{resultado.original}</b></div>
              <div><span>Estado original</span><b>ANULADA</b></div>
              <div><span>Nueva factura</span><b>{resultado.nueva}</b></div>
              <div><span>Estado nueva</span><b>EMITIDA</b></div>
            </div>
            <p className="ef-note">
              <ShieldCheck size={16} aria-hidden="true" />
              Los productos, cantidades, totales y el inventario no cambiaron.
            </p>
          </div>
          <footer className="fh-modal-footer">
            <button
              type="button"
              className="fh-btn fh-btn--primary"
              onClick={() => cerrarRef.current?.()}
            >
              Cerrar
            </button>
          </footer>
        </section>
      </div>,
      document.body
    );
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
        aria-busy={guardando || cargandoDetalle}
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
            disabled={guardando || cargandoDetalle}
          >
            <X size={20} />
          </button>
        </header>

        <form className="ef-form" onSubmit={guardar}>
          <div className="fh-modal-body">
            {cargandoDetalle ? (
              <div className="fh-state" style={{ minHeight: 180 }}>
                <LoaderCircle className="fh-rotate" size={24} /><b>Cargando detalle…</b>
              </div>
            ) : errorDetalle ? (
              <div className="fh-error" role="alert">
                <AlertCircle size={18} /> {errorDetalle}
                <button type="button" onClick={() => {
                  setErrorDetalle('');
                  setCargandoDetalle(true);
                  consultarFactura(factura.consecutivo)
                    .then((r) => setDetalle(r?.data ?? null))
                    .catch((e) => setErrorDetalle(e.message || 'Error al cargar el detalle.'))
                    .finally(() => setCargandoDetalle(false));
                }}>
                  Reintentar
                </button>
              </div>
            ) : (
              <>
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

                <div className="ef-products" aria-label="Productos en solo lectura">
                  <p className="ef-products-title">
                    <FileText size={16} aria-hidden="true" />
                    Productos de la venta (solo lectura)
                  </p>
                  {detalle?.items?.length ? (
                    <ul className="ef-products-list">
                      {detalle.items.map((item, i) => (
                        <li key={i} className="ef-product-item">
                          <span>{item.nombre}</span>
                          <span>{item.cantidad} × {dinero(item.precioUnitario)}</span>
                          <b>{dinero(item.subtotal)}</b>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="ef-empty">No se encontraron productos para mostrar.</p>
                  )}
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
              </>
            )}
          </div>

          <footer className="fh-modal-footer">
            <button
              type="button"
              className="fh-btn fh-btn--subtle"
              onClick={() => cerrarRef.current?.()}
              disabled={guardando || cargandoDetalle}
            >
              Cancelar
            </button>
            <button type="submit" className="fh-btn fh-btn--primary" disabled={guardando || cargandoDetalle || !nombre.trim()}>
              {guardando
                ? <><LoaderCircle className="fh-rotate" size={18} /> Guardando…</>
                : <><PencilLine size={18} /> Guardar cambios</>}
            </button>
          </footer>
        </form>
      </section>
    </div>,
    document.body
  );
}
