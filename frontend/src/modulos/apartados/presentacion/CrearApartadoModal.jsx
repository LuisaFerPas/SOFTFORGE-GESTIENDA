import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, BadgeCheck, Check, CircleHelp, LoaderCircle, Minus,
  Package, Plus, RefreshCw, Search, ShoppingBasket, Trash2, UserRound
} from 'lucide-react';
import { listarProductosApi } from '../../inventario/servicios/inventarioService';
import { buscarProductoPorCodigo } from '../../ventas/servicios/ventasService';
import { InputCodigoBarras } from '../../ventas/presentacion/componentes/InputCodigoBarras';
import { crearApartado } from '../servicios/apartadosService';
import {
  agregarAlApartado, ajustarCantidadApartado, buscarEnCatalogo,
  dineroApartados, productoCatalogo, resumenApartado
} from './apartadosCarrito.js';
import './apartadosCatalogo.css';

/** Nuevo Apartado: experiencia de catálogo y carrito, sin alterar el contrato POST /apartados. */
export function CrearApartadoModal({ onCreado }) {
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [catalogo, setCatalogo] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [consulta, setConsulta] = useState('');
  const [limite, setLimite] = useState(12);
  const [escanerVisible, setEscanerVisible] = useState(false);
  const [abonoInicial, setAbonoInicial] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorCatalogo, setErrorCatalogo] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [exito, setExito] = useState(null);
  const [ayudaAbierta, setAyudaAbierta] = useState(false);
  const [revision, setRevision] = useState(0);
  const campoBusquedaRef = useRef(null);
  const enviandoRef = useRef(false);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setErrorCatalogo('');
    listarProductosApi()
      .then((respuesta) => {
        if (!vigente) return;
        const lista = Array.isArray(respuesta?.data) ? respuesta.data : [];
        setCatalogo(lista.map(productoCatalogo));
      })
      .catch((e) => { if (vigente) setErrorCatalogo(e?.message || 'No se pudo cargar el catálogo.'); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [revision]);

  useEffect(() => {
    function atajo(evento) {
      if (evento.key !== 'F2' || evento.altKey || evento.ctrlKey || evento.metaKey) return;
      evento.preventDefault();
      campoBusquedaRef.current?.focus();
    }
    window.addEventListener('keydown', atajo);
    return () => window.removeEventListener('keydown', atajo);
  }, []);

  const encontrados = useMemo(() => buscarEnCatalogo(catalogo, consulta), [catalogo, consulta]);
  const visibles = encontrados.slice(0, limite);
  const resumen = useMemo(() => resumenApartado(carrito, abonoInicial), [carrito, abonoInicial]);
  const abonoNumero = Number(abonoInicial);
  const abonoCorrecto = String(abonoInicial).trim() !== '' && Number.isFinite(abonoNumero) &&
    abonoNumero > 0 && abonoNumero <= resumen.total;
  const puedeCrear = clienteNombre.trim().length > 0 && clienteNombre.trim().length <= 150 &&
    carrito.length > 0 && abonoCorrecto && !guardando;

  function agregar(producto, cantidad = 1) {
    if (guardando) return;
    try {
      const siguiente = agregarAlApartado(carrito, producto, cantidad);
      setCarrito(siguiente);
      setError('');
      setMensaje(`${producto.nombre} agregado al apartado.`);
    } catch (e) {
      setError(e.message);
      setMensaje('');
    }
  }

  function cambiarCantidad(id, cantidad) {
    try {
      setCarrito(ajustarCantidadApartado(carrito, id, cantidad));
      setError('');
    } catch (e) { setError(e.message); }
  }

  async function escanear(codigo) {
    const enCatalogo = catalogo.find((p) =>
      (p.codigoInterno && p.codigoInterno.toLowerCase() === codigo.toLowerCase()) ||
      (p.codigoBarras && p.codigoBarras === codigo));
    let producto = enCatalogo;
    if (!producto) {
      const respuesta = await buscarProductoPorCodigo(codigo);
      producto = respuesta?.data;
    }
    if (!producto) throw new Error('No encontramos ese código en inventario.');
    // Se usa la función pura para avisar al lector si hay error de cantidad/stock.
    const actualizado = agregarAlApartado(carrito, producto);
    setCarrito(actualizado);
    setError('');
    setMensaje(`${producto.nombre} agregado desde el lector.`);
  }

  async function registrar(evento) {
    evento.preventDefault();
    if (enviandoRef.current) return;
    setError('');
    if (!puedeCrear) {
      setError('Revisa el nombre del cliente, los productos y el abono inicial.');
      return;
    }
    enviandoRef.current = true;
    setGuardando(true);
    try {
      const respuesta = await crearApartado({
        clienteNombre: clienteNombre.trim(),
        clienteTelefono: clienteTelefono.trim() || null,
        abonoInicial: abonoNumero,
        productos: carrito.map((p) => ({productoId: p.id, cantidad: p.cantidad}))
      });
      setExito(respuesta.data);
      setClienteNombre('');
      setClienteTelefono('');
      setCarrito([]);
      setAbonoInicial('');
    } catch (e) {
      const texto = e?.message || 'No se pudo registrar el apartado.';
      setError(/failed to fetch|no hay conexi[oó]n|network/i.test(texto)
        ? 'No se recibió respuesta. Antes de intentar de nuevo, revisa si el apartado quedó guardado en Apartados activos.'
        : texto);
    } finally {
      enviandoRef.current = false;
      setGuardando(false);
    }
  }

  if (exito) return (
    <section className="apv-success" role="status">
      <BadgeCheck size={48} aria-hidden="true" />
      <h2>¡Apartado registrado!</h2>
      <p>El apartado <strong>{exito.codigo || `#${exito.id}`}</strong> quedó guardado y los productos se reservaron.</p>
      <div className="apv-success-actions">
        <button type="button" className="apv-primary" onClick={() => onCreado?.()}>Ver apartados activos</button>
        <button type="button" className="apv-secondary" onClick={() => {
          setExito(null); setRevision((v) => v + 1); setMensaje('');
        }}>Crear otro apartado</button>
      </div>
    </section>
  );

  return (
    <section className="apv-page" aria-labelledby="apv-titulo">
      <div className="apv-head">
        <div><span className="apv-kicker">NUEVA RESERVA · DON MATI</span>
          <h2 id="apv-titulo">Registrar nuevo apartado</h2>
          <p>Elige productos como en Ventas, ajusta cantidades y registra el abono inicial.</p>
        </div>
        <button className="apv-help" type="button" aria-expanded={ayudaAbierta}
          onClick={() => setAyudaAbierta((v) => !v)}><CircleHelp size={18} /> ¿Cómo funciona?</button>
      </div>
      {ayudaAbierta && <div className="apv-guide" role="note">
        <strong>En tres pasos:</strong> 1. Agrega productos desde las tarjetas, el buscador o la pistola USB.
        2. Ajusta las cantidades sin superar las existencias disponibles.
        3. Escribe el cliente y el abono; al confirmar se reservan las unidades en inventario.
      </div>}
      {error && <div className="apv-alert" role="alert"><AlertCircle size={19} />{error}
        <button type="button" onClick={() => setError('')}>Cerrar</button></div>}
      {mensaje && !error && <p className="apv-flash" role="status"><Check size={16} />{mensaje}</p>}

      <form onSubmit={registrar} className="apv-workspace">
        <div className="apv-left">
          <div className="apv-panel apv-catalog">
            <div className="apv-panel-header">
              <div><span className="apv-kicker">PASO 1 · PRODUCTOS</span>
                <h3><ShoppingBasket size={22} /> Buscar y agregar</h3>
                <p>{catalogo.length} productos cargados · Pulsa <kbd>F2</kbd> para buscar</p>
              </div>
              <button type="button" className="apv-reload" onClick={() => setRevision((v) => v + 1)}
                disabled={cargando || guardando} aria-label="Recargar productos"><RefreshCw size={18}/></button>
            </div>
            <div className="apv-search"><Search size={21} />
              <input ref={campoBusquedaRef} type="search" value={consulta} maxLength={100}
                onChange={(e) => {setConsulta(e.target.value);setLimite(12);}}
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                placeholder="Buscar por nombre, código o categoría" aria-label="Buscar productos para apartar" />
            </div>
            <details className="apv-scan" onToggle={(e) => setEscanerVisible(e.currentTarget.open)}><summary>¿Tienes lector de códigos de barras?</summary>
              {escanerVisible && <InputCodigoBarras onBuscar={escanear} deshabilitado={guardando} />}
            </details>
            {cargando && <div className="apv-catalog-message" role="status"><LoaderCircle size={20} /> Cargando catálogo...</div>}
            {errorCatalogo && <div className="apv-alert" role="alert"><AlertCircle size={18}/>
              <span>{errorCatalogo}</span><button type="button" onClick={() => setRevision((v) => v + 1)}>Reintentar</button>
            </div>}
            {!cargando && !errorCatalogo && <>
              <div className="apv-results-line"><b>Productos disponibles</b><span>{encontrados.length} coincidencias</span></div>
              {encontrados.length === 0 ? <div className="apv-empty">
                <Package size={32}/><strong>Sin coincidencias</strong>
                <p>Prueba con otra palabra o comprueba el código del producto.</p>
              </div> : <div className="apv-products">
                {visibles.map((producto) => {
                  const apartado = carrito.find((p) => p.id === producto.id)?.cantidad ?? 0;
                  const restantes = producto.stockActual === null ? null : producto.stockActual - apartado;
                  const disponible = (restantes === null || restantes > 0) && producto.precioVentaUnitario > 0;
                  return <article key={producto.id} className="apv-product">
                    <div className="apv-product-top"><span className="apv-product-icon"><ShoppingBasket size={19}/></span>
                      <button type="button" className="apv-add" aria-label={`Agregar ${producto.nombre}`}
                        disabled={!disponible || guardando} onClick={() => agregar(producto)}><Plus size={20}/></button></div>
                    <h4 title={producto.nombre}>{producto.nombre}</h4>
                    <p className="apv-product-code">{producto.codigoInterno || producto.codigoBarras || 'Sin código'}</p>
                    <div className="apv-product-bottom"><strong>{dineroApartados(producto.precioVentaUnitario)}</strong>
                      <span className={disponible ? 'apv-stock' : 'apv-stock apv-stock--none'}>
                        {restantes === null ? 'Consultar disponibilidad' : restantes > 0 ? `${restantes} disp.` : 'Sin existencias'}</span>
                    </div>
                  </article>;
                })}
              </div>}
              {encontrados.length > visibles.length && <button type="button" className="apv-more"
                onClick={() => setLimite((valor) => valor + 24)}>Ver más productos ({encontrados.length - visibles.length} restantes)</button>}
            </>}
          </div>
        </div>

        <div className="apv-right">
          <div className="apv-panel apv-cart">
            <div className="apv-panel-header"><div><span className="apv-kicker">PASO 2 · RESERVA</span>
              <h3><ShoppingBasket size={22}/> Productos del apartado</h3></div>
              <span className="apv-count">{resumen.unidades} unidades</span></div>
            {carrito.length === 0 ? <div className="apv-empty">
              <ShoppingBasket size={30}/><strong>Aún no hay productos</strong>
              <p>Usa el botón + de las tarjetas para preparar la reserva.</p>
            </div> : <>
              <div className="apv-cart-items" aria-label="Productos seleccionados">
                {carrito.map((item) => <div key={item.id} className="apv-cart-line">
                  <div className="apv-cart-title"><strong>{item.nombre}</strong><small>{dineroApartados(item.precioVentaUnitario)} c/u</small></div>
                  <div className="apv-cart-controls">
                    <button type="button" disabled={guardando || item.cantidad <= 1}
                      aria-label={`Quitar una unidad de ${item.nombre}`} onClick={() => cambiarCantidad(item.id, item.cantidad - 1)}><Minus size={15}/></button>
                    <span aria-label={`Cantidad de ${item.nombre}`}>{item.cantidad}</span>
                    <button type="button" disabled={guardando || (item.stockActual !== null && item.cantidad >= item.stockActual)}
                      aria-label={`Agregar una unidad de ${item.nombre}`} onClick={() => cambiarCantidad(item.id, item.cantidad + 1)}><Plus size={15}/></button>
                  </div>
                  <strong className="apv-line-total">{dineroApartados(item.cantidad * item.precioVentaUnitario)}</strong>
                  <button type="button" className="apv-delete" disabled={guardando}
                    aria-label={`Eliminar ${item.nombre}`} onClick={() => setCarrito((v) => v.filter((p) => p.id !== item.id))}><Trash2 size={17}/></button>
                </div>)}
              </div><button type="button" className="apv-clear" disabled={guardando}
                onClick={() => { if (window.confirm('¿Vaciar la selección de productos?')) setCarrito([]); }}>Vaciar selección</button>
            </>}
            <div className="apv-total"><span>Total de la reserva</span><strong>{dineroApartados(resumen.total)}</strong></div>
          </div>
          <div className="apv-panel apv-checkout"><span className="apv-kicker">PASO 3 · CLIENTE Y ABONO</span>
            <h3><UserRound size={21}/> Completar apartado</h3>
            <label htmlFor="apv-nombre">Nombre del cliente <b>*</b></label>
            <input id="apv-nombre" type="text" required maxLength={150} value={clienteNombre}
              placeholder="Ej.: Laura Martínez" autoComplete="name" disabled={guardando}
              onChange={(e) => setClienteNombre(e.target.value)} />
            <label htmlFor="apv-telefono">Teléfono <small>(opcional)</small></label>
            <input id="apv-telefono" type="tel" maxLength={30} value={clienteTelefono}
              placeholder="Ej.: 310 123 4567" autoComplete="tel" disabled={guardando}
              onChange={(e) => setClienteTelefono(e.target.value)} />
            <label htmlFor="apv-abono">Abono inicial <b>*</b></label>
            <input id="apv-abono" type="number" min="1" max={Math.max(1,resumen.total)} step="1"
              value={abonoInicial} placeholder="Ej.: 5000" disabled={guardando || !carrito.length}
              onChange={(e) => setAbonoInicial(e.target.value)} required />
            <p className="apv-hint">El abono debe ser mayor a $0 y no superar el total.</p>
            <div className="apv-summary"><div><span>Total</span><strong>{dineroApartados(resumen.total)}</strong></div>
              <div><span>Abono inicial</span><strong>{dineroApartados(resumen.abono)}</strong></div>
              <div className="apv-pending"><span>Saldo pendiente</span><strong>{dineroApartados(resumen.saldo)}</strong></div></div>
            <button type="submit" className="apv-primary" disabled={!puedeCrear}>
              {guardando ? <><LoaderCircle size={18}/> Guardando apartado...</> : <><Check size={18}/> Confirmar apartado</>}
            </button>
            <p className="apv-footnote">Las existencias se reservan al confirmar. No se registra una venta adicional.</p>
          </div>
        </div>
      </form>
    </section>
  );
}
