import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leer = (ruta) => readFileSync(new URL(`../src/${ruta}`, import.meta.url), 'utf8');

test('tarjetas: Ver más y Ver menos son botones accesibles y desplegables', () => {
  const jsx = leer('compartido/componentes/MobileDetailCard.jsx');
  assert.match(jsx, /aria-expanded=\{abierto\}/);
  assert.match(jsx, /aria-controls=\{id\}/);
  assert.match(jsx, /abierto \? 'Ver menos' : 'Ver más'/);
  assert.match(jsx, /hidden=\{!abierto\}/);
});

test('tarjetas: móvil reemplaza tabla y escritorio conserva tabla', () => {
  const css = leer('compartido/componentes/mobileDetailCard.css');
  assert.match(css, /@media\(max-width:850px\)/);
  assert.match(css, /\.dm-desktop-only \{display:none!important;\}/);
  assert.match(css, /\.dm-mobile-list \{display:grid;/);
});

test('facturas: conserva tabla, tarjeta móvil y acciones originales', () => {
  const jsx = leer('modulos/ventas/presentacion/HistorialFacturasPage.jsx');
  for (const texto of ['fh-table-wrap dm-desktop-only', 'fh-mobile-list', 'MobileDetailCard', 'ReimprimirFacturaButton', 'EditarFacturaButton', 'ReutilizarVentaButton']) {
    assert.ok(jsx.includes(texto), `No aparece ${texto}`);
  }
});

test('usuarios: no comprime el nombre del usuario en columnas móviles', () => {
  const jsx = leer('modulos/usuarios/presentacion/TablaUsuarios.jsx');
  const css = leer('modulos/usuarios/presentacion/usuariosResponsive.css');
  assert.match(jsx, /dm-users__cards/);
  assert.match(jsx, /dm-users__table/);
  assert.match(css, /word-break:normal/);
  assert.match(css, /white-space:nowrap/);
});

test('pagos: la vista móvil presenta operación, monto y desglose', () => {
  const jsx = leer('modulos/estadisticas/presentacion/componentes/ListadoPagosDia.jsx');
  assert.match(jsx, /className="dm-desktop-only"/);
  assert.match(jsx, /dm-payments-mobile/);
  assert.match(jsx, /Medio de pago/);
  assert.match(jsx, /formatCOP\.format/);
});

test('dashboard: elimina el grid inline que impedía una columna móvil', () => {
  const jsx = leer('modulos/dashboard/presentacion/DashboardPage.jsx');
  const css = leer('modulos/dashboard/presentacion/dashboardResponsiveCards.css');
  assert.ok(!jsx.includes("style={{ gridTemplateColumns: isAdmin"));
  assert.match(jsx, /dm-home-panels/);
  assert.match(css, /@media\(max-width:1160px\)/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\)/);
});

test('animaciones: respeta preferencia de movimiento reducido', () => {
  for (const ruta of ['compartido/componentes/mobileDetailCard.css','compartido/componentes/mobileMenuMotion.css','modulos/dashboard/presentacion/dashboardResponsiveCards.css']) {
    assert.match(leer(ruta), /prefers-reduced-motion:reduce/, `Falta soporte en ${ruta}`);
  }
});
