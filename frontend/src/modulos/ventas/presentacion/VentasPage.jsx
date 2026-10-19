import { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, AlertTriangle } from 'lucide-react';
import { listarProductosApi } from '../../inventario/servicios/inventarioService';
import { crearVentaApi } from '../servicios/ventasService';

const formato = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

/** Registro básico de venta para demostrar RV-15.
 * La facturación térmica y la integración completa del POS corresponden a otras HU.
 */
export function VentasPage() {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [medioPago, setMedioPago] = useState('EFECTIVO');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [montoEfectivo, setMontoEfectivo] = useState('');
  const [montoNequi, setMontoNequi] = useState('');
  const [error, setError] = useState('');
  const [confirmacion, setConfirmacion] = useState(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    listarProductosApi().then(res => setProductos(res.data || []))
      .catch(e => setError(e.message));
  }, []);
  const encontrados = useMemo(() => productos.filter(p =>
    `${p.nombre} ${p.codigoInterno}`.toLocaleLowerCase('es').includes(busqueda.toLocaleLowerCase('es'))
  ).slice(0, 12), [productos, busqueda]);
  const total = carrito.reduce((sum, p) => sum + p.precioVentaUnitario * p.cantidad, 0);

  function agregar(p) {
    setCarrito(actual => actual.some(item => item.id === p.id)
      ? actual.map(item => item.id === p.id ? { ...item, cantidad: item.cantidad + 1 } : item)
      : [...actual, { ...p, cantidad: 1 }]);
    setConfirmacion(null);
  }
  function modificarCantidad(id, cantidad) {
    const cantidadNumero = Number(cantidad);
    if (!Number.isSafeInteger(cantidadNumero) || cantidadNumero <= 0) return;
    setCarrito(items => items.map(p => p.id === id ? { ...p, cantidad: cantidadNumero } : p));
  }
  async function finalizar(e) {
    e.preventDefault();
    setError(''); setConfirmacion(null);
    if (!carrito.length) { setError('Agrega al menos un producto.'); return; }
    setCargando(true);
    try {
      const payload = {
        items: carrito.map(p => ({ productoId: p.id, cantidad: p.cantidad })),
        medioPago,
        ...(medioPago === 'EFECTIVO' ? { montoRecibido: Number(montoRecibido) } : {}),
        ...(medioPago === 'MIXTO' ? { montoEfectivo: Number(montoEfectivo), montoNequi: Number(montoNequi) } : {})
      };
      const resultado = await crearVentaApi(payload);
      setConfirmacion(resultado.data);
      setCarrito([]); setMontoRecibido(''); setMontoEfectivo(''); setMontoNequi('');
    } catch (err) { setError(err.message); }
    finally { setCargando(false); }
  }
  return <div style={{ maxWidth: 1050, margin: '0 auto' }}>
    <header className="panel-header" style={{marginBottom:24}}>
      <div><h1 className="header-title">Punto de venta</h1><p>Registro de venta de prueba · RV-15</p></div>
    </header>
    <p style={{color:'#81470e',background:'#fff4da',padding:12,borderRadius:8}}>
      <AlertTriangle size={16} style={{verticalAlign:'middle'}}/> Si faltan existencias, se avisará después del registro; la venta no se bloquea.
    </p>
    {error && <p role="alert" style={{color:'#991b1b'}}>{error}</p>}
    {confirmacion && <section role="status" style={{padding:14,background:'#dcfce7',borderRadius:8}}>
      <strong>Venta #{confirmacion.id} registrada · {formato(confirmacion.total)}</strong>
      {confirmacion.advertencias?.map(a => <p key={a.productoId}>⚠ {a.nombre}: {a.mensaje}</p>)}
    </section>}
    <div className="panel-card" style={{padding:20,marginBottom:16}}>
      <h2 style={{fontSize:'1.1rem'}}>Buscar productos</h2>
      <input aria-label="Buscar producto por código o nombre" placeholder="Nombre o código" value={busqueda}
        onChange={e => setBusqueda(e.target.value)} style={{width:'100%',padding:12,border:'1px solid #ddd',borderRadius:8}} />
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}>
        {encontrados.map(p => <button key={p.id} type="button" onClick={() => agregar(p)}
          style={{padding:'8px 12px',border:'1px solid #e6c7b0',borderRadius:8,cursor:'pointer',background:'#fffaf4'}}>
          + {p.nombre} · {formato(p.precioVentaUnitario)}
        </button>)}
      </div>
    </div>
    <form className="panel-card" style={{padding:20}} onSubmit={finalizar}>
      <h2 style={{fontSize:'1.1rem'}}><ShoppingCart size={18} style={{verticalAlign:'middle'}}/> Carrito</h2>
      {carrito.length === 0 ? <p>No hay productos en el carrito.</p> : carrito.map(item =>
        <div key={item.id} style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',padding:'12px 0',borderBottom:'1px solid #eee'}}>
          <div style={{flex:1,minWidth:160}}>{item.nombre}</div>
          <label>Cantidad <input type="number" min="1" step="1" value={item.cantidad}
            onChange={e=>modificarCantidad(item.id,e.target.value)} style={{width:70,padding:7}}/></label>
          <span>{formato(item.precioVentaUnitario*item.cantidad)}</span>
          <button type="button" onClick={()=>setCarrito(xs=>xs.filter(p=>p.id!==item.id))}>Quitar</button>
        </div>)}
      <h3>Total: {formato(total)}</h3>
      <label>Medio de pago <select value={medioPago} onChange={e=>setMedioPago(e.target.value)}
        style={{padding:9,marginLeft:8}}><option value="EFECTIVO">Efectivo</option><option value="NEQUI">Nequi</option><option value="MIXTO">Mixto</option></select></label>
      {medioPago==='EFECTIVO' && <p><label>Recibido $ <input type="number" min="0" step="0.01" required value={montoRecibido} onChange={e=>setMontoRecibido(e.target.value)}/></label></p>}
      {medioPago==='MIXTO' && <div style={{margin:'12px 0',display:'flex',gap:12,flexWrap:'wrap'}}>
        <label>Efectivo $ <input type="number" min="0" step="0.01" required value={montoEfectivo} onChange={e=>setMontoEfectivo(e.target.value)}/></label>
        <label>Nequi $ <input type="number" min="0" step="0.01" required value={montoNequi} onChange={e=>setMontoNequi(e.target.value)}/></label>
      </div>}
      <p><button className="btn-primary" type="submit" disabled={cargando || !carrito.length} style={{padding:12}}>
        {cargando ? 'Guardando...' : 'Registrar venta'}
      </button></p>
    </form>
  </div>;
}
