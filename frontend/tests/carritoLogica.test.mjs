import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MENSAJE_CANTIDAD_INVALIDA,
  validarCantidad,
  subtotalLinea,
  totalCarrito
} from '../src/modulos/ventas/presentacion/componentes/carritoLogica.js';

test('HU-0303.2: acepta cantidades enteras mayores que cero', () => {
  for (const valor of [1, 2, 99, '3', ' 7 ', '0004']) {
    const resultado = validarCantidad(valor);
    assert.equal(resultado.valida, true);
    assert.equal(resultado.cantidad, Number(valor));
    assert.equal(resultado.error, undefined);
  }
});

test('HU-0303.2: rechaza vacío, cero, negativos, decimales y texto', () => {
  const invalidos = [
    '', '   ', 0, '0', -1, '-2', 1.5, '1.5', '1.0', '1,5',
    '1e2', 'abc', null, undefined, true, {}, [], NaN, Infinity
  ];
  for (const valor of invalidos) {
    const resultado = validarCantidad(valor);
    assert.equal(resultado.valida, false);
    assert.equal(resultado.cantidad, undefined);
    assert.equal(resultado.error, MENSAJE_CANTIDAD_INVALIDA);
  }
});

test('HU-0303.2: el mensaje de error es el acordado', () => {
  assert.equal(
    MENSAJE_CANTIDAD_INVALIDA,
    'La cantidad debe ser un número entero mayor que 0.'
  );
});

test('HU-0303.2: subtotalLinea multiplica precio unitario por cantidad', () => {
  assert.equal(subtotalLinea({ precioVentaUnitario: 2500, cantidad: 3 }), 7500);
  assert.equal(subtotalLinea({ precioVentaUnitario: '1500', cantidad: '2' }), 3000);
  assert.equal(
    subtotalLinea({ precioVentaUnitario: 1000, cantidad: 1, nombre: 'Extra' }),
    1000
  );
});

test('HU-0303.2: subtotalLinea devuelve 0 para líneas inválidas', () => {
  assert.equal(subtotalLinea(null), 0);
  assert.equal(subtotalLinea({ precioVentaUnitario: 1000, cantidad: 0 }), 0);
  assert.equal(subtotalLinea({ precioVentaUnitario: 1000, cantidad: 1.5 }), 0);
  assert.equal(subtotalLinea({ precioVentaUnitario: 'abc', cantidad: 1 }), 0);
});

test('HU-0303.2: totalCarrito suma subtotales y coincide con la suma manual', () => {
  const items = [
    { precioVentaUnitario: 2500, cantidad: 2 },
    { precioVentaUnitario: 1000, cantidad: 3 },
    { precioVentaUnitario: 500, cantidad: 1 }
  ];
  assert.equal(totalCarrito(items), 8500);
  assert.equal(
    totalCarrito(items),
    items.reduce((total, item) => total + subtotalLinea(item), 0)
  );
});

test('HU-0303.2: totalCarrito devuelve 0 para carrito vacío o inválido', () => {
  assert.equal(totalCarrito([]), 0);
  assert.equal(totalCarrito(null), 0);
  assert.equal(totalCarrito(undefined), 0);
  assert.equal(totalCarrito('no-es-array'), 0);
});

test('HU-0303.2: totalCarrito ignora líneas inválidas', () => {
  assert.equal(totalCarrito([
    { precioVentaUnitario: 2500, cantidad: 2 },
    { precioVentaUnitario: 1000, cantidad: 0 }
  ]), 5000);
});
