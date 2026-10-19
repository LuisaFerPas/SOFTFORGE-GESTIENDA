import test from 'node:test';
import assert from 'node:assert/strict';
import { obtenerEstadoStock } from '../src/modulos/inventario/utilidades/estadoStock.js';

test('SD-67: stock normal', () => {
  assert.equal(obtenerEstadoStock({ stockActual: 12, stockMinimoAlerta: 5 }), 'NORMAL');
});
test('SD-67: mínimo inclusive da stock bajo', () => {
  assert.equal(obtenerEstadoStock({ stockActual: 5, stockMinimoAlerta: 5 }), 'BAJO');
  assert.equal(obtenerEstadoStock({ stockActual: 1, stockMinimoAlerta: 5 }), 'BAJO');
});
test('SD-67: stock cero o negativo equivale a agotado', () => {
  assert.equal(obtenerEstadoStock({ stockActual: 0, stockMinimoAlerta: 5 }), 'AGOTADO');
  assert.equal(obtenerEstadoStock({ stockActual: -3, stockMinimoAlerta: 5 }), 'AGOTADO');
});
test('SD-67: no deduce stock cuando los datos están ocultos al vendedor', () => {
  assert.equal(obtenerEstadoStock({nombre:'Solo vendedores'}), 'DESCONOCIDO');
});
