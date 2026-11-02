import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// HU-0404: verificamos el contrato HTTP sin servidor ni base de datos.
const ruta = new URL('../src/modulos/ventas/servicios/ventasService.js', import.meta.url);
const original = readFileSync(ruta, 'utf8');
const reemplazo = original.replace(
  /^import \{ apiFetch \} from ['"][^'"]+['"];?\s*/,
  'const apiFetch = (...args) => globalThis.__HU0404_apiFetch(...args);\n'
);
if (reemplazo === original) {
  throw new Error('No se encontró la importación esperada de apiFetch');
}
const servicio = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(reemplazo));

function espiarApi(respuesta) {
  const llamadas = [];
  globalThis.__HU0404_apiFetch = (...argumentos) => {
    llamadas.push(argumentos);
    return respuesta(...argumentos);
  };
  return llamadas;
}

test('HU-0404 Fase A: edita el nombre con PUT y consecutivo normalizado', async () => {
  const llamadas = espiarApi(() => Promise.resolve({ success: true, data: {} }));
  await servicio.editarFactura('  f-0001  ', { nombreCliente: 'Ana Gómez' });
  assert.deepEqual(llamadas, [[
    '/ventas/facturas/F-0001',
    { method: 'PUT', body: JSON.stringify({ nombreCliente: 'Ana Gómez' }) },
  ]]);
});

test('HU-0404 Fase A: no envía solicitudes con consecutivos inválidos', async () => {
  const llamadas = espiarApi(() => Promise.resolve({ success: true, data: {} }));
  for (const valor of [undefined, null, '', '123', 'F-1', 'F-0001/../../otro', 17]) {
    await assert.rejects(
      () => servicio.editarFactura(valor, { nombreCliente: 'Ana' }),
      /formato F-0001/
    );
  }
  assert.equal(llamadas.length, 0);
});

test('HU-0404 Fase A: conserva el mensaje de error HTTP del servidor', async () => {
  espiarApi(() => Promise.reject(new Error('El nombre del cliente no cambió.')));
  await assert.rejects(
    () => servicio.editarFactura('F-0001', { nombreCliente: 'Ana' }),
    /El nombre del cliente no cambió/
  );
});

test('HU-0404 Fase B: reutiliza con POST y consecutivo normalizado', async () => {
  const llamadas = espiarApi(() => Promise.resolve({ success: true, data: { items: [] } }));
  await servicio.anularYCargarCarrito(' f-0002 ');
  assert.deepEqual(llamadas, [[
    '/ventas/facturas/F-0002/reutilizar',
    { method: 'POST' },
  ]]);
});

test('HU-0404 Fase B: no anula con consecutivos inválidos', async () => {
  const llamadas = espiarApi(() => Promise.resolve({ success: true, data: {} }));
  for (const valor of [undefined, null, '', 'F-1', 'F-0001/../../otro']) {
    await assert.rejects(() => servicio.anularYCargarCarrito(valor), /formato F-0001/);
  }
  assert.equal(llamadas.length, 0);
});

test('HU-0404 Fase B: conserva el mensaje de error HTTP del servidor', async () => {
  espiarApi(() => Promise.reject(new Error('La factura ya fue anulada.')));
  await assert.rejects(
    () => servicio.anularYCargarCarrito('F-0002'),
    /La factura ya fue anulada/
  );
});

test('HU-0404: no altera los contratos previos de ventas y facturación', async () => {
  const llamadas = espiarApi(() => Promise.resolve({ success: true, data: {} }));
  await servicio.registrarVenta({ items: [], medioPago: 'EFECTIVO' });
  await servicio.generarFactura(9, 'Lucía');
  await servicio.reimprimirFactura('F-0003');
  assert.equal(llamadas[0][0], '/ventas');
  assert.equal(llamadas[1][0], '/ventas/facturas');
  assert.equal(llamadas[2][0], '/ventas/facturas/F-0003/reimprimir');
});
