import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle, BadgeCheck, FileText, Info, LoaderCircle, Printer,
  UserRound, X
} from 'lucide-react';
import { generarFactura, generarEImprimirFacturaApi } from '../servicios/ventasService';

/**
 * SD-121 / HU-0401.3 — después de registrar una venta, decidir si emitir factura.
 * Nunca genera al abrir. Solo ejecuta POST /ventas/facturas al pulsar «Sí, imprimir».
 * HU-0402.4: Permite enviar a la impresora tras generar la factura.
 */
export function PreguntaFacturaDialog({ abierto, ventaId, onCerrar, onGenerada }) {
  const [nombreCliente, setNombreCliente] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [factura, setFactura] = useState(null);
  
  // NUEVOS ESTADOS PARA LA IMPRESIÓN
  const [imprimiendo, setImprimiendo] = useState(false);
  const [impreso, setImpreso] = useState(false);

  const enCursoRef = useRef(false);
  const contenedorRef = useRef(null);
  const omitirRef = useRef(null);
  const terminarRef = useRef(null);
  const cerrarRef = useRef(onCerrar);
  const procesandoRef = useRef(false);
  cerrarRef.current = onCerrar;
  procesandoRef.current = procesando || imprimiendo;

  useEffect(() => {
    if (!abierto) return;
    setNombreCliente('');
    setError('');
    setFactura(null);
    setProcesando(false);
    setImprimiendo(false);
    setImpreso(false);
    enCursoRef.current = false;
  }, [abierto, ventaId]);

  useEffect(() => {
    if (!abierto) return undefined;
    const previo = document.activeElement;
    const scrollAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    omitirRef.current?.focus();

    function manejarTeclado(evento) {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        if (!procesandoRef.current) cerrarRef.current?.();
        return;
      }
      if (evento.key !== 'Tab') return;
      const focos = [...(contenedorRef.current?.querySelectorAll(
        'button:not([disabled]), input:not([disabled])'
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
      document.body.style.overflow = scrollAnterior;
      document.removeEventListener('keydown', manejarTeclado);
      if (previo?.isConnected) previo.focus({ preventScroll: true });
    };
  }, [abierto]);

  useEffect(() => {
    if (factura && abierto) terminarRef.current?.focus();
  }, [factura, abierto]);

  async function confirmar(evento) {
    evento.preventDefault();
    if (!abierto || procesando || enCursoRef.current || factura) return;
    const nombre = nombreCliente.trim() || 'Consumidor Final';
    if (!Number.isSafeInteger(Number(ventaId)) || Number(ventaId) <= 0) {
      setError('No encontramos el número de la venta. Regresa y verifica el registro antes de continuar.');
      return;
    }
    if (nombre.length > 150) {
      setError('El nombre del cliente no puede superar 150 caracteres.');
      return;
    }
    enCursoRef.current = true;
    setProcesando(true);
    setError('');
    try {
      // ÚNICA operación de creación: solo al confirmar explícitamente.
      const respuesta = await generarFactura(Number(ventaId), nombre);
      if (!respuesta?.data?.consecutivo) {
        throw new Error('El servidor no devolvió el consecutivo. Verifica la factura antes de reintentar.');
      }
      setFactura(respuesta.data);
      onGenerada?.(respuesta.data);
    } catch (err) {
      const mensaje = err?.message || 'No se pudo generar la factura.';
      const errorDeRed = /failed to fetch|network|conexi[oó]n|timeout|tiempo de espera/i.test(mensaje);
      setError(errorDeRed
        ? 'No recibimos respuesta. La factura podría haberse generado; comprueba su existencia antes de intentarlo nuevamente.'
        : mensaje);
    } finally {
      enCursoRef.current = false;
      setProcesando(false);
    }
  }

  // NUEVA FUNCIÓN: Enviar a la impresora (HU-0402.4)
  async function handleImprimir() {
    if (imprimiendo || impreso) return;
    
    setImprimiendo(true);
    setError('');
    
    try {
      await generarEImprimirFacturaApi(Number(ventaId), factura.nombreCliente || 'Consumidor Final');
      setImpreso(true);
    } catch (err) {
      const mensaje = err?.message || 'No se pudo enviar a la impresora.';
      setError(mensaje);
    } finally {
      setImprimiendo(false);
    }
  }

  function omitir() {
    if (enCursoRef.current || procesando || imprimiendo) return;
    onCerrar?.();
  }

  if (!abierto) return null;

  return createPortal(
    <div className="pos-modal-backdrop">
      <section ref={contenedorRef} className="pos-modal pos-factura-modal" role="dialog"
        aria-modal="true" aria-labelledby="pos-factura-title"
        aria-describedby="pos-factura-description" aria-busy={procesando || imprimiendo}>
        <header className="pos-modal-header">
          <div className="pos-modal-heading">
            <span className="pos-modal-icon"><FileText size={23} /></span>
            <div>
              <span className="pos-eyebrow">VENTA #{ventaId} REGISTRADA</span>
              <h2 id="pos-factura-title">
                {factura ? 'Factura generada correctamente' : '¿Desea imprimir la factura?'}
              </h2>
              <p id="pos-factura-description">
                {factura
                  ? 'La factura quedó asociada a la venta y tiene consecutivo.'
                  : 'Puedes emitir una factura o continuar sin generarla.'}
              </p>
            </div>
          </div>
          <button type="button" className="pos-modal-close" onClick={omitir}
            disabled={procesando || imprimiendo} aria-label="Cerrar ventana de factura"><X size={20}/></button>
        </header>

        <div className="pos-modal-content">
          {factura ? (
            <div className="pos-invoice-success" role="status" aria-live="polite">
              <BadgeCheck size={29} aria-hidden="true" />
              <div>
                <strong>Factura {factura.consecutivo}</strong>
                <p>Cliente: {factura.nombreCliente || 'Consumidor Final'}</p>
                <p>Estado: registrada en Gestienda.</p>
                
                {/* NUEVO: Mensaje de éxito de impresión */}
                {impreso && (
                  <p style={{ color: '#16A34A', fontWeight: 'bold', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Printer size={18} /> Ticket enviado a la impresora exitosamente.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <form id="pos-form-factura" onSubmit={confirmar}>
              <div className="pos-invoice-steps" aria-label="Opciones de facturación">
                <span className="pos-invoice-step"><BadgeCheck size={16} /> Venta guardada</span>
                <span className="pos-invoice-step pos-invoice-step--active"><FileText size={16} /> Decidir factura</span>
              </div>
              <label className="pos-invoice-label" htmlFor="pos-factura-cliente">
                <UserRound size={17} /> Nombre del cliente <small>(opcional)</small>
              </label>
              <input id="pos-factura-cliente" type="text" className="pos-invoice-input"
                value={nombreCliente} maxLength={150} autoComplete="name"
                onChange={(evento) => setNombreCliente(evento.target.value)}
                placeholder="Consumidor Final" disabled={procesando}
                aria-describedby="pos-factura-ayuda" />
              <p id="pos-factura-ayuda" className="pos-invoice-hint">
                Si dejas el campo vacío, se registrará como «Consumidor Final».
              </p>
            </form>
          )}

          {error && (
            <div className="pos-invoice-error" role="alert">
              <AlertCircle size={18} aria-hidden="true" />
              <div><strong>Ocurrió un error</strong><p>{error}</p></div>
            </div>
          )}
          
          <div className="pos-invoice-info pos-invoice-disclaimer">
            <Info size={18} aria-hidden="true" />
            <p><strong>Importante:</strong> {factura
              ? 'La factura se guardó en el sistema. Puedes enviarla a la impresora usando el botón de abajo.'
              : '«Sí, generar» guardará la factura. Después podrás imprimirla.'}</p>
          </div>
        </div>

        <footer className="pos-modal-footer">
          {factura ? (
            // NUEVOS BOTONES CUANDO LA FACTURA YA FUE GENERADA
            <>
              <button ref={terminarRef} type="button" className="pos-modal-cancel"
                onClick={omitir} disabled={imprimiendo}>
                {impreso ? 'Cerrar' : 'No imprimir'}
              </button>
              
              {!impreso ? (
                <button type="button" className="pos-modal-submit"
                  onClick={handleImprimir} disabled={imprimiendo}>
                  {imprimiendo 
                    ? <><LoaderCircle size={18} className="pos-spin" /> Imprimiendo...</>
                    : <><Printer size={18}/> Imprimir Ticket</>
                  }
                </button>
              ) : (
                <button type="button" className="pos-modal-submit"
                  onClick={omitir}>
                  <BadgeCheck size={18} /> Entendido
                </button>
              )}
            </>
          ) : (
            // BOTONES ORIGINALES ANTES DE GENERAR
            <>
              <button ref={omitirRef} type="button" className="pos-modal-cancel"
                disabled={procesando} onClick={omitir}>No, omitir</button>
              <button type="submit" form="pos-form-factura" className="pos-modal-submit"
                disabled={procesando}>
                {procesando ? <><LoaderCircle size={18} className="pos-spin" /> Generando factura...</>
                  : <><FileText size={18}/> Sí, generar factura</>}
              </button>
            </>
          )}
        </footer>
      </section>
    </div>, document.body
  );
}