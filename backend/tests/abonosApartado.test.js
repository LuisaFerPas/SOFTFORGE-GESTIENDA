import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { Apartado } from '../src/modulos/apartados/dominio/Apartado.js';
import { SQLiteApartadoRepository } from '../src/modulos/apartados/infraestructura/persistencia/SQLiteApartadoRepository.js';
import { AbonoApartadoUseCase } from '../src/modulos/apartados/servicios/AbonoApartadoUseCase.js';
import { EventBus } from '../src/shared/EventBus.js';

process.env.JWT_SECRET ||= 'clave-de-prueba-hu0702-no-usar-en-produccion';

const { default: express } = await import('express');
const { default: jwt } = await import('jsonwebtoken');
const { ApartadoService } = await import('../src/modulos/apartados/servicios/ApartadoService.js');
const { ApartadoController } = await import('../src/modulos/apartados/presentacion/apartadoController.js');
const { crearApartadosRoutes } = await import('../src/modulos/apartados/presentacion/apartadosRoutes.js');

function crearEscenario() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE users (id INTEGER PRIMARY KEY);
    INSERT INTO users VALUES (1);

    CREATE TABLE products (id INTEGER PRIMARY KEY, nombre TEXT);
    INSERT INTO products VALUES (1, 'Producto de prueba');

    CREATE TABLE apartados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE NOT NULL,
      cliente_nombre TEXT NOT NULL,
      cliente_telefono TEXT,
      usuario_id INTEGER NOT NULL,
      total_productos REAL NOT NULL,
      abono_inicial REAL NOT NULL,
      saldo_pendiente REAL NOT NULL,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_limite TEXT,
      estado TEXT NOT NULL DEFAULT 'ACTIVO'
    );

    CREATE TABLE apartado_productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      apartado_id INTEGER NOT NULL,
      producto_id INTEGER NOT NULL,
      cantidad INTEGER NOT NULL,
      precio_unitario REAL NOT NULL,
      subtotal REAL NOT NULL
    );

    CREATE TABLE apartado_abonos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      apartado_id INTEGER NOT NULL,
      usuario_id INTEGER NOT NULL,
      monto REAL NOT NULL,
      medio_pago TEXT NOT NULL DEFAULT 'EFECTIVO',
      saldo_restante REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const repositorio = new SQLiteApartadoRepository(db);
  const eventBus = new EventBus();
  const casoUso = new AbonoApartadoUseCase(repositorio, eventBus);

  return { db, repositorio, eventBus, casoUso };
}

async function crearApartado(repositorio, {
  total = 50000,
  abonoInicial = 20000,
  estado,
  clienteNombre = 'Cliente Prueba'
} = {}) {
  const apartado = new Apartado({
    clienteNombre,
    usuarioId: 1,
    productos: [{
      productoId: 1,
      nombre: 'Producto de prueba',
      cantidad: 1,
      precioUnitario: total
    }],
    abonoInicial,
    estado
  });
  return repositorio.guardar(apartado);
}

function contarAbonos(db, apartadoId) {
  return db.prepare(
    'SELECT COUNT(*) AS total FROM apartado_abonos WHERE apartado_id = ?'
  ).get(apartadoId).total;
}

async function crearServidorHttp(repositorio, eventBus) {
  const servicio = new ApartadoService(repositorio, eventBus);
  const controlador = new ApartadoController(servicio);
  const app = express();
  app.use(express.json());
  app.use('/api/apartados', crearApartadosRoutes(controlador));

  const servidor = await new Promise((resolve) => {
    const instancia = app.listen(0, '127.0.0.1', () => resolve(instancia));
  });

  return {
    url: `http://127.0.0.1:${servidor.address().port}/api/apartados`,
    cerrar: () => new Promise((resolve, reject) => {
      servidor.close((error) => (error ? reject(error) : resolve()));
    })
  };
}

function tokenValido() {
  return jwt.sign(
    { id: 1, username: 'admin1', role: 'ADMINISTRADOR' },
    process.env.JWT_SECRET
  );
}

async function solicitar(url, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const respuesta = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  return {
    status: respuesta.status,
    body: await respuesta.json()
  };
}

