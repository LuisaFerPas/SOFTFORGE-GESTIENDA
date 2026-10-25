import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ArrowDown, ArrowLeft, ArrowRight, BadgeCheck,
  CircleHelp, Keyboard, Lightbulb, LoaderCircle, Minus, PackageSearch,
  Plus, RotateCcw, Search, ShieldCheck, ShoppingBag, ShoppingCart,
  Trash2, X
} from 'lucide-react';
import { listarProductosApi } from '../../inventario/servicios/inventarioService';
import { registrarVenta } from '../servicios/ventasService';
import { PanelCobro } from './componentes/PanelCobro';
import { ConfirmacionVentaDialog } from './ConfirmacionVentaDialog';
import { PreguntaFacturaDialog } from './PreguntaFacturaDialog';
import './VentasPage.css';

const formato = (valor) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0
}).format(Number(valor) || 0);

const normalizar = (valor) => String(valor ?? '')
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim();

const esPositivo = (valor) => valor !== '' && Number.isFinite(Number(valor)) && Number(valor) > 0;
const montoValido = (valor) => valor !== '' && Number.isFinite(Number(valor)) && Number(valor) >= 0;

function desplazarA(elemento) {
  if (!elemento) return;
  const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  elemento.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' });
}

/** SD-113: experiencia POS. La persistencia sigue a cargo de registrarVenta(). */
export function VentasPage() {
  const [productos, setProductos] = useState([]);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [carrito, setCarrito] = useState([]);
  const [medioPago, setMedioPago] = useState('EFECTIVO');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [montoEfectivo, setMontoEfectivo] = useState('');
  const [montoNequi, setMontoNequi] = useState('');
  const [transferenciaVerificada, setTransferenciaVerificada] = useState(false);
  const [error, setError] = useState('');
  const [confirmacion, setConfirmacion] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [preguntarFactura, setPreguntarFactura] = useState(false);
  const envioEnCursoRef = useRef(false);
  const [ayudaAbierta, setAyudaAbierta] = useState(false);
  const [aviso, setAviso] = useState('');

  const buscadorRef = useRef(null);
  const carritoRef = useRef(null);
  const pagoRef = useRef(null);
  const exitoRef = useRef(null);
  const errorRef = useRef(null);

  useEffect(() => {
    let activo = true;
    listarProductosApi()
      .then((respuesta) => {
        if (activo) setProductos(Array.isArray(respuesta.data) ? respuesta.data : []);
      })
      .catch((err) => {
        if (activo) setError(`No se pudo cargar el catálogo: ${err.message}`);
      })
      .finally(() => { if (activo) setCargandoCatalogo(false); });
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    function alPresionar(evento) {
      if ((evento.key === '/' || evento.key === 'F2') && !evento.ctrlKey && !evento.metaKey && !evento.altKey) {
        const etiqueta = evento.target?.tagName;
        const escribiendo = ['INPUT', 'TEXTAREA', 'SELECT'].includes(etiqueta) || evento.target?.isContentEditable;
        if (!escribiendo || evento.key === 'F2') {
          evento.preventDefault();
          buscadorRef.current?.focus();
        }
      }
    }
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, []);

  useEffect(() => {
    if (!aviso) return undefined;
    const temporizador = window.setTimeout(() => setAviso(''), 2600);
    return () => window.clearTimeout(temporizador);
  }, [aviso]);

  useEffect(() => {
    if (confirmacion) {
      requestAnimationFrame(() => {
        desplazarA(exitoRef.current);
        exitoRef.current?.focus({ preventScroll: true });
      });
    }
  }, [confirmacion]);

  const encontrados = useMemo(() => {
    const termino = normalizar(busqueda);
    return productos.filter((producto) => normalizar([
      producto.nombre, producto.codigoInterno, producto.codigoBarras
    ].join(' ')).includes(termino));
  }, [productos, busqueda]);

  const visibles = mostrarTodos || busqueda.trim() ? encontrados.slice(0, 40) : encontrados.slice(0, 12);
  const unidades = carrito.reduce((suma, item) => suma + item.cantidad, 0);
  const total = carrito.reduce((suma, item) => suma + Number(item.precioVentaUnitario) * item.cantidad, 0);
  const precioValido = Number.isFinite(total) && total > 0;
  const efectivoValido = montoValido(montoRecibido) && Number(montoRecibido) >= total;
  const mixtoValido = esPositivo(montoEfectivo) && esPositivo(montoNequi)
    && Math.abs(Number(montoEfectivo) + Number(montoNequi) - total) < 0.01;
  const pagoValido = medioPago === 'EFECTIVO' ? efectivoValido
    : (medioPago === 'NEQUI' || medioPago === 'OTRO') ? transferenciaVerificada
      : mixtoValido && transferenciaVerificada;
  const puedeRegistrar = carrito.length > 0 && precioValido && pagoValido && !cargando;

  let ayudaCobro = 'Agrega productos para comenzar.';
  if (carrito.length > 0) {
    if (medioPago === 'EFECTIVO' && !efectivoValido) {
      ayudaCobro = montoValido(montoRecibido) && Number(montoRecibido) < total
        ? 'El monto recibido es insuficiente. Ingresa un valor igual o superior al total.'
        : 'Ingresa un monto recibido igual o superior al total.';
    }
    else if ((medioPago === 'NEQUI' || medioPago === 'OTRO') && !transferenciaVerificada) ayudaCobro = 'Verifica el pago electrónico en la cuenta y marca la casilla.';
    else if (medioPago === 'MIXTO' && !mixtoValido) ayudaCobro = 'Los dos montos deben ser positivos y sumar el total exacto.';
    else if (medioPago === 'MIXTO' && !transferenciaVerificada) ayudaCobro = 'Verifica la transferencia y marca la casilla.';
    else ayudaCobro = 'Todo listo. Revisa el resumen y registra la venta.';
  }

  function agregar(producto) {
    if (cargando || !producto) return;
    if (!Number.isFinite(Number(producto.precioVentaUnitario)) || Number(producto.precioVentaUnitario) <= 0) {
      setError(`El producto «${producto.nombre}» no tiene un precio de venta válido.`);
      return;
    }
    setCarrito((actual) => actual.some((item) => item.id === producto.id)
      ? actual.map((item) => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item)
      : [...actual, { ...producto, cantidad: 1 }]);
    setConfirmacion(null);
    setError('');
    setAviso(`${producto.nombre} agregado al carrito`);
    if (carrito.length === 0 && window.matchMedia?.('(max-width: 800px)').matches) {
      requestAnimationFrame(() => desplazarA(carritoRef.current));
    }
  }

  function cambiarCantidad(id, valor) {
    const cantidad = Number(valor);
    if (!Number.isSafeInteger(cantidad) || cantidad < 1 || cargando) return;
    setCarrito((anterior) => anterior.map((item) => item.id === id ? { ...item, cantidad } : item));
  }

  function eliminar(id) {
    if (cargando) return;
    setCarrito((actual) => actual.filter((item) => item.id !== id));
    setAviso('Producto quitado del carrito');
  }

  function limpiarCarrito() {
    if (cargando || !carrito.length) return;
    if (!window.confirm('¿Vaciar el carrito? Se eliminarán los productos de esta venta.')) return;
    setCarrito([]);
    setMontoRecibido('');
    setMontoEfectivo('');
    setMontoNequi('');
    setTransferenciaVerificada(false);
    setError('');
    setAviso('Carrito vacío');
  }

  function buscarConEnter(evento) {
    if (evento.key !== 'Enter' || !busqueda.trim()) return;
    evento.preventDefault();
    const termino = normalizar(busqueda);
    const exacto = encontrados.find((p) =>
      normalizar(p.codigoInterno) === termino || normalizar(p.codigoBarras) === termino);
    if (exacto || encontrados.length === 1) {
      agregar(exacto || encontrados[0]);
      setBusqueda('');
    } else if (encontrados.length > 1) {
      setAviso('Selecciona uno de los productos encontrados.');
    }
  }

  function irACobrar() {
    desplazarA(pagoRef.current);
    requestAnimationFrame(() => {
      const objetivo = pagoRef.current?.querySelector('.pos-method--active');
      objetivo?.focus({ preventScroll: true });
    });
  }

  // SD-114: primero revisar; registrar únicamente tras confirmación explícita.
  function finalizar(evento) {
    evento.preventDefault();
    if (cargando || envioEnCursoRef.current) return;

    setError('');
    if (!puedeRegistrar) {
      setError(ayudaCobro);
      requestAnimationFrame(() => desplazarA(pagoRef.current));
      return;
    }
    setDialogoAbierto(true);
  }

  async function confirmarRegistro() {
    if (envioEnCursoRef.current || cargando || !puedeRegistrar || !dialogoAbierto) return;

    // Evita dobles clics incluso antes de que React actualice el estado.
    envioEnCursoRef.current = true;
    setCargando(true);
    setError('');

    try {
      const payload = {
        items: carrito.map(({ id, cantidad, precioVentaUnitario }) => ({
          productoId: id, cantidad, precioUnitario: Number(precioVentaUnitario)
        })),
        medioPago,
        ...(medioPago === 'EFECTIVO' ? { montoRecibido: Number(montoRecibido) } : {}),
        ...(medioPago === 'MIXTO' ? {
          montoEfectivo: Number(montoEfectivo), montoNequi: Number(montoNequi)
        } : {})
      };

      // Una sola llamada HTTP al confirmar, nunca al abrir el resumen.
      const respuesta = await registrarVenta(payload);
      if (!respuesta?.data) {
        throw new Error('El servidor no devolvió la confirmación de la venta.');
      }

      setConfirmacion({
        ...respuesta.data,
        medioPago,
        cambio: respuesta.data.cambio ??
          (medioPago === 'EFECTIVO' ? Number(montoRecibido) - total : 0)
      });
      setDialogoAbierto(false);
      setPreguntarFactura(true); // SD-114: preguntar tras la venta exitosa, sin imprimir hasta HU-0401.
      setCarrito([]);
      setBusqueda('');
      setMontoRecibido('');
      setMontoEfectivo('');
      setMontoNequi('');
      setTransferenciaVerificada(false);
      setMedioPago('EFECTIVO');
      setAviso('Venta registrada correctamente');
    } catch (err) {
      // Conservar el carrito y los montos para que el cajero pueda corregir.
      setDialogoAbierto(false);
      const mensaje = err.message || 'No se pudo confirmar el registro de la venta.';
      const posibleCorteDeRed = /failed to fetch|network|conexi[oó]n|timeout|tiempo de espera/i.test(mensaje);
      setError(posibleCorteDeRed
        ? 'No se recibió una respuesta del servidor. La venta podría haberse guardado: verifica los registros antes de volver a intentar el cobro.'
        : mensaje);
      requestAnimationFrame(() => desplazarA(errorRef.current));
    } finally {
      envioEnCursoRef.current = false;
      setCargando(false);
    }
  }

  return (
    <div className="pos">
      <header className="pos-page-header">
        <div>
          <div className="pos-page-eyebrow"><span className="pos-status-dot" /> MÓDULO DE VENTAS</div>
          <h1>Punto de venta</h1>
          <p>Busca productos, revisa el pedido y cobra en pocos pasos.</p>
        </div>
        <button type="button" className="pos-help-button" aria-expanded={ayudaAbierta}
          onClick={() => setAyudaAbierta((actual) => !actual)}>
          <CircleHelp size={18} /> {ayudaAbierta ? 'Ocultar ayuda' : '¿Cómo usarlo?'}
        </button>
      </header>

      <div className="pos-progress" aria-label="Pasos para registrar una venta">
        <span className="pos-progress-step pos-progress-step--active"><span>1</span> Elige productos</span>
        <ArrowRight size={15} aria-hidden="true" />
        <span className={`pos-progress-step ${carrito.length ? 'pos-progress-step--active' : ''}`}><span>2</span> Revisa el carrito</span>
        <ArrowRight size={15} aria-hidden="true" />
        <span className={`pos-progress-step ${puedeRegistrar ? 'pos-progress-step--active' : ''}`}><span>3</span> Cobra la venta</span>
      </div>

      {ayudaAbierta && (
        <section className="pos-guide" aria-label="Guía de uso">
          <div className="pos-guide-icon"><Lightbulb size={22} /></div>
          <div className="pos-guide-text">
            <strong>Guía rápida para el cajero</strong>
            <p><b>1.</b> Escribe un nombre o código y pulsa un producto. <b>2.</b> Ajusta las cantidades. <b>3.</b> Elige el pago, verifica el dinero y confirma.</p>
            <p className="pos-guide-shortcut"><Keyboard size={15} /> Atajo: pulsa <kbd>F2</kbd> o <kbd>/</kbd> para volver al buscador.</p>
          </div>
          <button type="button" className="pos-icon-button" aria-label="Cerrar guía" onClick={() => setAyudaAbierta(false)}><X size={18} /></button>
        </section>
      )}

      {error && (
        <section ref={errorRef} className="pos-notice pos-notice--error" role="alert">
          <AlertCircle size={21} /> <div><strong>Revisa esta información</strong><p>{error}</p></div>
          <button type="button" onClick={() => setError('')} aria-label="Cerrar error"><X size={18} /></button>
        </section>
      )}

      {confirmacion && (
        <section ref={exitoRef} tabIndex={-1} className="pos-success" role="status">
          <div className="pos-success-icon"><BadgeCheck size={28} /></div>
          <div className="pos-success-text">
            <strong>¡Venta #{confirmacion.id} registrada!</strong>
            <p>Pago de <b>{formato(confirmacion.total)}</b> registrado por <b>{confirmacion.medioPago === 'EFECTIVO' ? 'efectivo' : confirmacion.medioPago === 'NEQUI' ? 'Nequi' : confirmacion.medioPago === 'OTRO' ? 'otro medio electrónico' : 'pago mixto'}</b>.</p>
            {confirmacion.medioPago === 'EFECTIVO' && Number(confirmacion.cambio) > 0 && (
              <p className="pos-success-change">Cambio para entregar: <strong>{formato(confirmacion.cambio)}</strong></p>
            )}
            <p>Puedes comenzar otra venta.</p>
            {confirmacion.advertencias?.map((a) => (
              <p key={a.productoId} className="pos-stock-alert">Aviso de inventario: {a.nombre} — {a.mensaje}</p>
            ))}
          </div>
          <button type="button" className="pos-link-action" onClick={() => {
            setConfirmacion(null);
            desplazarA(buscadorRef.current);
            buscadorRef.current?.focus({ preventScroll: true });
          }}>Nueva venta <ArrowRight size={17} /></button>
        </section>
      )}

      <div className="pos-workspace">
        <section className="pos-card pos-catalog" aria-labelledby="pos-catalogo-titulo">
          <div className="pos-section-head">
            <div>
              <span className="pos-eyebrow">PASO 1 · PRODUCTOS</span>
              <h2 id="pos-catalogo-titulo"><PackageSearch size={22} /> Buscar y agregar</h2>
              <p>Encuentra el producto y agrégalo con un clic.</p>
            </div>
            <span className="pos-small-count">{productos.length} productos</span>
          </div>
          <div className="pos-search-wrapper">
            <Search size={21} aria-hidden="true" />
            <input
              ref={buscadorRef}
              type="search"
              aria-label="Buscar producto por nombre, código interno o código de barras"
              placeholder="Buscar por nombre o código..."
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setMostrarTodos(false); }}
              onKeyDown={buscarConEnter}
              autoComplete="off"
            />
            {busqueda && <button type="button" className="pos-search-clear" onClick={() => { setBusqueda(''); buscadorRef.current?.focus(); }} aria-label="Limpiar búsqueda"><X size={18} /></button>}
            <span className="pos-search-shortcut" aria-hidden="true">F2</span>
          </div>
          <div className="pos-search-hint"><Lightbulb size={15} /> Con un código exacto, pulsa <kbd>Enter</kbd> para agregar al carrito.</div>

          <div className="pos-catalog-heading">
            <h3>{busqueda ? `Resultados de «${busqueda}»` : 'Productos disponibles'}</h3>
            <span>{encontrados.length} coincidencia{encontrados.length === 1 ? '' : 's'}</span>
          </div>

          {cargandoCatalogo ? (
            <div className="pos-empty"><LoaderCircle className="pos-spin" size={25} /><p>Cargando productos...</p></div>
          ) : encontrados.length === 0 ? (
            <div className="pos-empty"><PackageSearch size={30} /><strong>No encontramos productos</strong><p>Prueba otro nombre o revisa el código.</p></div>
          ) : (
            <div className="pos-product-grid">
              {visibles.map((producto) => {
                const enCarrito = carrito.find((item) => item.id === producto.id)?.cantidad || 0;
                return (
                  <button key={producto.id} className="pos-product" type="button" disabled={cargando}
                    onClick={() => agregar(producto)} aria-label={`Agregar ${producto.nombre}, ${formato(producto.precioVentaUnitario)}, al carrito`}>
                    <div className="pos-product-top">
                      <span className="pos-product-icon"><ShoppingBag size={20} /></span>
                      <span className="pos-product-add"><Plus size={19} /></span>
                    </div>
                    <strong className="pos-product-name">{producto.nombre}</strong>
                    <span className="pos-product-code">{producto.codigoInterno || 'Producto'}</span>
                    <div className="pos-product-bottom"><b>{formato(producto.precioVentaUnitario)}</b>{enCarrito > 0 && <span className="pos-in-cart">{enCarrito} en carrito</span>}</div>
                  </button>
                );
              })}
            </div>
          )}
          {!busqueda && encontrados.length > 12 && (
            <button type="button" className="pos-show-more" onClick={() => setMostrarTodos((actual) => !actual)}>
              {mostrarTodos ? 'Mostrar menos' : `Ver más productos (${encontrados.length})`} <ArrowDown size={16} />
            </button>
          )}
          {encontrados.length > visibles.length && busqueda && (
            <p className="pos-small-tip">Se muestran los primeros {visibles.length} resultados. Escribe un término más específico.</p>
          )}
          <div className="pos-catalog-footer">
            <span><ShieldCheck size={16} /> Puedes registrar una venta aunque un producto no tenga existencias; se mostrará una advertencia.</span>
            {carrito.length > 0 && <button type="button" onClick={irACobrar}>Ir al cobro <ArrowRight size={16} /></button>}
          </div>
        </section>

        <form className="pos-checkout" onSubmit={finalizar}>
          <section className="pos-card pos-cart" ref={carritoRef} aria-labelledby="pos-cart-title">
            <div className="pos-section-head pos-section-head--compact">
              <div>
                <span className="pos-eyebrow">PASO 2 · RESUMEN</span>
                <h2 id="pos-cart-title"><ShoppingCart size={22} /> Tu carrito</h2>
              </div>
              <span className="pos-cart-count">{unidades} unidad{unidades === 1 ? '' : 'es'}</span>
            </div>
            {carrito.length === 0 ? (
              <div className="pos-cart-empty">
                <div><ShoppingCart size={29} /></div>
                <strong>Aún no hay productos</strong>
                <p>Busca un producto y pulsa su tarjeta para añadirlo.</p>
                <button type="button" onClick={() => { desplazarA(buscadorRef.current); buscadorRef.current?.focus({ preventScroll: true }); }}>
                  <Search size={16} /> Buscar productos
                </button>
              </div>
            ) : (
              <>
                <div className="pos-cart-list">
                  {carrito.map((item) => (
                    <div className="pos-cart-item" key={item.id}>
                      <div className="pos-cart-item-top">
                        <div><strong>{item.nombre}</strong><small>{formato(item.precioVentaUnitario)} / unidad</small></div>
                        <button type="button" className="pos-trash" disabled={cargando} title={`Quitar ${item.nombre}`}
                          aria-label={`Quitar ${item.nombre} del carrito`} onClick={() => eliminar(item.id)}><Trash2 size={18} /></button>
                      </div>
                      <div className="pos-cart-item-bottom">
                        <div className="pos-quantity" aria-label={`Cantidad de ${item.nombre}`}>
                          <button type="button" disabled={cargando || item.cantidad <= 1}
                            aria-label={`Disminuir cantidad de ${item.nombre}`} onClick={() => cambiarCantidad(item.id, item.cantidad - 1)}><Minus size={16} /></button>
                          <input type="number" inputMode="numeric" min="1" step="1"
                            aria-label={`Cantidad de ${item.nombre}`} disabled={cargando}
                            value={item.cantidad} onChange={(e) => cambiarCantidad(item.id, e.target.value)} />
                          <button type="button" disabled={cargando}
                            aria-label={`Aumentar cantidad de ${item.nombre}`} onClick={() => cambiarCantidad(item.id, item.cantidad + 1)}><Plus size={16} /></button>
                        </div>
                        <strong>{formato(item.cantidad * item.precioVentaUnitario)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" className="pos-clear-cart" onClick={limpiarCarrito} disabled={cargando}>
                  <RotateCcw size={15} /> Vaciar carrito
                </button>
              </>
            )}
            <div className="pos-total-box"><span>Total a pagar</span><strong>{formato(total)}</strong></div>
            {carrito.length > 0 && (
              <button className="pos-jump-to-pay" type="button" onClick={irACobrar}>
                Continuar al cobro <ArrowDown size={18} />
              </button>
            )}
          </section>

          <section className="pos-card pos-checkout-card" ref={pagoRef}>
            <PanelCobro
              total={total}
              medioPago={medioPago}
              setMedioPago={setMedioPago}
              montoRecibido={montoRecibido}
              setMontoRecibido={setMontoRecibido}
              montoEfectivo={montoEfectivo}
              setMontoEfectivo={setMontoEfectivo}
              montoNequi={montoNequi}
              setMontoNequi={setMontoNequi}
              transferenciaVerificada={transferenciaVerificada}
              setTransferenciaVerificada={setTransferenciaVerificada}
              deshabilitado={cargando || carrito.length === 0}
              puedeRegistrar={puedeRegistrar}
              procesando={cargando}
              ayudaCobro={ayudaCobro}
            />
          </section>
          <button type="button" className="pos-back-search" onClick={() => { desplazarA(buscadorRef.current); buscadorRef.current?.focus({ preventScroll: true }); }}>
            <ArrowLeft size={16} /> Volver a buscar productos
          </button>
        </form>
      </div>
      <ConfirmacionVentaDialog
        abierto={dialogoAbierto}
        procesando={cargando}
        carrito={carrito}
        medioPago={medioPago}
        total={total}
        montoRecibido={montoRecibido}
        montoEfectivo={montoEfectivo}
        montoNequi={montoNequi}
        onCancelar={() => { if (!cargando) setDialogoAbierto(false); }}
        onConfirmar={confirmarRegistro}
      />
      <PreguntaFacturaDialog abierto={preguntarFactura}
        onCerrar={() => setPreguntarFactura(false)}
      />
      <div className="pos-announcer" role="status" aria-live="polite" aria-atomic="true">{aviso}</div>
    </div>
  );
}
