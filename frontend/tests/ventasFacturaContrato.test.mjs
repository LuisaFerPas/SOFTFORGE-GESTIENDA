import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const archivo = new URL('../src/modulos/ventas/servicios/ventasService.js', import.meta.url);
const origen = readFileSync(archivo, 'utf8');
const codigo = origen.replace(
  /^import \{ apiFetch \} from ['"][^'"]+['"];?\s*/,
  'const apiFetch = (...args) => { globalThis.__llamadasApi.push(args); return Promise.resolve({success: true, data: {ventaId: 7, consecutivo: "F-0001"}}); };\n'
);
if (codigo === origen) throw new Error('No se encontró la importación esperada de apiFetch');
globalThis.__llamadasApi = [];
const mod = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(codigo));

test('SD-121: usa POST /ventas/facturas con ventaId y nombreCliente textual', async () => {
  globalThis.__llamadasApi = [];
  const resultado = await mod.generarFactura(7, 'Diana');
  assert.equal(resultado.data.consecutivo, 'F-0001');
  const [ruta, opciones] = globalThis.__llamadasApi[0];
  assert.equal(ruta, '/ventas/facturas');
  assert.equal(opciones.method, 'POST');
  assert.deepEqual(JSON.parse(opciones.body), {ventaId: 7, nombreCliente:'Diana'});
  assert.equal(globalThis.__llamadasApi.length,1);
});

test('SD-121: sin nombre registra Consumidor Final', async () => {
  globalThis.__llamadasApi = [];
  await mod.generarFactura(13);
  assert.deepEqual(JSON.parse(globalThis.__llamadasApi[0][1].body),
    {ventaId:13, nombreCliente:'Consumidor Final'});
});

test('SD-121: preserva compatibilidad con objeto {nombreCliente}', async () => {
  globalThis.__llamadasApi = [];
  await mod.generarFactura(8, {nombreCliente:'Ana'});
  assert.deepEqual(JSON.parse(globalThis.__llamadasApi[0][1].body),
    {ventaId:8, nombreCliente:'Ana'});
});

test('SD-121: el registro de ventas mantiene su endpoint separado', async () => {
  globalThis.__llamadasApi = [];
  await mod.registrarVenta({items:[{productoId:10,cantidad:1}],medioPago:'NEQUI'});
  assert.equal(globalThis.__llamadasApi[0][0], '/ventas');
  assert.equal(globalThis.__llamadasApi[0][1].method,'POST');
});