test('HU-0702: un abono parcial baja el saldo y mantiene el apartado ACTIVO', async () => {
  const { db, repositorio, casoUso } = crearEscenario();
  try {
    const id = await crearApartado(repositorio, { total: 50000, abonoInicial: 20000 });

    const resultado = await casoUso.registrar(id, { monto: 10000, medioPago: 'NEQUI' }, 1);

    assert.equal(resultado.isSuccess, true);
    const datos = resultado.getValue();
    assert.equal(datos.completado, false);
    assert.equal(datos.apartado.saldoPendiente, 20000);
    assert.equal(datos.apartado.estado, 'ACTIVO');

    const guardado = await repositorio.buscarPorId(id);
    assert.equal(guardado.saldoPendiente, 20000);
    assert.equal(guardado.estado, 'ACTIVO');
    assert.equal(guardado.abonosAdicionales.length, 1);
    assert.equal(guardado.abonosAdicionales[0].monto, 10000);
    assert.equal(guardado.abonosAdicionales[0].medioPago, 'NEQUI');
    assert.equal(contarAbonos(db, id), 2); // abono inicial + abono adicional
  } finally {
    db.close();
  }
});

test('HU-0702: un abono final completa el apartado y emite apartado.completado', async () => {
  const { db, repositorio, eventBus, casoUso } = crearEscenario();
  try {
    const id = await crearApartado(repositorio, { total: 50000, abonoInicial: 20000 });
    let eventoRecibido = null;
    eventBus.subscribe('apartado.completado', (payload) => {
      eventoRecibido = payload;
    });

    const resultado = await casoUso.registrar(id, { monto: 30000, medioPago: 'EFECTIVO' }, 1);

    assert.equal(resultado.isSuccess, true);
    const datos = resultado.getValue();
    assert.equal(datos.completado, true);
    assert.equal(datos.apartado.saldoPendiente, 0);
    assert.equal(datos.apartado.estado, 'COMPLETADO');

    assert.notEqual(eventoRecibido, null);
    assert.equal(eventoRecibido.estado, 'COMPLETADO');
    assert.equal(eventoRecibido.saldoPendiente, 0);

    const guardado = await repositorio.buscarPorId(id);
    assert.equal(guardado.saldoPendiente, 0);
    assert.equal(guardado.estado, 'COMPLETADO');
  } finally {
    db.close();
  }
});

test('HU-0702: un monto mayor al saldo responde 400 y no inserta el abono', async () => {
  const { db, repositorio, casoUso } = crearEscenario();
  try {
    const id = await crearApartado(repositorio, { total: 50000, abonoInicial: 20000 });

    const resultado = await casoUso.registrar(id, { monto: 30001 }, 1);

    assert.equal(resultado.isFailure, true);
    assert.equal(resultado.error.status, 400);
    assert.match(resultado.error.message, /saldo pendiente/i);
    assert.equal(contarAbonos(db, id), 1); // solo el abono inicial
  } finally {
    db.close();
  }
});

test('HU-0702: montos no válidos o menores/iguales a cero responden 400', async () => {
  const { db, repositorio, casoUso } = crearEscenario();
  try {
    const id = await crearApartado(repositorio, { total: 50000, abonoInicial: 20000 });

    for (const monto of [0, -100, 'abc', null, undefined, NaN, Infinity]) {
      const resultado = await casoUso.registrar(id, { monto }, 1);
      assert.equal(resultado.isFailure, true, `monto inválido aceptado: ${String(monto)}`);
      assert.equal(resultado.error.status, 400);
    }

    assert.equal(contarAbonos(db, id), 1);
  } finally {
    db.close();
  }
});

test('HU-0702: un medio de pago inválido responde 400', async () => {
  const { db, repositorio, casoUso } = crearEscenario();
  try {
    const id = await crearApartado(repositorio, { total: 50000, abonoInicial: 20000 });

    const resultado = await casoUso.registrar(id, { monto: 1000, medioPago: 'TARJETA' }, 1);

    assert.equal(resultado.isFailure, true);
    assert.equal(resultado.error.status, 400);
    assert.match(resultado.error.message, /medio de pago/i);
    assert.equal(contarAbonos(db, id), 1);
  } finally {
    db.close();
  }
});

test('HU-0702: un apartado inexistente responde 404', async () => {
  const { db, casoUso } = crearEscenario();
  try {
    const resultado = await casoUso.registrar(9999, { monto: 1000 }, 1);

    assert.equal(resultado.isFailure, true);
    assert.equal(resultado.error.status, 404);
    assert.match(resultado.error.message, /no encontrado/i);
  } finally {
    db.close();
  }
});

