import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Sustituimos únicamente el cliente HTTP para verificar la ruta, el método y
// la propagación de respuestas y errores. No necesita servidor ni BD real.
const ruta = new URL('../src/modulos/ventas/servicios/ventasService.js', import.meta.url);
const original = readFileSync(ruta, 'utf8');
const reemplazo = original.replace(
  /^import \{ apiFetch \} from ['"][^'"]+['"];?\s*/,
  `const apiFetch = (...args) => globalThis.__SD123_apiFetch(...args);\n`
);
if (reemplazo === original) {
  throw new Error('No se encontró la importación esperada de apiFetch');
}
const servicio = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(reemplazo));

function espiarApi(respuesta) {
  const llamadas = [];
  globalThis.__SD123_apiFetch = (...argumentos) => {
    llamadas.push(argumentos);
    return respuesta(...argumentos);
  };
  return llamadas;
}

const FACTURA = {
  success: true,
  message: 'Factura localizada. La impresión física todavía no se ha realizado.',
  data: {
    factura: { ventaId: 7, consecutivo: 'F-0001', estado: 'EMITIDA' },
    impresionRealizada: false,
    estadoImpresion: 'PENDIENTE',
  },
};

test('SD-123: consulta por consecutivo con POST a la ruta definida por SD-122', async () => {
  const llamadas = espiarApi(() => Promise.resolve(FACTURA));
  const respuesta = await servicio.reimprimirFactura('F-0001');
  assert.deepEqual(llamadas, [[
    '/ventas/facturas/F-0001/reimprimir',
    { method: 'POST' },
  ]]);
  assert.equal(respuesta.data.factura.consecutivo, 'F-0001');
});

test('SD-123: normaliza espacios y minúsculas antes de formar la ruta', async () => {
  const llamadas = espiarApi(() => Promise.resolve(FACTURA));
  await servicio.reimprimirFactura('  f-0001  ');
  assert.equal(llamadas[0][0], '/ventas/facturas/F-0001/reimprimir');
});

test('SD-123: no envía solicitudes con consecutivos inválidos', async () => {
  const llamadas = espiarApi(() => Promise.resolve(FACTURA));
  for (const valor of [undefined, null, '', '123', 'F-1', 'F-0001/../../otro', 17]) {
    await assert.rejects(() => servicio.reimprimirFactura(valor), /formato F-0001/);
  }
  assert.equal(llamadas.length, 0);
});

test('SD-123: conserva el mensaje de error HTTP 404 de la API', async () => {
  const llamadas = espiarApi(() => Promise.reject(new Error('No se encontró una factura con el consecutivo F-9999.')));
  await assert.rejects(
    () => servicio.reimprimirFactura('F-9999'),
    /No se encontró una factura con el consecutivo F-9999/
  );
  assert.equal(llamadas.length, 1);
});

test('SD-123: no presenta como impresa una factura que el backend solo localizó', async () => {
  espiarApi(() => Promise.resolve(FACTURA));
  const respuesta = await servicio.reimprimirFactura('F-0001');
  assert.equal(respuesta.data.impresionRealizada, false);
  assert.equal(respuesta.data.estadoImpresion, 'PENDIENTE');
});

test('SD-123: sigue intacta la generación de facturas de SD-121', async () => {
  const llamadas = espiarApi(() => Promise.resolve({success:true,data:{consecutivo:'F-0002'}}));
  await servicio.generarFactura(9, 'Lucía');
  assert.equal(llamadas[0][0], '/ventas/facturas');
  assert.deepEqual(JSON.parse(llamadas[0][1].body), {ventaId:9,nombreCliente:'Lucía'});
});

test('SD-123: se conserva POST /ventas para registrar ventas', async () => {
  const llamadas = espiarApi(() => Promise.resolve({success:true,data:{id:1}}));
  await servicio.registrarVenta({items:[{productoId:1,cantidad:1}],medioPago:'NEQUI'});
  assert.equal(llamadas[0][0], '/ventas');
  assert.equal(llamadas[0][1].method, 'POST');
});
