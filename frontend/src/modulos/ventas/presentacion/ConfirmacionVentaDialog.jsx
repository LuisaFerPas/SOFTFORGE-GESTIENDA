import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, BadgeCheck, Banknote, CircleAlert, CreditCard,
  LoaderCircle, ShieldCheck, Smartphone, WalletCards, X
} from 'lucide-react';

const formato = (valor) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0
}).format(Number(valor) || 0);

const METODOS = {
  EFECTIVO: { nombre: 'Efectivo', Icono: Banknote },
  NEQUI: { nombre: 'Nequi', Icono: Smartphone },
  OTRO: { nombre: 'Otro medio electrónico', Icono: CreditCard },
  MIXTO: { nombre: 'Efectivo + Nequi', Icono: WalletCards }
};

/** SD-114: última comprobación ANTES de registrar una venta. */
export function ConfirmacionVentaDialog({
  abierto,
  procesando,
  carrito,
  medioPago,
  total,
  montoRecibido,
  montoEfectivo,
  montoNequi,
  onCancelar,
  onConfirmar
}) {
  const dialogoRef = useRef(null);
  const botonCancelarRef = useRef(null);
  const enfoquePrevioRef = useRef(null);
  const cancelarRef = useRef(onCancelar);
  const procesandoRef = useRef(procesando);
  cancelarRef.current = onCancelar;
  procesandoRef.current = procesando;

  useEffect(() => {
    if (!abierto) return undefined;

    enfoquePrevioRef.current = document.activeElement;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    botonCancelarRef.current?.focus();

    function manejarTeclado(evento) {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        if (!procesandoRef.current) cancelarRef.current();
      }
      if (evento.key !== 'Tab') return;
      const elementos = Array.from(dialogoRef.current?.querySelectorAll(
        'button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex="-1"])'
      ) || []).filter((elemento) => elemento.getClientRects().length > 0);
      if (!elementos.length) {
        evento.preventDefault();
        return;
      }
      const primero = elementos[0];
      const ultimo = elementos[elementos.length - 1];
      if (evento.shiftKey && (document.activeElement === primero || !dialogoRef.current?.contains(document.activeElement))) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && (document.activeElement === ultimo || !dialogoRef.current?.contains(document.activeElement))) {
        evento.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener('keydown', manejarTeclado);
    return () => {
      document.removeEventListener('keydown', manejarTeclado);
      document.body.style.overflow = overflowAnterior;
      const anterior = enfoquePrevioRef.current;
      if (anterior?.isConnected && !anterior.disabled) anterior.focus({ preventScroll: true });
    };
  }, [abierto]);

  if (!abierto) return null;

  const metodo = METODOS[medioPago] ?? METODOS.EFECTIVO;
  const Icono = metodo.Icono;
  const cambio = Number(montoRecibido) - total;
  const unidades = carrito.reduce((suma, producto) => suma + producto.cantidad, 0);

  return createPortal(
    <div
      className="pos-modal-backdrop"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget && !procesando) onCancelar();
      }}
    >
      <section
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pos-modal-title"
        aria-describedby="pos-modal-description"
        className="pos-modal"
      >
        <header className="pos-modal-header">
          <div className="pos-modal-heading">
            <span className="pos-modal-icon"><ShieldCheck size={23} /></span>
            <div>
              <span className="pos-eyebrow">ÚLTIMA REVISIÓN · SD-114</span>
              <h2 id="pos-modal-title">¿Confirmas este cobro?</h2>
              <p id="pos-modal-description">Comprueba los productos y el pago antes de guardar.</p>
            </div>
          </div>
          <button className="pos-modal-close" type="button" aria-label="Cerrar revisión"
            onClick={onCancelar} disabled={procesando}><X size={21} /></button>
        </header>

        <div className="pos-modal-content">
          <div className="pos-modal-row-title">
            <strong>Productos de la venta</strong>
            <span>{unidades} unidad{unidades === 1 ? '' : 'es'}</span>
          </div>
          <div className="pos-modal-items">
            {carrito.map((producto) => (
              <div className="pos-modal-item" key={producto.id}>
                <div>
                  <strong>{producto.nombre}</strong>
                  <span>{producto.cantidad} × {formato(producto.precioVentaUnitario)}</span>
                </div>
                <b>{formato(Number(producto.precioVentaUnitario) * producto.cantidad)}</b>
              </div>
            ))}
          </div>

          <div className="pos-modal-total"><span>Total a cobrar</span><strong>{formato(total)}</strong></div>

          <div className="pos-modal-method">
            <span className="pos-modal-method-icon"><Icono size={21} /></span>
            <div><small>Medio de pago</small><strong>{metodo.nombre}</strong></div>
            <BadgeCheck size={20} color="#187c49" aria-label="Pago validado en el formulario" />
          </div>

          {medioPago === 'EFECTIVO' && (
            <div className="pos-modal-detail">
              <span>Recibido: <b>{formato(montoRecibido)}</b></span>
              <span>Cambio a entregar: <strong>{formato(cambio)}</strong></span>
            </div>
          )}
          {(medioPago === 'NEQUI' || medioPago === 'OTRO') && (
            <p className="pos-modal-verified"><ShieldCheck size={17} /> Confirmaste haber verificado la recepción del pago electrónico.</p>
          )}
          {medioPago === 'MIXTO' && (
            <>
              <div className="pos-modal-detail">
                <span>Efectivo: <b>{formato(montoEfectivo)}</b></span>
                <span>Nequi: <b>{formato(montoNequi)}</b></span>
              </div>
              <p className="pos-modal-verified"><ShieldCheck size={17} /> Confirmaste haber verificado la parte transferida.</p>
            </>
          )}
          <div className="pos-modal-caution"><CircleAlert size={18} /><span>Al confirmar, la venta se registrará y el inventario se actualizará. No pulses dos veces.</span></div>
        </div>

        <footer className="pos-modal-footer">
          <button type="button" ref={botonCancelarRef} className="pos-modal-cancel"
            onClick={onCancelar} disabled={procesando}><ArrowLeft size={17} /> Volver y corregir</button>
          <button type="button" className="pos-modal-submit"
            onClick={onConfirmar} disabled={procesando}>
            {procesando
              ? <><LoaderCircle size={19} className="pos-spin" /> Registrando...</>
              : <><BadgeCheck size={19} /> Sí, registrar venta</>}
          </button>
        </footer>
      </section>
    </div>,
    document.body
  );
}
