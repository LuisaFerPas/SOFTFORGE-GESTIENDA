import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app.js';

describe('Pruebas de Inventario - Entradas de Stock', () => {
  let tokenAdmin;
  let tokenVendedor;
  let productoIdPrueba; 

  before(async () => {
    // --- LOGIN ADMIN ---
    const loginAdmin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin1', password: 'admin123' });
    
    tokenAdmin = loginAdmin.body.token || (loginAdmin.body.data && loginAdmin.body.data.token);

    if (loginAdmin.status !== 200 || !tokenAdmin) {
      console.error("❌ ERROR EN LOGIN ADMIN:", loginAdmin.body);
    } else {
      console.log("✅ Token Admin obtenido correctamente");
    }

    // --- LOGIN VENDEDOR ---
    const loginVendedor = await request(app)
      .post('/api/auth/login')
      .send({ username: 'vendedor', password: 'vendedor123' });
    
    tokenVendedor = loginVendedor.body.token || (loginVendedor.body.data && loginVendedor.body.data.token);

    if (loginVendedor.status !== 200 || !tokenVendedor) {
      console.error("❌ ERROR EN LOGIN VENDEDOR:", loginVendedor.body);
    } else {
      console.log("✅ Token Vendedor obtenido correctamente");
    }

    // --- OBTENER UN PRODUCTO REAL DE LA BD ---
    // Buscamos la lista de productos para tomar el ID del primero que exista
    const resProductos = await request(app)
      .get('/api/inventario/productos')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    
    if (resProductos.body && resProductos.body.length > 0) {
      productoIdPrueba = resProductos.body[0].id;
      console.log(`✅ Usando Producto ID: ${productoIdPrueba} para las pruebas`);
    } else {
      console.error("❌ No hay productos en la BD para probar las entradas.");
      productoIdPrueba = 1; // Fallback por si acaso
    }
  });

  it('Debería registrar una entrada de stock exitosamente (HU-0601)', async () => {
    // Si no hay producto, saltamos el test para que no falle
    if (!productoIdPrueba) return;

    const res = await request(app)
      .post('/api/inventario/stock/entrada')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        productoId: productoIdPrueba,
        cantidad: 5,
        costoUnitario: 1000,
        motivo: 'Test automatizado'
      });

    if (res.status !== 201) console.error("❌ ERROR ENTRADA:", res.status, res.body);

    assert.strictEqual(res.status, 201);
    assert.match(res.body.message, /exitosamente/);
  });

  it('Debería rechazar cantidades negativas o cero (HU-0602.3)', async () => {
    // Si no hay producto, saltamos el test
    if (!productoIdPrueba) return;

    const res = await request(app)
      .post('/api/inventario/stock/entrada')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ productoId: productoIdPrueba, cantidad: -5 });

    assert.strictEqual(res.status, 400);
    assert.match(res.body.message, /número entero positivo/);
  });

  it('Debería devolver el historial de entradas (HU-0603)', async () => {
    const res = await request(app)
      .get('/api/inventario/stock/entradas')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('Debería denegar el acceso a un Vendedor (403)', async () => {
    // Si no hay producto, saltamos el test
    if (!productoIdPrueba) return;

    const res = await request(app)
      .post('/api/inventario/stock/entrada')
      .set('Authorization', `Bearer ${tokenVendedor}`)
      .send({ productoId: productoIdPrueba, cantidad: 5 });

    assert.strictEqual(res.status, 403);
  });
});