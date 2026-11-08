import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MENSAJE_MONTO_INVALIDO,
  MENSAJE_MONTO_EXCEDE_SALDO,
  MENSAJE_SALDO_INVALIDO,
  validarAbono
} from '../src/modulos/apartados/utilidades/validarAbono.js';

test('HU-0702: acepta montos mayores que cero y menores o iguales al saldo', () => {
  for (const [monto, saldo] of [
    [10000, 30000],
    ['10000', 30000],
    [' 2500 ', '30000'],
    [30000, 30000],
    ['30000', '30000']
  ]) {
    const resultado = validarAbono(monto, saldo);
    assert.equal(resultado.valido, true);
    assert.equal(resultado.error, undefined);
  }
});

test('HU-0702: rechaza montos vacíos, cero, negativos, no numéricos o no finitos', () => {
  const invalidos = [
    '', '   ', 0, '0', -1, '-2', 'abc', '1,5',
    null, undefined, true, false, {}, [], NaN, Infinity, -Infinity
  ];

  for (const monto of invalidos) {
    const resultado = validarAbono(monto, 30000);
    assert.equal(resultado.valido, false, `monto aceptado: ${String(monto)}`);
    assert.equal(resultado.error, MENSAJE_MONTO_INVALIDO);
  }
});

test('HU-0702: rechaza un monto mayor al saldo pendiente', () => {
  const resultado = validarAbono(30001, 30000);

  assert.equal(resultado.valido, false);
  assert.equal(resultado.error, MENSAJE_MONTO_EXCEDE_SALDO);
});

test('HU-0702: rechaza un saldo pendiente inválido', () => {
  for (const saldo of [undefined, 'abc', -1, NaN, Infinity, -Infinity]) {
    const resultado = validarAbono(1000, saldo);
    assert.equal(resultado.valido, false, `saldo aceptado: ${String(saldo)}`);
    assert.equal(resultado.error, MENSAJE_SALDO_INVALIDO);
  }
});

test('HU-0702: los mensajes de error son los acordados', () => {
  assert.equal(MENSAJE_MONTO_INVALIDO, 'El monto debe ser un número mayor que 0.');
  assert.equal(
    MENSAJE_MONTO_EXCEDE_SALDO,
    'El monto no puede superar el saldo pendiente.'
  );
  assert.equal(MENSAJE_SALDO_INVALIDO, 'El saldo pendiente no es válido.');
});
