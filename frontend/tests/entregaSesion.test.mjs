import test from 'node:test';
import assert from 'node:assert/strict';

const almacen = new Map([['gestienda_token','token-de-prueba'], ['gestienda_user','{"username":"admin1"}']]);
globalThis.localStorage = { getItem:k=>almacen.get(k)??null, removeItem:k=>almacen.delete(k),setItem:(k,v)=>almacen.set(k,v) };
const eventos=[];
globalThis.window={location:{hostname:'localhost'},dispatchEvent:e=>eventos.push(e.type)};
globalThis.sessionStorage={setItem:()=>{}};
globalThis.Event = class {constructor(type){this.type=type}};
const {apiFetch}=await import('../src/compartido/servicios/apiCliente.js');

test('401 de consulta protegida elimina sesión y notifica a la aplicación', async()=>{
  almacen.set('gestienda_token','token-de-prueba');almacen.set('gestienda_user','{"username":"admin1"}');
  globalThis.fetch=async()=>({ok:false,status:401,json:async()=>({message:'Token inválido o expirado'})});
  await assert.rejects(()=>apiFetch('/estadisticas/ventas'),/La sesión expiró/);
  assert.equal(almacen.has('gestienda_token'),false);
  assert.equal(almacen.has('gestienda_user'),false);
  assert.ok(eventos.includes('gestienda:sesion-expirada'));
});

test('error 401 de login no se interpreta como vencimiento de otra sesión',async()=>{
  almacen.set('gestienda_token','token-de-prueba');
  globalThis.fetch=async()=>({ok:false,status:401,json:async()=>({message:'Credenciales inválidas'})});
  await assert.rejects(()=>apiFetch('/auth/login',{method:'POST',body:'{}'}),/Credenciales inválidas/);
  assert.equal(almacen.get('gestienda_token'),'token-de-prueba');
});

test('error 500 conserva mensaje original y no borra la sesión',async()=>{
  globalThis.fetch=async()=>({ok:false,status:500,json:async()=>({message:'Error temporal'})});
  await assert.rejects(()=>apiFetch('/estadisticas/ventas'),/Error temporal/);
  assert.equal(almacen.get('gestienda_token'),'token-de-prueba');
});