test('HU-0702: un apartado CANCELADO o COMPLETADO responde 409', async () => {
  const { db, repositorio, casoUso } = crearEscenario();
  try {
    const canceladoId = await crearApartado(repositorio, {
      total: 50000,
      abonoInicial: 20000,
      estado: 'CANCELADO'
    });
    const completadoId = await crearApartado(repositorio, {
      total: 50000,
      abonoInicial: 50000
    });

    const cancelado = await casoUso.registrar(canceladoId, { monto: 1000 }, 1);
    const completado = await casoUso.registrar(completadoId, { monto: 1000 }, 1);

    assert.equal(cancelado.isFailure, true);
    assert.equal(cancelado.error.status, 409);
    assert.equal(completado.isFailure, true);
    assert.equal(completado.error.status, 409);
  } finally {
    db.close();
  }
});

test('HU-0702: listarActivos devuelve solo apartados ACTIVOS con sus abonos', async () => {
  const { db, repositorio, casoUso } = crearEscenario();
  try {
    const activoConAbono = await crearApartado(repositorio, {
      total: 50000,
      abonoInicial: 20000,
      clienteNombre: 'Cliente Activo Uno'
    });
    const activoSinAbono = await crearApartado(repositorio, {
      total: 30000,
      abonoInicial: 10000,
      clienteNombre: 'Cliente Activo Dos'
    });
    await crearApartado(repositorio, {
      total: 50000,
      abonoInicial: 50000,
      clienteNombre: 'Cliente Completado'
    });
    await crearApartado(repositorio, {
      total: 50000,
      abonoInicial: 20000,
      estado: 'CANCELADO',
      clienteNombre: 'Cliente Cancelado'
    });

    await casoUso.registrar(activoConAbono, { monto: 5000, medioPago: 'OTRO' }, 1);

    const resultado = await casoUso.listarActivos();

    assert.equal(resultado.isSuccess, true);
    const activos = resultado.getValue();
    assert.equal(activos.length, 2);
    assert.deepEqual(
      activos.map((apartado) => apartado.id).sort((a, b) => a - b),
      [activoConAbono, activoSinAbono].sort((a, b) => a - b)
    );

    const conAbono = activos.find((apartado) => apartado.id === activoConAbono);
    assert.equal(conAbono.estado, 'ACTIVO');
    assert.equal(conAbono.saldoPendiente, 25000);
    assert.equal(conAbono.abonosAdicionales.length, 1);
    assert.equal(conAbono.abonosAdicionales[0].monto, 5000);
    assert.equal(conAbono.abonosAdicionales[0].medioPago, 'OTRO');
  } finally {
    db.close();
  }
});

test('HU-0702 HTTP: GET /activos exige autenticación', async () => {
  const { db, repositorio, eventBus } = crearEscenario();
  const servidor = await crearServidorHttp(repositorio, eventBus);
  try {
    const respuesta = await solicitar(`${servidor.url}/activos`);

    assert.equal(respuesta.status, 401);
    assert.equal(respuesta.body.success, false);
  } finally {
    await servidor.cerrar();
    db.close();
  }
});

test('HU-0702 HTTP: GET /activos devuelve solo los apartados ACTIVOS', async () => {
  const { db, repositorio, eventBus } = crearEscenario();
  const servidor = await crearServidorHttp(repositorio, eventBus);
  try {
    const activoId = await crearApartado(repositorio, {
      total: 50000,
      abonoInicial: 20000,
      clienteNombre: 'Cliente Activo'
    });
    await crearApartado(repositorio, {
      total: 50000,
      abonoInicial: 50000,
      clienteNombre: 'Cliente Completado'
    });

    const respuesta = await solicitar(`${servidor.url}/activos`, { token: tokenValido() });

    assert.equal(respuesta.status, 200);
    assert.equal(respuesta.body.success, true);
    assert.equal(respuesta.body.data.length, 1);
    assert.equal(respuesta.body.data[0].id, activoId);
    assert.equal(respuesta.body.data[0].estado, 'ACTIVO');
  } finally {
    await servidor.cerrar();
    db.close();
  }
});

