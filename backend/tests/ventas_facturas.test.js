/**
 * Tests automatizados para:
 *  - HU-0302: Búsqueda de producto por nombre en el módulo de ventas.
 *  - HU-0403: Generación de factura con nombre de cliente opcional.
 *
 * Autor: Santiago (módulo de ventas y facturación, Sprint 3)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app.js';
import { db } from '../src/infraestructura/database/conexion.js';
import { inicializarEsquema } from '../src/infraestructura/database/esquema.js';

describe('HU-0302 y HU-0403 — Búsqueda por nombre y Facturación', () => {
  let tokenVendedor;
  let tokenAdmin;
  let ventaIdPrueba;

  before(async () => {
    // Esquema siempre limpio para los tests
    inicializarEsquema();

    // ── Login vendedor ──
    const resVendedor = await request(app)
      .post('/api/auth/login')
      .send({ username: 'vendedor', password: 'vendedor123' });
    tokenVendedor = resVendedor.body.token ?? resVendedor.body.data?.token;

    // ── Login admin ──
    const resAdmin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin2', password: 'admin123' });
    tokenAdmin = resAdmin.body.token ?? resAdmin.body.data?.token;

    if (!tokenVendedor) console.error(' Login vendedor falló:', resVendedor.body);
    if (!tokenAdmin) console.error(' Login admin falló:', resAdmin.body);
    else console.log(' Tokens obtenidos');
  });

  // ══════════════════════════════════════════════════════════════════
  // HU-0302 — Búsqueda por nombre
  // ══════════════════════════════════════════════════════════════════

  describe('HU-0302: Búsqueda de productos por nombre', () => {

    it('CA-1: Búsqueda con texto válido devuelve productos coincidentes (200)', async () => {
      // Asegurar que haya al menos un producto en la BD
      const primer = db.prepare("SELECT nombre FROM products WHERE activo = 1 LIMIT 1").get();
      if (!primer) {
        console.log('Sin productos en BD, saltando CA-1 HU-0302');
        return;
      }
      const palabraClave = primer.nombre.split(' ')[0]; // primer palabra del nombre

      const res = await request(app)
        .get(`/api/ventas/productos/buscar?nombre=${encodeURIComponent(palabraClave)}`)
        .set('Authorization', `Bearer ${tokenVendedor}`);

      assert.strictEqual(res.status, 200, `Esperaba 200, recibí ${res.status}: ${JSON.stringify(res.body)}`);
      assert.ok(Array.isArray(res.body.data), 'data debe ser array');
      assert.ok(res.body.data.length > 0, 'Debe retornar al menos un resultado');
      console.log(` Búsqueda por "${palabraClave}" → ${res.body.data.length} resultado(s)`);
    });

    it('CA-3: Búsqueda sin coincidencias devuelve array vacío (200, no error)', async () => {
      const res = await request(app)
        .get('/api/ventas/productos/buscar?nombre=XYZPRODUCTO_INEXISTENTE_99999')
        .set('Authorization', `Bearer ${tokenVendedor}`);

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.data), 'data debe ser array');
      assert.strictEqual(res.body.data.length, 0, 'No debe retornar productos');
      console.log(' Sin coincidencias → array vacío, sin error bloqueante');
    });

    it('Sin token — debe rechazar con 401', async () => {
      const res = await request(app)
        .get('/api/ventas/productos/buscar?nombre=cafe');

      assert.strictEqual(res.status, 401);
      console.log(' Sin token → 401');
    });

    it('Búsqueda vacía — devuelve array vacío inmediatamente (200)', async () => {
      const res = await request(app)
        .get('/api/ventas/productos/buscar?nombre=')
        .set('Authorization', `Bearer ${tokenVendedor}`);

      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(res.body.data, [], 'Texto vacío → array vacío');
      console.log(' Texto vacío → array vacío');
    });

    it('RBAC HU-0607: vendedor no recibe campos de stock ni costo', async () => {
      const primer = db.prepare("SELECT nombre FROM products WHERE activo = 1 LIMIT 1").get();
      if (!primer) return;
      const palabra = primer.nombre.split(' ')[0];

      const res = await request(app)
        .get(`/api/ventas/productos/buscar?nombre=${encodeURIComponent(palabra)}`)
        .set('Authorization', `Bearer ${tokenVendedor}`);

      if (res.body.data?.length > 0) {
        const producto = res.body.data[0];
        assert.ok(!('stockActual' in producto), 'Vendedor NO debe ver stockActual');
        assert.ok(!('costoCompra' in producto), 'Vendedor NO debe ver costoCompra');
        console.log(' RBAC: vendedor no recibe campos protegidos');
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // HU-0403 — Factura con nombre de cliente
  // ══════════════════════════════════════════════════════════════════

  describe('HU-0403: Generación de factura con nombre de cliente', () => {

    before(async () => {
      // Crear una venta de prueba para generar facturas
      const primer = db.prepare("SELECT id FROM products WHERE activo = 1 AND stock_actual > 0 LIMIT 1").get();
      if (!primer) {
        console.log('⚠ Sin productos con stock, intentando con stock libre...');
        const cualquiera = db.prepare("SELECT id FROM products WHERE activo = 1 LIMIT 1").get();
        if (!cualquiera) { console.log('⚠ Sin productos en BD, tests de factura limitados'); return; }
      }

      const productoId = (db.prepare("SELECT id FROM products WHERE activo = 1 LIMIT 1").get())?.id;
      if (!productoId) return;

      const resVenta = await request(app)
        .post('/api/ventas')
        .set('Authorization', `Bearer ${tokenVendedor}`)
        .send({
          items: [{ productoId, cantidad: 1 }],
          medioPago: 'EFECTIVO',
          montoRecibido: 99999
        });

      if (resVenta.status === 201) {
        ventaIdPrueba = resVenta.body.data?.id;
        console.log(` Venta de prueba creada con ID: ${ventaIdPrueba}`);
      } else {
        console.error(' No se pudo crear venta de prueba:', resVenta.body);
      }
    });

    it('CA-1: Generar factura con nombre de cliente (201 + consecutivo)', async () => {
      if (!ventaIdPrueba) { console.log('⚠ Sin ventaId, saltando CA-1 HU-0403'); return; }

      const res = await request(app)
        .post('/api/ventas/facturas')
        .set('Authorization', `Bearer ${tokenVendedor}`)
        .send({ ventaId: ventaIdPrueba, nombreCliente: 'Carlos Pérez' });

      assert.strictEqual(res.status, 201, `Esperaba 201, recibí ${res.status}: ${JSON.stringify(res.body)}`);
      assert.ok(res.body.data?.consecutivo, 'Debe retornar consecutivo');
      assert.strictEqual(res.body.data?.nombreCliente, 'Carlos Pérez');
      console.log(` Factura emitida: ${res.body.data.consecutivo} · Cliente: ${res.body.data.nombreCliente}`);
    });

    it('CA-2: Generar factura SIN nombre de cliente — nombreCliente = null (201)', async () => {
      // Crear otra venta para esta prueba
      const productoId = db.prepare("SELECT id FROM products WHERE activo = 1 LIMIT 1").get()?.id;
      if (!productoId) { console.log('⚠ Sin productos, saltando CA-2 HU-0403'); return; }

      const resVenta = await request(app)
        .post('/api/ventas')
        .set('Authorization', `Bearer ${tokenVendedor}`)
        .send({ items: [{ productoId, cantidad: 1 }], medioPago: 'EFECTIVO', montoRecibido: 99999 });

      const ventaId2 = resVenta.body.data?.id;
      if (!ventaId2) return;

      const res = await request(app)
        .post('/api/ventas/facturas')
        .set('Authorization', `Bearer ${tokenVendedor}`)
        .send({ ventaId: ventaId2, nombreCliente: '' }); // cadena vacía = null

      assert.strictEqual(res.status, 201);
      assert.ok(
        res.body.data?.nombreCliente === null || res.body.data?.nombreCliente === 'Consumidor Final',
        'Sin nombre → Consumidor Final o null en BD'
      );
      console.log(' Factura sin nombre → consumidor final asignado');
    });

    it('Solicitud inválida — ventaId no numérico → 400', async () => {
      const res = await request(app)
        .post('/api/ventas/facturas')
        .set('Authorization', `Bearer ${tokenVendedor}`)
        .send({ ventaId: 'ABC', nombreCliente: 'Test' });

      assert.strictEqual(res.status, 400);
      console.log(' ventaId inválido → 400');
    });

    it('Venta inexistente → 400 o 404', async () => {
      const res = await request(app)
        .post('/api/ventas/facturas')
        .set('Authorization', `Bearer ${tokenVendedor}`)
        .send({ ventaId: 999999, nombreCliente: 'Test' });

      assert.ok([400, 404].includes(res.status), `Esperaba 400 o 404, recibí ${res.status}`);
      console.log('Venta inexistente → 400 o 404');
    });

    it('Buscar factura por consecutivo (GET /api/ventas/facturas/:consecutivo)', async () => {
      // Obtener el consecutivo de la primera factura generada en los tests previos
      const factura = db.prepare("SELECT consecutivo FROM facturas ORDER BY id DESC LIMIT 1").get();
      if (!factura) { console.log('⚠ Sin facturas en BD, saltando búsqueda'); return; }

      const res = await request(app)
        .get(`/api/ventas/facturas/${encodeURIComponent(factura.consecutivo)}`)
        .set('Authorization', `Bearer ${tokenVendedor}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data?.consecutivo, factura.consecutivo);
      console.log(` Factura encontrada por consecutivo: ${factura.consecutivo}`);
    });

    it('Consecutivo inexistente → 404', async () => {
      const res = await request(app)
        .get('/api/ventas/facturas/GES-00000000-00000')
        .set('Authorization', `Bearer ${tokenVendedor}`);

      assert.strictEqual(res.status, 404);
      console.log(' Consecutivo inexistente → 404');
    });
  });
});
