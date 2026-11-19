import test from 'node:test';
import assert from 'node:assert/strict';

// Simulación fiel de las APIs del navegador que necesita apiCliente.
const datos = new Map();
const eventos = [];
const sesion = new Map();
globalThis.window = {
  location: { hostname: 'localhost' },
  dispatchEvent: evento => { eventos.push(evento.type); return true; }
};
globalThis.localStorage = {
  getItem: clave => datos.get(clave) ?? null,
  setItem: (clave, valor) => datos.set(clave, String(valor)),
  removeItem: clave => datos.delete(clave)
};
globalThis.sessionStorage = {
  getItem: clave => sesion.get(clave) ?? null,
  setItem: (clave, valor) => sesion.set(clave, String(valor)),
  removeItem: clave => sesion.delete(clave)
};

const { apiFetch } = await import('../src/compartido/servicios/apiCliente.js');

test('un fallo de red informa cómo iniciar el backend', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(apiFetch('/apartados/activos'), /backend.*3000/i);
});

test('HTTP 401 en una consulta protegida cierra sesión y avisa al usuario', async () => {
  datos.set('gestienda_token', 'token-vencido');
  datos.set('gestienda_user', '{"username":"admin1"}');
  eventos.length = 0;
  let autorizacion;
  globalThis.fetch = async (_url, opciones) => {
    autorizacion = opciones.headers.Authorization;
    return { ok: false, status: 401, json: async () => ({ message: 'Token inválido o expirado' }) };
  };
  await assert.rejects(apiFetch('/apartados/activos'), /La sesión expiró/);
  assert.equal(autorizacion, 'Bearer token-vencido');
  assert.equal(datos.has('gestienda_token'), false);
  assert.equal(datos.has('gestienda_user'), false);
  assert.ok(eventos.includes('gestienda:sesion-expirada'));
  assert.equal(sesion.get('gestienda_sesion_expirada'), '1');
});

test('errores HTTP distintos de 401 conservan el mensaje del servidor y la sesión', async () => {
  datos.set('gestienda_token', 'token-vigente');
  globalThis.fetch = async () => ({
    ok: false, status: 500, json: async () => ({ message: 'Error temporal del servidor' })
  });
  await assert.rejects(apiFetch('/apartados/activos'), /Error temporal del servidor/);
  assert.equal(datos.get('gestienda_token'), 'token-vigente');
});

test('éxito HTTP mantiene el contrato original', async () => {
  let url;
  globalThis.fetch = async valor => {
    url = valor;
    return { ok: true, status: 200, json: async () => ({ success: true, data: [1] }) };
  };
  assert.deepEqual(await apiFetch('/apartados/activos'), { success: true, data: [1] });
  assert.equal(url, 'http://localhost:3000/api/apartados/activos');
});
