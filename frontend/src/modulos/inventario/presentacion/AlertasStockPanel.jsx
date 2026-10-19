import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { obtenerAlertasApi } from '../servicios/inventarioService';
import { BadgeEstadoStock } from './BadgeEstadoStock';
import { obtenerEstadoStock } from '../utilidades/estadoStock';

/** SD-66: únicamente visible en la pestaña protegida para Administrador. */
export function AlertasStockPanel() {
  const [alertas, setAlertas] = useState([]);
  const [filtro, setFiltro] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const respuesta = await obtenerAlertasApi();
      setAlertas(Array.isArray(respuesta.data) ? respuesta.data : []);
    } catch (err) {
      setError(err.message || 'No fue posible consultar las alertas.');
    } finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const visibles = useMemo(() => alertas.filter(p => {
    const estado = obtenerEstadoStock(p);
    const coincide = filtro === 'TODOS' || (filtro === 'BAJO' && estado === 'BAJO') || (filtro === 'AGOTADO' && estado === 'AGOTADO');
    const texto = `${p.nombre} ${p.codigoInterno}`.toLocaleLowerCase('es');
    return coincide && texto.includes(busqueda.trim().toLocaleLowerCase('es'));
  }), [alertas, filtro, busqueda]);
  const bajos = alertas.filter(p => obtenerEstadoStock(p) === 'BAJO').length;
  const agotados = alertas.filter(p => obtenerEstadoStock(p) === 'AGOTADO').length;

  return <section className="alertas-stock-panel" aria-label="Alertas de inventario">
    <header className="alertas-stock-header">
      <h2><AlertTriangle size={20}/> Alertas de stock</h2>
      <button type="button" className="btn-secondary" onClick={cargar} disabled={cargando}><RefreshCw size={16}/> Actualizar</button>
    </header>
    <div className="alertas-stock-controles">
      <div role="group" aria-label="Filtrar alertas por estado" className="alertas-stock-filtros">
        {[
          ['TODOS', `Todas (${alertas.length})`],
          ['BAJO', `Stock bajo (${bajos})`],
          ['AGOTADO', `Agotados (${agotados})`]
        ].map(([id, etiqueta]) => <button key={id} type="button" aria-pressed={filtro === id}
          onClick={() => setFiltro(id)} className={filtro === id ? 'alertas-filtro activo' : 'alertas-filtro'}>{etiqueta}</button>)}
      </div>
      <input aria-label="Buscar productos en alerta" value={busqueda} onChange={e => setBusqueda(e.target.value)}
        placeholder="Buscar por código o nombre..." />
    </div>
    {cargando ? <p role="status">Consultando alertas...</p> : error ?
      <p role="alert">{error} <button type="button" onClick={cargar}>Reintentar</button></p> :
      visibles.length === 0 ? <p role="status">No hay productos que coincidan con el filtro.</p> :
      <div className="alertas-tabla-wrapper"><table className="alertas-tabla">
        <thead><tr><th scope="col">Producto</th><th scope="col">Categoría</th><th scope="col">Existencias</th><th scope="col">Mínimo</th><th scope="col">Estado</th></tr></thead>
        <tbody>{visibles.map(p => <tr key={p.id}>
          <td><strong>{p.nombre}</strong><small>{p.codigoInterno}</small></td>
          <td>{p.categoria}</td><td>{p.stockActual}</td><td>{p.stockMinimoAlerta}</td>
          <td><BadgeEstadoStock producto={p}/></td>
        </tr>)}</tbody>
      </table></div>
    }
  </section>;
}
