import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Printer, X } from 'lucide-react';

/** SD-114: decisión posterior a la venta. HU-0401 implementará la impresión real. */
export function PreguntaFacturaDialog({ abierto, onCerrar }) {
  const [informacionPendiente, setInformacionPendiente] = useState(false);
  const cancelarRef = useRef(null);
  const contenedorRef = useRef(null);
  const cerrarRef = useRef(onCerrar);
  cerrarRef.current = onCerrar;

  useEffect(() => {
    if (!abierto) return undefined;
    const anterior = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cancelarRef.current?.focus();
    function teclado(evento) {
      if (evento.key === 'Escape') { evento.preventDefault(); cerrarRef.current(); }
      if (evento.key !== 'Tab') return;
      const botones = [...(contenedorRef.current?.querySelectorAll('button:not(:disabled)') || [])];
      if (!botones.length) return;
      const primero = botones[0];
      const ultimo = botones[botones.length - 1];
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault(); ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault(); primero.focus();
      }
    }
    document.addEventListener('keydown', teclado);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', teclado);
      if (anterior?.isConnected) anterior.focus({ preventScroll: true });
    };
  }, [abierto]);

  useEffect(() => { if (!abierto) setInformacionPendiente(false); }, [abierto]);
  if (!abierto) return null;
  return createPortal(
    <div className="pos-modal-backdrop">
      <section ref={contenedorRef} role="dialog" aria-modal="true"
        aria-labelledby="pos-factura-title" aria-describedby="pos-factura-description"
        className="pos-modal pos-factura-modal">
        <header className="pos-modal-header">
          <div className="pos-modal-heading">
            <span className="pos-modal-icon"><FileText size={23} /></span>
            <div>
              <span className="pos-eyebrow">VENTA REGISTRADA</span>
              <h2 id="pos-factura-title">{informacionPendiente ? 'Facturación en desarrollo' : '¿Desea imprimir la factura?'}</h2>
              <p id="pos-factura-description">
                {informacionPendiente
                  ? 'La venta ya se guardó correctamente.'
                  : 'Puedes finalizar sin imprimir el comprobante.'}
              </p>
            </div>
          </div>
          <button type="button" className="pos-modal-close" aria-label="Cerrar" onClick={onCerrar}><X size={20}/></button>
        </header>
        <div className="pos-modal-content">
          {informacionPendiente ? (
            <p className="pos-invoice-info">La generación e impresión de facturas se implementará en HU-0401. No se ha creado ni impreso ninguna factura.</p>
          ) : (
            <p className="pos-invoice-info">La venta ya se registró. La opción de imprimir todavía está pendiente de HU-0401; por ahora puedes indicar que deseas factura, pero no se generará un documento.</p>
          )}
        </div>
        <footer className="pos-modal-footer">
          {informacionPendiente ? (
            <button type="button" ref={cancelarRef} className="pos-modal-submit" onClick={onCerrar}>Entendido</button>
          ) : (
            <>
              <button type="button" ref={cancelarRef} className="pos-modal-cancel" onClick={onCerrar}>No, terminar</button>
              <button type="button" className="pos-modal-submit" onClick={() => setInformacionPendiente(true)}><Printer size={18}/> Sí, deseo factura</button>
            </>
          )}
        </footer>
      </section>
    </div>, document.body
  );
}
