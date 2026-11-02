import test from 'node:test';
import assert from 'node:assert/strict';
import { mapearPrecargaCarrito } from '../src/modulos/ventas/presentacion/componentes/precargaCarrito.js';

const PRECARGA = {
  ventaAnuladaId: 4,
  consecutivo: 'f-0008',
  nombreCliente: ' Ana Gómez ',
  preciosActualizados: true,
  items: [
    {
      productoId: 10, nombre: 'Producto A', cantidad: 2,
      precioOriginal: 2500, precioVentaUnitario: 2600, subtotalActual: 5200
    },
    {
      productoId: 20, nombre: 'Producto B', cantidad: 1,
      precioOriginal: 6000, precioVentaUnitario: 6000, subtotalActual: 6000
    }
  ]
};

test('HU-0404 Fase B: convierte los ítems en líneas del carrito con precio vigente', () => {
  const resultado = mapearPrecargaCarrito(PRECARGA);
  assert.deepEqual(resultado.items, [
    {
      id: 10, nombre: 'Producto A', cantidad: 2,
      precioVentaUnitario: 2600, precioOriginal: 2500
    },
    {
      id: 20, nombre: 'Producto B', cantidad: 1,
      precioVentaUnitario: 6000, precioOriginal: 6000
    }
  ]);
  assert.equal(resultado.consecutivo, 'F-0008');
  assert.equal(resultado.nombreCliente, 'Ana Gómez');
  assert.equal(resultado.preciosActualizados, true);
});

test('HU-0404 Fase B: agrupa el mismo producto y suma cantidades', () => {
  const resultado = mapearPrecargaCarrito({
    items: [
      { productoId: 10, nombre: 'Producto A', cantidad: 1, precioVentaUnitario: 2500 },
      { productoId: 10, nombre: 'Producto A', cantidad: 3, precioVentaUnitario: 2500 }
    ]
  });
  assert.equal(resultado.items.length, 1);
  assert.equal(resultado.items[0].cantidad, 4);
});

test('HU-0404 Fase B: descarta ítems inválidos sin romper el carrito', () => {
  const resultado = mapearPrecargaCarrito({
    items: [
      { productoId: 10, nombre: 'Válido', cantidad: 1, precioVentaUnitario: 2500 },
      { productoId: 0, nombre: 'Sin id', cantidad: 1, precioVentaUnitario: 2500 },
      { productoId: 20, nombre: 'Cantidad cero', cantidad: 0, precioVentaUnitario: 2500 },
      { productoId: 30, nombre: 'Precio inválido', cantidad: 1, precioVentaUnitario: 0 },
      { productoId: 40, nombre: '', cantidad: 1, precioVentaUnitario: 2500 },
      null
    ]
  });
  assert.deepEqual(resultado.items.map((item) => item.id), [10]);
});

test('HU-0404 Fase B: tolera precargas vacías o malformadas', () => {
  for (const valor of [null, undefined, {}, { items: null }, { items: 'no-es-array' }]) {
    const resultado = mapearPrecargaCarrito(valor);
    assert.deepEqual(resultado.items, []);
    assert.equal(resultado.nombreCliente, 'Consumidor Final');
    assert.equal(resultado.preciosActualizados, false);
  }
});

test('HU-0404 Fase B: usa el consecutivo de facturaAnulada si no viene directo', () => {
  const resultado = mapearPrecargaCarrito({
    facturaAnulada: { consecutivo: 'F-0012' },
    items: []
  });
  assert.equal(resultado.consecutivo, 'F-0012');
});
