import { AlertCircle, ArrowRight, BadgeCheck, Banknote, CheckCircle2, CircleHelp, CreditCard, Lightbulb, LoaderCircle, ShieldCheck, Smartphone, WalletCards } from 'lucide-react';

const formato = (valor) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0
}).format(valor);

function cantidadValida(valor) {
  return valor !== '' && Number.isFinite(Number(valor)) && Number(valor) >= 0;
}

/** SD-113: panel visual de medios de pago. No realiza llamadas a la API. */
export function PanelCobro({
  total,
  medioPago,
  setMedioPago,
  montoRecibido,
  setMontoRecibido,
  montoEfectivo,
  setMontoEfectivo,
  montoNequi,
  setMontoNequi,
  transferenciaVerificada,
  setTransferenciaVerificada,
  deshabilitado = false,
  puedeRegistrar = false,
  procesando = false,
  ayudaCobro = ''
}) {
  const opciones = [
    { id: 'EFECTIVO', nombre: 'Efectivo', subtitulo: 'Billetes o monedas', Icono: Banknote },
    { id: 'NEQUI', nombre: 'Nequi', subtitulo: 'Transferencia', Icono: Smartphone },
    { id: 'OTRO', nombre: 'Otro', subtitulo: 'Otro pago electrónico', Icono: CreditCard },
    { id: 'MIXTO', nombre: 'Mixto', subtitulo: 'Efectivo + Nequi', Icono: WalletCards }
  ];

  const recibidoValido = cantidadValida(montoRecibido);
  const efectivo = cantidadValida(montoEfectivo) ? Number(montoEfectivo) : 0;
  const nequi = cantidadValida(montoNequi) ? Number(montoNequi) : 0;
  const sumaMixta = efectivo + nequi;
  const diferencia = total - sumaMixta;
  const cambio = recibidoValido && Number(montoRecibido) >= total
    ? Number(montoRecibido) - total : null;
  const falta = recibidoValido && Number(montoRecibido) < total
    ? total - Number(montoRecibido) : null;
  const mixtoCompleto = cantidadValida(montoEfectivo) && cantidadValida(montoNequi)
    && efectivo > 0 && nequi > 0 && Math.abs(diferencia) < 0.01;

  const sugeridos = [...new Set([total, 10000, 20000, 50000, 100000])]
    .filter((valor) => valor > 0 && valor >= total)
    .slice(0, 4);

  function seleccionarMedio(id) {
    if (deshabilitado) return;
    setMedioPago(id);
    setTransferenciaVerificada(false);
  }

  return (
    <section className="pos-payment" aria-labelledby="pos-payment-title">
      <div className="pos-section-head pos-section-head--compact">
        <div>
          <span className="pos-eyebrow">PASO 3 · COBRO</span>
          <h2 id="pos-payment-title">¿Cómo va a pagar?</h2>
          <p>Elige un medio de pago y completa los datos necesarios.</p>
        </div>
      </div>

      <div className="pos-methods" role="group" aria-label="Medio de pago">
        {opciones.map(({ id, nombre, subtitulo, Icono }) => (
          <button
            key={id}
            type="button"
            className={`pos-method ${medioPago === id ? 'pos-method--active' : ''}`}
            aria-pressed={medioPago === id}
            onClick={() => seleccionarMedio(id)}
            disabled={deshabilitado}
          >
            <span className="pos-method-icon"><Icono size={22} strokeWidth={1.9} /></span>
            <span className="pos-method-name">{nombre}</span>
            <span className="pos-method-sub">{subtitulo}</span>
            {medioPago === id && <CheckCircle2 className="pos-method-check" size={16} aria-hidden="true" />}
          </button>
        ))}
      </div>

      <div className="pos-payment-fields" key={medioPago}>
        {medioPago === 'EFECTIVO' && (
          <>
            <label className="pos-field-label" htmlFor="pos-recibido">¿Cuánto dinero entregó el cliente?</label>
            <div className={`pos-money-field ${falta !== null ? 'pos-money-field--invalid' : ''}`}>
              <span aria-hidden="true">$</span>
              <input
                id="pos-recibido"
                aria-invalid={falta !== null}
                aria-describedby={falta !== null ? 'pos-recibido-error' : undefined}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={montoRecibido}
                onChange={(e) => setMontoRecibido(e.target.value)}
                disabled={deshabilitado}
                placeholder="Ej. 20000"
                required
              />
            </div>
            <div className="pos-quick-amounts" aria-label="Montos rápidos">
              {sugeridos.map((valor) => (
                <button key={valor} type="button" disabled={deshabilitado}
                  onClick={() => setMontoRecibido(String(valor))}
                  className="pos-amount-chip">
                  {valor === total ? 'Pago exacto' : formato(valor)}
                </button>
              ))}
            </div>
            {cambio !== null && (
              <div className="pos-payment-feedback pos-payment-feedback--success" role="status">
                <CheckCircle2 size={19} />
                <span>Cambio a entregar</span>
                <strong>{formato(cambio)}</strong>
              </div>
            )}
            {falta !== null && (
              <div id="pos-recibido-error" className="pos-payment-feedback pos-payment-feedback--error" role="alert">
                <AlertCircle size={20} aria-hidden="true" />
                <div>
                  <strong>El monto recibido es insuficiente</strong>
                  <span>Faltan {formato(falta)}. Ingresa un valor mayor o utiliza «Pago exacto».</span>
                </div>
              </div>
            )}
          </>
        )}

        {(medioPago === 'NEQUI' || medioPago === 'OTRO') && (
          <div className="pos-transfer-box">
            <div className="pos-payment-info"><Smartphone size={21} />
              <span>El cliente debe pagar <strong>{formato(total)}</strong> mediante {medioPago === 'NEQUI' ? 'Nequi' : 'otro medio electrónico'}.</span>
            </div>
            <label className="pos-verify">
              <input type="checkbox" checked={transferenciaVerificada}
                onChange={(e) => setTransferenciaVerificada(e.target.checked)} disabled={deshabilitado} />
              <span><strong>Ya verifiqué que el pago fue recibido.</strong>
                <small>No basta con ver un pantallazo del pago.</small></span>
            </label>
          </div>
        )}

        {medioPago === 'MIXTO' && (
          <>
            <div className="pos-split-inputs">
              <div>
                <label className="pos-field-label" htmlFor="pos-monto-efectivo">Efectivo</label>
                <div className="pos-money-field">
                  <span aria-hidden="true">$</span>
                  <input id="pos-monto-efectivo" type="number" inputMode="decimal"
                    min="0" step="0.01" placeholder="Ej. 5000" required
                    value={montoEfectivo} disabled={deshabilitado}
                    onChange={(e) => setMontoEfectivo(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="pos-field-label" htmlFor="pos-monto-nequi">Nequi</label>
                <div className="pos-money-field">
                  <span aria-hidden="true">$</span>
                  <input id="pos-monto-nequi" type="number" inputMode="decimal"
                    min="0" step="0.01" placeholder="Ej. 5000" required
                    value={montoNequi} disabled={deshabilitado}
                    onChange={(e) => setMontoNequi(e.target.value)} />
                </div>
              </div>
            </div>
            <div className={`pos-payment-feedback ${mixtoCompleto ? 'pos-payment-feedback--success' : 'pos-payment-feedback--neutral'}`} role="status">
              <span>{mixtoCompleto ? 'Monto cubierto correctamente' : diferencia > 0 ? 'Falta por completar' : diferencia < 0 ? 'Monto excedente' : 'Ingresa valores en ambos medios'}</span>
              {(mixtoCompleto || Math.abs(diferencia) >= 0.01) && <strong>{formato(mixtoCompleto ? sumaMixta : Math.abs(diferencia))}</strong>}
            </div>
            <label className="pos-verify">
              <input type="checkbox" checked={transferenciaVerificada}
                onChange={(e) => setTransferenciaVerificada(e.target.checked)} disabled={deshabilitado} />
              <span><strong>Ya verifiqué la parte de Nequi en la cuenta.</strong>
                <small>Confirma la recepción antes de registrar.</small></span>
            </label>
          </>
        )}
      </div>

      <p className={`pos-checkout-hint ${puedeRegistrar ? 'pos-checkout-hint--ready' : ''}`} role="status">
        {puedeRegistrar ? <BadgeCheck size={17} /> : <Lightbulb size={17} />}
        {ayudaCobro}
      </p>
      <button type="submit" className="pos-confirm-button" disabled={!puedeRegistrar || procesando}>
        {procesando ? <><LoaderCircle className="pos-spin" size={20} /> Registrando venta...</>
          : <>Confirmar pago <ArrowRight size={21} /></>}
      </button>
      <p className="pos-secure-note"><ShieldCheck size={15} /> Revisarás un resumen antes de guardar la venta.</p>

      <details className="pos-help-inline">
        <summary><CircleHelp size={16} /> ¿Qué debo verificar antes de cobrar?</summary>
        <p>Revisa el total y las cantidades. En efectivo, comprueba el dinero recibido y el cambio; para Nequi, confirma el movimiento en la cuenta. El registro de ventas descontará el inventario.</p>
      </details>
    </section>
  );
}
