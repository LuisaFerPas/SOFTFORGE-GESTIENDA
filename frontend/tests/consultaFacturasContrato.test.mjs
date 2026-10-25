import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ruta = new URL('../src/modulos/ventas/servicios/consultaFacturasService.js', import.meta.url);
const codigo = readFileSync(ruta,'utf8').replace(
  /import \{ apiFetch \} from ['"][^'"]+['"];?/, 'const apiFetch = (...args) => globalThis.__facturasFetch(...args);'
);
const servicio = await import('data:text/javascript;base64,' + Buffer.from(codigo).toString('base64'));

test('historial frontend: lista con filtros URL codificados', async () => {
  let ruta;
  globalThis.__facturasFetch = async (url) => {ruta=url;return {success:true,data:[]};};
  await servicio.listarFacturas({pagina:2,q:'Ana Gómez',estado:'EMITIDA'});
  assert.equal(ruta,'/ventas/facturas?pagina=2&q=Ana+G%C3%B3mez&estado=EMITIDA');
});

test('historial frontend: consulta detalle por consecutivo', async () => {
  let ruta;
  globalThis.__facturasFetch = async (url) => {ruta=url;return {success:true,data:{}};};
  await servicio.consultarFactura('F-0001');
  assert.equal(ruta,'/ventas/facturas/F-0001');
});

test('historial frontend: propaga errores del servidor', async () => {
  globalThis.__facturasFetch = async () => {throw new Error('No se encontró la factura solicitada.');};
  await assert.rejects(servicio.consultarFactura('F-9999'), /No se encontró/);
});