test('HU-0702 HTTP: POST /:id/abonos registra un abono parcial', async () => {
  const { db, repositorio, eventBus } = crearEscenario();
  const servidor = await crearServidorHttp(repositorio, eventBus);
  try {
    const id = await crearApartado(repositorio, { total: 50000, abonoInicial: 20000 });

    const respuesta = await solicitar(`${servidor.url}/${id}/abonos`, {
      method: 'POST',
      token: tokenValido(),
      body: { monto: 10000, medioPago: 'NEQUI' }
    });

    assert.equal(respuesta.status, 200);
    assert.equal(respuesta.body.success, true);
    assert.equal(respuesta.body.data.completado, false);
    assert.equal(respuesta.body.data.apartado.saldoPendiente, 20000);
    assert.equal(respuesta.body.data.apartado.estado, 'ACTIVO');
    assert.equal(respuesta.body.data.apartado.abonosAdicionales.length, 1);
  } finally {
    await servidor.cerrar();
    db.close();
  }
});

test('HU-0702 HTTP: POST /:id/abonos completa el apartado con el abono final', async () => {
  const { db, repositorio, eventBus } = crearEscenario();
  const servidor = await crearServidorHttp(repositorio, eventBus);
  try {
    const id = await crearApartado(repositorio, { total: 50000, abonoInicial: 20000 });

    const respuesta = await solicitar(`${servidor.url}/${id}/abonos`, {
      method: 'POST',
      token: tokenValido(),
      body: { monto: 30000, medioPago: 'EFECTIVO' }
    });

    assert.equal(respuesta.status, 200);
    assert.equal(respuesta.body.data.completado, true);
    assert.equal(respuesta.body.data.apartado.estado, 'COMPLETADO');
    assert.equal(respuesta.body.data.apartado.saldoPendiente, 0);
  } finally {
    await servidor.cerrar();
    db.close();
  }
});

test('HU-0702 HTTP: POST /:id/abonos rechaza un monto mayor al saldo con 400', async () => {
  const { db, repositorio, eventBus } = crearEscenario();
  const servidor = await crearServidorHttp(repositorio, eventBus);
  try {
    const id = await crearApartado(repositorio, { total: 50000, abonoInicial: 20000 });

    const respuesta = await solicitar(`${servidor.url}/${id}/abonos`, {
      method: 'POST',
      token: tokenValido(),
      body: { monto: 30001 }
    });

    assert.equal(respuesta.status, 400);
    assert.equal(respuesta.body.success, false);
    assert.match(respuesta.body.message, /saldo pendiente/i);
  } finally {
    await servidor.cerrar();
    db.close();
  }
});

test('HU-0702 HTTP: POST /:id/abonos responde 404 si el apartado no existe', async () => {
  const { db, repositorio, eventBus } = crearEscenario();
  const servidor = await crearServidorHttp(repositorio, eventBus);
  try {
    const respuesta = await solicitar(`${servidor.url}/9999/abonos`, {
      method: 'POST',
      token: tokenValido(),
      body: { monto: 1000 }
    });

    assert.equal(respuesta.status, 404);
    assert.equal(respuesta.body.success, false);
  } finally {
    await servidor.cerrar();
    db.close();
  }
});

test('HU-0702 HTTP: POST /:id/abonos responde 409 si el apartado no está ACTIVO', async () => {
  const { db, repositorio, eventBus } = crearEscenario();
  const servidor = await crearServidorHttp(repositorio, eventBus);
  try {
    const id = await crearApartado(repositorio, { total: 50000, abonoInicial: 50000 });

    const respuesta = await solicitar(`${servidor.url}/${id}/abonos`, {
      method: 'POST',
      token: tokenValido(),
      body: { monto: 1000 }
    });

    assert.equal(respuesta.status, 409);
    assert.equal(respuesta.body.success, false);
  } finally {
    await servidor.cerrar();
    db.close();
  }
});

test('HU-0702 HTTP: POST /:id/abonos exige autenticación', async () => {
  const { db, repositorio, eventBus } = crearEscenario();
  const servidor = await crearServidorHttp(repositorio, eventBus);
  try {
    const id = await crearApartado(repositorio, { total: 50000, abonoInicial: 20000 });

    const respuesta = await solicitar(`${servidor.url}/${id}/abonos`, {
      method: 'POST',
      body: { monto: 1000 }
    });

    assert.equal(respuesta.status, 401);
    assert.equal(respuesta.body.success, false);
  } finally {
    await servidor.cerrar();
    db.close();
  }
});
