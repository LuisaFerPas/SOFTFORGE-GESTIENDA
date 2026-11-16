import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { db } from '../src/infraestructura/database/conexion.js';

describe('Suite de Integración y End-to-End (E2E) — Gestienda Don Mati (GES-503)', () => {
  let tokenAdmin = '';
  let tokenVendedor = '';
  let productoPruebaId = 0;
  let productoPruebaCodigo = '';
  let productoStockInicial = 0;
  let precioVentaUnitario = 0;

  before(async () => {
    // 1. Obtener Token de Administrador
    const resAdmin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin1', password: 'admin123' });
    
    assert.strictEqual(resAdmin.status, 200, 'Login de admin1 debe responder 200');
    tokenAdmin = resAdmin.body.data?.token || resAdmin.body.token;
    assert.ok(tokenAdmin, 'Debe retornar un token JWT válido para Administrador');

    // 2. Obtener Token de Vendedor
    const resVendedor = await request(app)
      .post('/api/auth/login')
      .send({ username: 'vendedor', password: 'vendedor123' });

    assert.strictEqual(resVendedor.status, 200, 'Login de vendedor debe responder 200');
    tokenVendedor = resVendedor.body.data?.token || resVendedor.body.token;
    assert.ok(tokenVendedor, 'Debe retornar un token JWT válido para Vendedor');

    // 3. Obtener o crear un producto de prueba en la base de datos con stock suficiente
    let prod = db.prepare('SELECT * FROM products WHERE activo = 1 AND stock_actual >= 10 LIMIT 1').get();
    if (!prod) {
      // Si no existe con stock, asegurar stock de al menos 20
      prod = db.prepare('SELECT * FROM products WHERE activo = 1 LIMIT 1').get();
      if (prod) {
        db.prepare('UPDATE products SET stock_actual = 20 WHERE id = ?').run(prod.id);
        prod.stock_actual = 20;
      }
    }

    assert.ok(prod, 'Debe existir al menos un producto en la base de datos para la suite de integración');
    productoPruebaId = prod.id;
    productoPruebaCodigo = prod.codigo_interno;
    productoStockInicial = Number(prod.stock_actual);
    precioVentaUnitario = Number(prod.precio_venta_unitario);
  });

  // ══════════════════════════════════════════════════════════════════
  // CASO 1: Autenticación, Roles y Control de Acceso RBAC
  // ══════════════════════════════════════════════════════════════════
  describe('CP-INT-01: Autenticación y Autorización por Roles', () => {
    it('Debe autenticar correctamente a admin1 con rol ADMINISTRADOR', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin1', password: 'admin123' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.user.role, 'ADMINISTRADOR');
    });

    it('Debe autenticar correctamente a vendedor con rol VENDEDOR', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'vendedor', password: 'vendedor123' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.user.role, 'VENDEDOR');
    });

    it('Debe denegar acceso (403) a un VENDEDOR que intente consultar estadísticas de ventas', async () => {
      const res = await request(app)
        .get('/api/estadisticas/ventas?periodo=DIA')
        .set('Authorization', `Bearer ${tokenVendedor}`);

      assert.strictEqual(res.status, 403, 'Vendedor no debe poder consultar reportes administrativos');
      assert.strictEqual(res.body.success, false);
    });

    it('Debe permitir acceso (200) a un ADMINISTRADOR a las estadísticas de ventas', async () => {
      const res = await request(app)
        .get('/api/estadisticas/ventas?periodo=DIA')
        .set('Authorization', `Bearer ${tokenAdmin}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });

    it('Debe permitir el cambio rápido de cajero sin cerrar la aplicación', async () => {
      const res = await request(app)
        .post('/api/auth/switch-user')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ username: 'vendedor', password: 'vendedor123' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.user.username, 'vendedor');
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // CASO 2: Flujo Completo de Venta Directa e Inventario
  // ══════════════════════════════════════════════════════════════════
  describe('CP-INT-02: Flujo Completo de Venta Directa e Inventario', () => {
    it('Debe registrar una venta en efectivo, generar factura y descontar stock atómicamente', async () => {
      const stockAntes = db.prepare('SELECT stock_actual FROM products WHERE id = ?').get(productoPruebaId).stock_actual;
      const cantidadVendida = 2;
      const totalEsperado = precioVentaUnitario * cantidadVendida;
      const montoRecibido = totalEsperado + 5000;

      const res = await request(app)
        .post('/api/ventas')
        .set('Authorization', `Bearer ${tokenVendedor}`)
        .send({
          items: [{ productoId: productoPruebaId, cantidad: cantidadVendida }],
          medioPago: 'EFECTIVO',
          montoRecibido
        });

      assert.strictEqual(res.status, 201, `Error al crear venta: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.success, true);
      const ventaId = res.body.data.id;
      assert.ok(ventaId, 'Debe devolver el ID de la venta creada');
      assert.strictEqual(res.body.data.total, totalEsperado);
      assert.strictEqual(res.body.data.cambio, 5000);

      // Verificar que el stock disminuyó exactamente en SQLite
      const stockDespues = db.prepare('SELECT stock_actual FROM products WHERE id = ?').get(productoPruebaId).stock_actual;
      assert.strictEqual(stockDespues, stockAntes - cantidadVendida, 'El stock debió rebajarse en la cantidad vendida');

      // Generar y persistir la factura vinculada
      const resFactura = await request(app)
        .post('/api/ventas/facturas')
        .set('Authorization', `Bearer ${tokenVendedor}`)
        .send({ ventaId, nombreCliente: 'Cliente Don Mati E2E' });

      assert.strictEqual(resFactura.status, 201, `Error al generar factura: ${JSON.stringify(resFactura.body)}`);
      assert.ok(resFactura.body.data?.consecutivo);

      // Verificar la factura en la base de datos
      const facturaEnBD = db.prepare('SELECT * FROM facturas WHERE venta_id = ?').get(ventaId);
      assert.ok(facturaEnBD, 'Toda venta debe tener su factura registrada en BD');
      assert.match(facturaEnBD.consecutivo, /^F-[0-9]{4,}$/, 'El consecutivo debe tener formato F-XXXX');
      assert.strictEqual(facturaEnBD.estado, 'EMITIDA');
      assert.strictEqual(facturaEnBD.nombre_cliente, 'Cliente Don Mati E2E');
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // CASO 3: Ciclo Completo de Apartados (Crear -> Abonar -> Liquidar)
  // ══════════════════════════════════════════════════════════════════
  describe('CP-INT-03: Ciclo Completo de Apartados', () => {
    let apartadoId = 0;
    const cantidadApartada = 1;
    const abonoInicial = 5000;

    it('Debe crear un apartado activo con abono inicial y reservar el stock físico', async () => {
      const stockAntes = db.prepare('SELECT stock_actual FROM products WHERE id = ?').get(productoPruebaId).stock_actual;

      const res = await request(app)
        .post('/api/apartados')
        .set('Authorization', `Bearer ${tokenVendedor}`)
        .send({
          clienteNombre: 'María Gómez E2E',
          productos: [{ productoId: productoPruebaId, cantidad: cantidadApartada }],
          abonoInicial
        });

      assert.strictEqual(res.status, 201, `Error al crear apartado: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.success, true);
      apartadoId = res.body.data.id;
      assert.ok(apartadoId, 'Debe retornar el ID del apartado');
      assert.strictEqual(res.body.data.estado, 'ACTIVO');

      // Verificar que el stock físico fue descontado/reservado
      const stockDespues = db.prepare('SELECT stock_actual FROM products WHERE id = ?').get(productoPruebaId).stock_actual;
      assert.strictEqual(stockDespues, stockAntes - cantidadApartada, 'El apartado debe reservar el stock');
    });

    it('Debe consultar los apartados activos y encontrar el recién creado', async () => {
      const res = await request(app)
        .get('/api/apartados/activos')
        .set('Authorization', `Bearer ${tokenVendedor}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      const encontrado = res.body.data.find(a => a.id === apartadoId);
      assert.ok(encontrado, 'El apartado debe aparecer en la lista de activos');
      assert.strictEqual(encontrado.clienteNombre, 'María Gómez E2E');
    });

    it('Debe registrar un abono adicional y reducir el saldo pendiente', async () => {
      const abonoParcial = 2000;
      const res = await request(app)
        .post(`/api/apartados/${apartadoId}/abonos`)
        .set('Authorization', `Bearer ${tokenVendedor}`)
        .send({ monto: abonoParcial, medioPago: 'EFECTIVO' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      const estadoApartado = res.body.data.apartado?.estado || res.body.data.estado;
      assert.strictEqual(estadoApartado, 'ACTIVO');
    });

    it('Debe liquidar el saldo total y completar automáticamente el apartado', async () => {
      // Consultar saldo actual
      const apt = db.prepare('SELECT saldo_pendiente FROM apartados WHERE id = ?').get(apartadoId);
      const saldoRestante = Number(apt.saldo_pendiente);

      const res = await request(app)
        .post(`/api/apartados/${apartadoId}/abonos`)
        .set('Authorization', `Bearer ${tokenVendedor}`)
        .send({ monto: saldoRestante, medioPago: 'NEQUI' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      const estadoFinal = res.body.data.apartado?.estado || res.body.data.estado;
      assert.strictEqual(estadoFinal, 'COMPLETADO', 'El apartado debe quedar en estado COMPLETADO');
      assert.strictEqual(res.body.data.completado, true, 'El indicador completado debe ser true');
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // CASO 4: Cancelación de Apartado y Restitución Atómica de Stock
  // ══════════════════════════════════════════════════════════════════
  describe('CP-INT-04: Cancelación de Apartado y Restitución de Stock', () => {
    let apartadoCancelarId = 0;
    const unidadesACancelar = 2;

    it('Debe crear un apartado temporal para prueba de cancelación', async () => {
      const res = await request(app)
        .post('/api/apartados')
        .set('Authorization', `Bearer ${tokenVendedor}`)
        .send({
          clienteNombre: 'Cliente Cancelación E2E',
          productos: [{ productoId: productoPruebaId, cantidad: unidadesACancelar }],
          abonoInicial: 10000
        });

      assert.strictEqual(res.status, 201);
      apartadoCancelarId = res.body.data.id;
    });

    it('Debe cancelar el apartado y devolver íntegramente las unidades al inventario', async () => {
      const stockAntesCancelar = db.prepare('SELECT stock_actual FROM products WHERE id = ?').get(productoPruebaId).stock_actual;

      const res = await request(app)
        .patch(`/api/apartados/${apartadoCancelarId}/cancelar`)
        .set('Authorization', `Bearer ${tokenAdmin}`);

      assert.strictEqual(res.status, 200, `Fallo al cancelar: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.cancelado, true);

      // Verificar en la BD que el stock se restauró
      const stockDespuesCancelar = db.prepare('SELECT stock_actual FROM products WHERE id = ?').get(productoPruebaId).stock_actual;
      assert.strictEqual(stockDespuesCancelar, stockAntesCancelar + unidadesACancelar, 'Las unidades debieron restituirse al stock');

      // Verificar que el estado en la tabla apartados sea CANCELADO
      const estadoEnBD = db.prepare('SELECT estado FROM apartados WHERE id = ?').get(apartadoCancelarId).estado;
      assert.strictEqual(estadoEnBD, 'CANCELADO');
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // CASO 5: Cuadre de Caja y Consolidación de Pagos del Día
  // ══════════════════════════════════════════════════════════════════
  describe('CP-INT-05: Cierre de Caja y Consolidación de Pagos', () => {
    it('Debe consultar los totales de caja del día agrupados por medio de pago', async () => {
      const res = await request(app)
        .get('/api/pagos/dia/totales')
        .set('Authorization', `Bearer ${tokenAdmin}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok('totalDia' in res.body.data);
      assert.ok('totalEfectivo' in res.body.data);
      assert.ok('totalNequi' in res.body.data);
      assert.ok(Number(res.body.data.totalDia) >= 0);
    });

    it('Debe listar el desglose individual de pagos realizados en la jornada', async () => {
      const res = await request(app)
        .get('/api/pagos/dia')
        .set('Authorization', `Bearer ${tokenVendedor}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // CASO 6: Concurrencia y Estabilidad SQLite en Modo WAL
  // ══════════════════════════════════════════════════════════════════
  describe('CP-INT-06: Concurrencia y Estabilidad SQLite (Modo WAL)', () => {
    it('Debe soportar múltiples peticiones concurrentes de lectura y escritura sin bloqueos', async () => {
      // Disparar 6 peticiones en paralelo (ventas y consultas)
      const promesas = [
        request(app).get('/api/inventario/productos').set('Authorization', `Bearer ${tokenAdmin}`),
        request(app).get('/api/apartados/activos').set('Authorization', `Bearer ${tokenVendedor}`),
        request(app).get('/api/pagos/dia/totales').set('Authorization', `Bearer ${tokenAdmin}`),
        request(app).get('/api/sistema/red'),
        request(app).get('/api/health'),
        request(app).post('/api/ventas').set('Authorization', `Bearer ${tokenVendedor}`).send({
          items: [{ productoId: productoPruebaId, cantidad: 1 }],
          medioPago: 'EFECTIVO',
          montoRecibido: precioVentaUnitario
        })
      ];

      const resultados = await Promise.all(promesas);

      for (let i = 0; i < resultados.length; i++) {
        const res = resultados[i];
        assert.ok(res.status === 200 || res.status === 201, `Petición concurrente #${i + 1} falló con status ${res.status}`);
      }
    });
  });
});
