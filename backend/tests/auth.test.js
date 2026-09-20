import test from 'node:test';
import assert from 'node:assert/strict';
import { RolUsuario, EstadoUsuario } from '../src/modulos/usuarios/dominio/RolUsuario.js';
import { Result } from '../src/shared/Result.js';
import { requireRole } from '../src/modulos/usuarios/presentacion/authMiddleware.js';
import { db } from '../src/infraestructura/database/conexion.js';
import { inicializarEsquema } from '../src/infraestructura/database/esquema.js';

test('1. [Dominio] Enums de Rol y Estado deben tener los valores de negocio válidos', () => {
  assert.equal(RolUsuario.ADMINISTRADOR, 'ADMINISTRADOR');
  assert.equal(RolUsuario.VENDEDOR, 'VENDEDOR');
  assert.equal(EstadoUsuario.ACTIVO, 'ACTIVO');
  assert.equal(EstadoUsuario.INACTIVO, 'INACTIVO');
});

test('2. [Shared] Patrón Result debe comportarse según reglas funcionales', () => {
  const success = Result.ok(42);
  assert.equal(success.isSuccess, true);
  assert.equal(success.getValue(), 42);

  const failure = Result.fail('Error de negocio');
  assert.equal(failure.isFailure, true);
  assert.equal(failure.error, 'Error de negocio');
  assert.throws(() => failure.getValue(), /No se puede obtener el valor/);
});

test('3. [Seguridad] requireRole debe permitir acceso solo a roles autorizados', () => {
  const middleware = requireRole(['ADMINISTRADOR']);

  // Caso: Rol no autorizado
  let statusSent = null;
  let jsonSent = null;
  const reqVendedor = { user: { role: 'VENDEDOR' } };
  const resVendedor = {
    status(code) { statusSent = code; return this; },
    json(data) { jsonSent = data; return this; }
  };
  let nextCalled = false;

  middleware(reqVendedor, resVendedor, () => { nextCalled = true; });
  assert.equal(statusSent, 403);
  assert.equal(nextCalled, false);

  // Caso: Rol autorizado
  nextCalled = false;
  const reqAdmin = { user: { role: 'ADMINISTRADOR' } };
  middleware(reqAdmin, {}, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test('4. [Database] Base de datos SQLite debe inicializarse con el usuario admin semilla', () => {
  inicializarEsquema();
  const adminUser = db.prepare("SELECT username, role, status FROM users WHERE username = 'admin'").get();
  assert.ok(adminUser, 'El usuario admin debe existir en la base de datos');
  assert.equal(adminUser.role, 'ADMINISTRADOR');
  assert.equal(adminUser.status, 'ACTIVO');
});
