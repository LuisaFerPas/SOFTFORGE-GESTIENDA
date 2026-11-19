import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const leer=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('estadísticas ofrece tarjetas móviles para ventas, categorías, alertas y financiero',()=>{
 const page=leer('../src/modulos/estadisticas/presentacion/EstadisticasPage.jsx');
 for(const seccion of ['Productos más vendidos','Ventas por categorías','Alertas de existencias','Balance por categoría']) assert.ok(page.includes(seccion),seccion);
 assert.ok(page.includes('MobileDetailCard'));
});
test('gráficas indican estado vacío sin falsos datos',()=>{
 const graf=leer('../src/modulos/estadisticas/presentacion/componentes/GraficasVentas.jsx');
 assert.ok(graf.includes('No se inventan datos'));
 assert.ok(graf.includes('role="status"'));
});
test('carga diferida de rutas reduce bundle inicial',()=>{
 const app=leer('../src/App.jsx');
 assert.ok(app.includes('lazy(') && app.includes('<Suspense'));
});
test('CSS móvil no fuerza palabras verticales en paneles',()=>{
 const css=leer('../src/compartido/componentes/mobileDetailCard.css');
 assert.ok(css.includes('word-break:normal') && css.includes('@media(max-width:850px)'));
});
