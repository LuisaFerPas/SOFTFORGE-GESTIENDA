import { test } from 'node:test';
import assert from 'node:assert';
import { interpretar, TIPO_BUSQUEDA } from '../src/modulos/inventario/dominio/CriterioBusqueda.js';

test('vacío, undefined, null o espacios → VACIO', () => {
  assert.equal(interpretar('').tipo, TIPO_BUSQUEDA.VACIO);
  assert.equal(interpretar(undefined).tipo, TIPO_BUSQUEDA.VACIO);
  assert.equal(interpretar(null).tipo, TIPO_BUSQUEDA.VACIO);
  assert.equal(interpretar('   ').tipo, TIPO_BUSQUEDA.VACIO);
});

test('solo dígitos con 6 o más → CODIGO', () => {
  assert.equal(interpretar('7501234567890').tipo, TIPO_BUSQUEDA.CODIGO);
  assert.equal(interpretar('123456').tipo, TIPO_BUSQUEDA.CODIGO);
});

test('menos de 6 dígitos → NOMBRE', () => {
  assert.equal(interpretar('12345').tipo, TIPO_BUSQUEDA.NOMBRE);
});

test('patrón de código interno (XXX-000) → CODIGO', () => {
  assert.equal(interpretar('JUG-001').tipo, TIPO_BUSQUEDA.CODIGO);
  assert.equal(interpretar('CAC0001').tipo, TIPO_BUSQUEDA.CODIGO);
});

test('texto de nombre → NOMBRE', () => {
  assert.equal(interpretar('jabón').tipo, TIPO_BUSQUEDA.NOMBRE);
  assert.equal(interpretar('Jabón Rey Limón').tipo, TIPO_BUSQUEDA.NOMBRE);
});
