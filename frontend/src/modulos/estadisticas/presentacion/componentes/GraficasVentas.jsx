import React from 'react';
import { formatCOP } from '../../../inventario/utilidades/formatoMoneda.js';
import '../estadisticasAvanzadas.css';

const COLORES = ['#e85d04', '#95562e', '#2c8066', '#426e9c', '#a15d95', '#8b6d19', '#5b6470'];
const porcentaje = (n, total) => total > 0 ? Math.round(n / total * 100) : 0;

/** Barras accesibles sin dependencias adicionales: muestran valores en texto incluso sin SVG. */
export function GraficasVentas({ financiero, cargando, error, onReintentar, ventasComparadas = [], cargandoComparacion = false }) {
  if (cargando) return <div className="est-estado" role="status">Cargando gráficas…</div>;
  if (error) return <div className="est-estado est-error" role="alert">{error} <button onClick={onReintentar}>Reintentar</button></div>;
  const categorias = financiero?.porCategoria ?? [];
  if (!categorias.length) return <div className="est-estado" role="status"><strong>Aún no hay ventas por categoría en este período.</strong><p>Cuando registres ventas se mostrarán las barras y la distribución. No se inventan datos para completar gráficas.</p></div>;
  const max = Math.max(...categorias.map(c => Number(c.ingresos)||0), 1);
  const total = categorias.reduce((sum, c) => sum + (Number(c.ingresos)||0), 0);
  let cursor = 0;
  const segmentos = categorias.map((c, index) => {
    const cantidad = Number(c.ingresos) || 0;
    const inicio = cursor;
    cursor += cantidad;
    return { ...c, color: COLORES[index % COLORES.length], inicio, cantidad };
  });
  const gradient = segmentos.map(c => `${c.color} ${c.inicio / total * 100}% ${(c.inicio + c.cantidad) / total * 100}%`).join(', ');
  const maxPeriodo = Math.max(1, ...ventasComparadas.map(v => v.total));
  return <div className="est-chart-grid">
    <section className="est-panel"><h3>Ventas por período</h3>
      <p className="est-hint">Comparación de ingresos acumulados hoy, últimos 7 días, este mes y este año. Los períodos se superponen.</p>
      {cargandoComparacion ? <p role="status">Cargando comparación…</p> : ventasComparadas.length ?
       <div role="img" aria-label="Gráfica de barras de ingresos acumulados por período">
         {ventasComparadas.map((v,i) => <div className="est-bar-row" key={v.periodo}>
           <div className="est-bar-top"><strong>{({DIA:'Hoy',SEMANA:'Últimos 7 días',MES:'Este mes',AÑO:'Este año'})[v.periodo]}</strong><span>{formatCOP.format(v.total)}</span></div>
           <div className="est-bar-track"><div className="est-bar-fill" style={{width:`${Math.max(0,v.total/maxPeriodo*100)}%`, background:COLORES[i]}} /></div>
         </div>)}
       </div> : <p>No se pudo consultar la comparación de períodos.</p>}
    </section>
    <section className="est-panel"><h3>Ventas por categoría</h3><p className="est-hint">Comparación de ingresos por categoría en el período elegido.</p>
      <div role="img" aria-label="Gráfica de barras de ventas por categoría">
        {categorias.map((c, i) => <div className="est-bar-row" key={`${c.categoria}-${i}`}>
          <div className="est-bar-top"><strong>{c.categoria}</strong><span>{formatCOP.format(Number(c.ingresos)||0)}</span></div>
          <div className="est-bar-track"><div className="est-bar-fill" style={{ width: `${Math.max(0,(Number(c.ingresos)||0)/max*100)}%`, background: COLORES[i%COLORES.length] }} /></div>
        </div>)}
      </div>
    </section>
    <section className="est-panel"><h3>Distribución de ventas por categoría</h3><p className="est-hint">Participación de cada categoría sobre los ingresos.</p>
      <div className="est-donut-layout"><div className="est-donut" role="img" aria-label={`Distribución de ${categorias.length} categorías`} style={{ background: `conic-gradient(${gradient})` }}><div className="est-donut-hole"><small>Total</small><strong>{formatCOP.format(total)}</strong></div></div>
        <ul className="est-legend">{segmentos.map((c,i) => <li key={i}><span className="est-legend-dot" style={{ background:c.color }}/><span>{c.categoria}</span><strong>{porcentaje(c.cantidad,total)}%</strong></li>)}</ul>
      </div>
    </section>
  </div>;
}
