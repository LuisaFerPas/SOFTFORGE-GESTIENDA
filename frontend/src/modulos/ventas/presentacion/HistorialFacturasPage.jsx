import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle, ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, CircleHelp,
  FileSearch, FileText, LoaderCircle, Printer, ReceiptText, RefreshCw,
  Search, ShoppingBag, X
} from 'lucide-react';
import { listarFacturas, consultarFactura } from '../servicios/consultaFacturasService';
import { useAuth } from '../../../compartido/contexto/AuthContext';
import { ReimprimirFacturaButton } from './componentes/ReimprimirFacturaButton';
import { EditarFacturaButton } from './componentes/EditarFacturaButton';
import { ReutilizarVentaButton } from './componentes/ReutilizarVentaButton';
import './HistorialFacturasPage.css';

const dinero = (valor) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0
}).format(Number(valor) || 0);

function fechaLegible(valor) {
  if (!valor) return 'No disponible';
  const normalizada = String(valor).replace(' ', 'T');
  const fecha = new Date(normalizada);
  if (!Number.isFinite(fecha.getTime())) return String(valor);
  return new Intl.DateTimeFormat('es-CO', { dateStyle:'medium', timeStyle:'short' }).format(fecha);
}

function VistaFactura({ factura, onCerrar }) {
  const cerrarRef = useRef(null);
  const previoRef = useRef(null);
  const imprimir = factura.estado === 'EMITIDA';

  useEffect(() => {
    previoRef.current = document.activeElement;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cerrarRef.current?.focus();
    function teclado(evento) {
      if (evento.key === 'Escape') onCerrar();
      if (evento.key !== 'Tab') return;
      const focos = [...document.querySelectorAll('.fh-modal button:not(:disabled)')];
      if (!focos.length) return;
      if (evento.shiftKey && document.activeElement === focos[0]) {
        evento.preventDefault(); focos[focos.length - 1].focus();
      } else if (!evento.shiftKey && document.activeElement === focos[focos.length - 1]) {
        evento.preventDefault(); focos[0].focus();
      }
    }
    document.addEventListener('keydown', teclado);
    return () => {
      document.body.style.overflow = anterior;
      document.removeEventListener('keydown', teclado);
      if (previoRef.current?.isConnected) previoRef.current.focus({preventScroll:true});
    };
  }, [onCerrar]);

  return createPortal(
    <div className="fh-overlay">
      <section className="fh-modal" role="dialog" aria-modal="true" aria-labelledby="fh-modal-titulo">
        <header className="fh-modal-head">
          <div className="fh-modal-identity">
            <span className="fh-modal-symbol"><ReceiptText size={23} /></span>
            <div>
              <p className="fh-overline">VISTA DE FACTURA</p>
              <h2 id="fh-modal-titulo">{factura.consecutivo}</h2>
              <p>Venta #{factura.ventaId} · {fechaLegible(factura.fechaEmision)}</p>
            </div>
          </div>
          <button className="fh-icon-button" type="button" aria-label="Cerrar vista" onClick={onCerrar} ref={cerrarRef}><X size={20}/></button>
        </header>
        <div className="fh-modal-body">
          <div id="historial-impresion" className="fh-ticket">
            <div className="fh-ticket-heading">
              <div className="fh-ticket-logo">DM</div>
              <strong>Variedades Don Mati</strong>
              <span>Comprobante de venta · Gestienda</span>
            </div>
            <div className="fh-ticket-pair"><span>Factura</span><b>{factura.consecutivo}</b></div>
            <div className="fh-ticket-pair"><span>Fecha</span><b>{fechaLegible(factura.fechaEmision)}</b></div>
            <div className="fh-ticket-pair"><span>Cliente</span><b>{factura.nombreCliente}</b></div>
            <div className="fh-ticket-pair"><span>Estado</span><b>{factura.estado}</b></div>
            <div className="fh-ticket-items">
              <div className="fh-ticket-columns"><span>Producto</span><span>Total</span></div>
              {factura.items.map((item, i) => (
                <div className="fh-ticket-item" key={`${item.productoId}-${i}`}>
                  <div><strong>{item.nombre}</strong><small>{item.cantidad} × {dinero(item.precioUnitario)}</small></div>
                  <b>{dinero(item.subtotal)}</b>
                </div>
              ))}
            </div>
            <div className="fh-ticket-total"><span>TOTAL</span><strong>{dinero(factura.total)}</strong></div>
            <div className="fh-ticket-pair"><span>Medio de pago</span><b>{factura.medioPago}</b></div>
            {factura.pago?.cambio > 0 && <div className="fh-ticket-pair"><span>Cambio</span><b>{dinero(factura.pago.cambio)}</b></div>}
            <p className="fh-ticket-footer">Gracias por tu compra.</p>
            <p className="fh-ticket-legal">Comprobante interno de venta. No constituye factura electrónica validada por la DIAN.</p>
          </div>
          <div className="fh-print-notice" role="note">
            <CircleHelp size={19} />
            <span>Se abrirá el cuadro de impresión del navegador. La impresión física depende del dispositivo y de que confirmes esa acción.</span>
          </div>
        </div>
        <footer className="fh-modal-footer">
          <button type="button" className="fh-btn fh-btn--subtle" onClick={onCerrar}>Cerrar vista</button>
          <button type="button" className="fh-btn fh-btn--primary" onClick={() => window.print()} disabled={!imprimir}>
            <Printer size={18} /> Imprimir comprobante
          </button>
        </footer>
      </section>
    </div>, document.body
  );
}

