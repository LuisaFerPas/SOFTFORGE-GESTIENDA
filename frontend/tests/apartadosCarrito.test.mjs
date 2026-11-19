import test from 'node:test';
import assert from 'node:assert/strict';
import { agregarAlApartado, ajustarCantidadApartado, buscarEnCatalogo, productoCatalogo, resumenApartado } from '../src/modulos/apartados/presentacion/apartadosCarrito.js';
const cepillo = { id: 1, nombre: 'Cepillo Plástico', codigoInterno: 'CP-01', categoria: 'Aseo', precioVentaUnitario: 6500, stockActual: 3, activo: true };
const pelota = { id: 2, nombre: 'Pelota', codigoBarras: '770123', precioVentaUnitario: 9000, stockActual: 5 };
test('catálogo: normaliza y busca sin tildes, por código o categoría', () => {
  const lista = [cepillo, pelota].map(productoCatalogo);
  assert.equal(buscarEnCatalogo(lista, 'plastico')[0].id, 1);
  assert.equal(buscarEnCatalogo(lista, 'CP-01')[0].id, 1);
  assert.equal(buscarEnCatalogo(lista, '770123')[0].id, 2);
});
test('carrito: agrega y acumula cantidades del mismo producto', () => {
  const a = agregarAlApartado([], cepillo);
  const b = agregarAlApartado(a, cepillo, 2);
  assert.equal(b.length, 1);
  assert.equal(b[0].cantidad, 3);
});
test('carrito: evita apartar más unidades de las disponibles', () => {
  assert.throws(() => agregarAlApartado([{...productoCatalogo(cepillo),cantidad:3}], cepillo), /Solo hay 3/);
});
test('carrito: evita cantidades fraccionarias, negativas y precio cero', () => {
  assert.throws(() => agregarAlApartado([], cepillo, 1.5), /entero/);
  assert.throws(() => agregarAlApartado([], {...pelota,precioVentaUnitario:0}), /no está disponible/);
});
test('carrito: decrementa sin bajar de una unidad', () => {
  const a = agregarAlApartado([], pelota, 2);
  assert.equal(ajustarCantidadApartado(a,2,1)[0].cantidad,1);
  assert.throws(() => ajustarCantidadApartado(a,2,0), /entero/);
});
test('resumen: calcula total, unidades, abono y saldo sin negativos', () => {
  const c = agregarAlApartado(agregarAlApartado([],cepillo,2),pelota);
  assert.deepEqual(resumenApartado(c,5000), {unidades:3,total:22000,abono:5000,saldo:17000});
  assert.equal(resumenApartado(c,50000).saldo,0);
});

test('vendedor: permite elegir sin revelar stock; la API debe validar la reserva', () => {
  const sinStock = productoCatalogo({ id: 9, nombre:'Lápiz', precioVentaUnitario:1000 });
  assert.equal(sinStock.stockActual, null);
  assert.equal(agregarAlApartado([], sinStock)[0].cantidad,1);
});
