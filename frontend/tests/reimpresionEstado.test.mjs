import test from 'node:test';
import assert from 'node:assert/strict';
import {
  esFacturaReimprimible,
  describirResultadoReimpresion,
  describirErrorReimpresion
} from '../src/modulos/ventas/presentacion/componentes/reimpresionEstado.js';

test('SD-124: el botón solo se habilita para facturas EMITIDAS', () => {
  assert.equal(esFacturaReimprimible({ estado: 'EMITIDA', consecutivo: 'F-0001' }), true);
  assert.equal(esFacturaReimprimible({ estado: 'ANULADA', consecutivo: 'F-0002' }), false);
  assert.equal(esFacturaReimprimible({ estado: 'EMITIDA', consecutivo: 'x' }), false);
  assert.equal(esFacturaReimprimible(null), false);
});

test('SD-124: no confunde factura recuperada con factura impresa', () => {
  const estado = describirResultadoReimpresion({
    success: true,
    data: { factura: { consecutivo: 'F-0001' }, impresionRealizada: false }
  }, 'F-0001');
  assert.equal(estado.tipo, 'informacion');
  assert.match(estado.mensaje, /impresión física todavía no se ha realizado/i);
});

test('SD-124: comunica impresión real solo si el servidor lo confirma', () => {
  const estado = describirResultadoReimpresion({
    success: true,
    data: { factura: { consecutivo: 'F-0001' }, impresionRealizada: true }
  }, 'F-0001');
  assert.equal(estado.tipo, 'exito');
});

test('SD-124: descarta respuestas con consecutivo diferente o sin factura', () => {
  assert.throws(() => describirResultadoReimpresion({
    success: true, data: { factura: { consecutivo: 'F-0002' } }
  }, 'F-0001'), /No se pudo confirmar/);
  assert.throws(() => describirResultadoReimpresion({ success: true, data: {} }, 'F-0001'));
});

test('SD-124: conserva mensajes claros de API y errores de red', () => {
  assert.match(describirErrorReimpresion(new Error('No se encontró una factura F-0001')), /No se encontró/);
  assert.match(describirErrorReimpresion(new Error('Failed to fetch')), /conectar con el servidor/);
});