export function HistorialFacturasPage() {
  const { isAdmin } = useAuth();
  const [busqueda, setBusqueda] = useState('');
  const [consulta, setConsulta] = useState('');
  const [estado, setEstado] = useState('');
  const [pagina, setPagina] = useState(1);
  const [facturas, setFacturas] = useState([]);
  const [paginacion, setPaginacion] = useState({pagina:1,total:0,totalPaginas:1});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState('');
  const secuenciaRef = useRef(0);
  const secuenciaDetalleRef = useRef(0);
  const [revision, setRevision] = useState(0);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    if (!aviso) return undefined;
    const temporizador = window.setTimeout(() => setAviso(''), 5200);
    return () => window.clearTimeout(temporizador);
  }, [aviso]);

  useEffect(() => {
    const temporizador = setTimeout(() => {
      setPagina(1);
      setConsulta(busqueda.trim());
    }, 280);
    return () => clearTimeout(temporizador);
  }, [busqueda]);

  useEffect(() => {
    const secuencia = ++secuenciaRef.current;
    setCargando(true);
    setError('');
    listarFacturas({pagina,q:consulta,estado})
      .then((respuesta) => {
        if (secuencia !== secuenciaRef.current) return;
        setFacturas(Array.isArray(respuesta.data) ? respuesta.data : []);
        setPaginacion(respuesta.paginacion || {pagina,total:0,totalPaginas:1});
      })
      .catch((e) => { if (secuencia === secuenciaRef.current) setError(e.message || 'No se pudieron cargar las facturas.'); })
      .finally(() => { if (secuencia === secuenciaRef.current) setCargando(false); });
    return () => { secuenciaRef.current++; };
  }, [pagina,consulta,estado,revision]);

  const abrirDetalle = useCallback(async (consecutivo) => {
    const secuencia = ++secuenciaDetalleRef.current;
    setCargandoDetalle(true);
    setErrorDetalle('');
    try {
      const respuesta = await consultarFactura(consecutivo);
      if (secuencia === secuenciaDetalleRef.current) setDetalle(respuesta.data);
    } catch (e) {
      if (secuencia === secuenciaDetalleRef.current) setErrorDetalle(e.message || 'No se pudo recuperar el detalle de la factura.');
    } finally {
      if (secuencia === secuenciaDetalleRef.current) setCargandoDetalle(false);
    }
  }, []);

  const cerrarDetalle = useCallback(() => setDetalle(null), []);

  function facturaEditada(datos) {
    const anterior = datos?.anulada?.consecutivo;
    const nueva = datos?.nueva?.consecutivo;
    setAviso(anterior && nueva
      ? `Factura ${anterior} corregida. Nueva factura ${nueva}.`
      : 'Factura corregida correctamente.');
    setRevision((actual) => actual + 1);
  }

  return (
    <main className="fh-page">
      <header className="fh-header">
        <div>
          <div className="fh-eyebrow"><FileText size={16}/> MÓDULO DE VENTAS</div>
          <h1>Historial de facturas</h1>
          <p>Consulta comprobantes guardados, visualiza los productos y prepara una reimpresión.</p>
        </div>
        <button type="button" className="fh-refresh" onClick={() => setRevision(r => r+1)} disabled={cargando}>
          <RefreshCw size={17} className={cargando ? 'fh-rotate' : ''}/> Actualizar
        </button>
      </header>

      <section className="fh-summary" aria-label="Resumen del historial">
        <div className="fh-summary-icon"><ReceiptText size={23}/></div>
        <div><span>Facturas según los filtros</span><strong>{paginacion.total}</strong></div>
        <p>Solo se muestran facturas registradas en la base de datos. Una venta sin factura no aparece en esta lista.</p>
      </section>

      <section className="fh-card" aria-label="Listado de facturas">
        <div className="fh-toolbar">
          <label className="fh-search"><Search size={20}/><input type="search" value={busqueda}
            onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar consecutivo o nombre del cliente"
            aria-label="Buscar facturas por consecutivo o cliente" maxLength={80}/></label>
          <label className="fh-filter">Estado
            <select value={estado} onChange={e=>{setEstado(e.target.value);setPagina(1);}}>
              <option value="">Todos los estados</option>
              <option value="EMITIDA">Emitidas</option>
              <option value="ANULADA">Anuladas</option>
            </select>
          </label>
        </div>
        {error && <div className="fh-error" role="alert"><AlertCircle size={19}/><span>{error}</span><button onClick={()=>setRevision(r=>r+1)} type="button">Reintentar</button></div>}
        {!error && cargando && <div className="fh-state" role="status"><LoaderCircle size={26} className="fh-rotate"/><b>Consultando facturas…</b></div>}
        {!error && !cargando && !facturas.length && <div className="fh-state"><FileSearch size={38}/><strong>No encontramos facturas</strong><p>Prueba otros filtros o registra una factura desde el punto de venta.</p></div>}
        {!error && !cargando && facturas.length > 0 && <>
          <div className="fh-table-wrap">
            <table className="fh-table">
              <thead><tr><th>Factura</th><th>Cliente</th><th>Vendedor</th><th>Fecha</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>{facturas.map(f => (
                <tr key={f.id}>
                  <td><strong className="fh-consecutivo">{f.consecutivo}</strong><small>Venta #{f.ventaId}</small></td>
                  <td><span className="fh-client">{f.nombreCliente}</span></td>
                  <td><span className="fh-client">{f.vendedor || '—'}</span></td>
                  <td><span className="fh-date"><CalendarDays size={14}/> {fechaLegible(f.fechaEmision)}</span></td>
                  <td className="fh-money">{dinero(f.total)}</td>
                  <td><span className={`fh-status ${f.estado === 'EMITIDA' ? 'fh-status--ok' : 'fh-status--cancel'}`}>{f.estado === 'EMITIDA' ? <Check size={13}/> : <X size={13}/>} {f.estado}</span></td>
                  <td><div className="fh-actions">
                    <button type="button" className="fh-view" disabled={cargandoDetalle} onClick={() => abrirDetalle(f.consecutivo)}><FileText size={16}/> Visualizar</button>
                    <ReimprimirFacturaButton factura={f} onPreparada={abrirDetalle}/>
                    {isAdmin && <EditarFacturaButton factura={f} onEditada={facturaEditada}/>}
                    {isAdmin && <ReutilizarVentaButton factura={f}/>}
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="fh-pagination">
            <span>Página {paginacion.pagina} de {paginacion.totalPaginas} · {paginacion.total} facturas</span>
            <div>
              <button type="button" onClick={()=>setPagina(n=>Math.max(1,n-1))} disabled={pagina<=1}><ArrowLeft size={16}/> Anterior</button>
              <button type="button" onClick={()=>setPagina(n=>Math.min(paginacion.totalPaginas,n+1))} disabled={pagina>=paginacion.totalPaginas}>Siguiente <ArrowRight size={16}/></button>
            </div>
          </div>
        </>}
      </section>
      <p className="fh-footer-note"><ShoppingBag size={17}/> ¿No aparece una venta? Solo las ventas para las que se confirmó «Sí, imprimir» tienen factura registrada.</p>
      {cargandoDetalle && <div className="fh-floating-status" role="status"><LoaderCircle className="fh-rotate" size={18}/> Cargando detalle…</div>}
      {errorDetalle && <div className="fh-floating-error" role="alert"><AlertCircle size={18}/>{errorDetalle}<button type="button" onClick={()=>setErrorDetalle('')} aria-label="Cerrar error"><X size={16}/></button></div>}
      {aviso && <div className="fh-floating-success" role="status"><CheckCircle2 size={18}/>{aviso}</div>}
      {detalle && <VistaFactura factura={detalle} onCerrar={cerrarDetalle}/>}
    </main>
  );
}
