import test from 'node:test';
import assert from 'node:assert';
import { normalizarUmbral, UMBRAL_POR_DEFECTO } from '../src/modulos/inventario/dominio/UmbralStock.js';

test('vacío → default 10', () => {
  assert.equal(normalizarUmbral('').getValue(), UMBRAL_POR_DEFECTO);
});

test('undefined → default 10', () => {
  assert.equal(normalizarUmbral(undefined).getValue(), UMBRAL_POR_DEFECTO);
});

test('null → default 10', () => {
  assert.equal(normalizarUmbral(null).getValue(), UMBRAL_POR_DEFECTO);
});

test('"7" → 7', () => {
  assert.equal(normalizarUmbral('7').getValue(), 7);
});

test('0 → 0 (válido)', () => {
  assert.equal(normalizarUmbral(0).getValue(), 0);
});

test('-1 falla', () => {
  assert.ok(normalizarUmbral(-1).isFailure);
});

test('2.5 falla (decimal)', () => {
  assert.ok(normalizarUmbral(2.5).isFailure);
});

test('"abc" falla (no numérico)', () => {
  assert.ok(normalizarUmbral('abc').isFailure);
});

test('NaN falla', () => {
  assert.ok(normalizarUmbral(NaN).isFailure);
});