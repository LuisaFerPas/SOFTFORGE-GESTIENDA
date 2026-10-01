import test from 'node:test';
import assert from 'node:assert/strict';
import { inicializarEsquema } from '../src/infraestructura/database/esquema.js';
import { db } from '../src/infraestructura/database/conexion.js';
import { UsuarioRepository } from '../src/modulos/usuarios/dominio/UsuarioRepository.js';
import { AuthService } from '../src/modulos/usuarios/servicios/AuthService.js';
import { Result } from '../src/shared/Result.js';
import bcrypt from 'bcryptjs';

// Helper: verify bcrypt compare directly with a hash we generate
test('1. bcrypt.compareSync directo con hash generado en el test', () => {
  const password = 'admin123';
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  const match = bcrypt.compareSync(password, hash);
  assert.ok(match, 'bcrypt.compareSync debería retornar true para la contraseña correcta');
});

test('2. Login exitoso con admin1 (verifica token y usuario)', async () => {
  inicializarEsquema();
  const repo = new UsuarioRepository(db);
  const service = new AuthService(repo);
  const resultado = await service.login('admin1', 'admin123');
  // Verifica que el resultado es exitoso y tiene datos
  assert.ok(resultado.isSuccess, 'Debería ser login exitoso');
  const { token, user } = resultado.getValue();
  assert.ok(token, 'Debe tener un token');
  assert.ok(user, 'Debe tener un usuario');
  assert.equal(user.username, 'admin1');
  assert.equal(user.role, 'ADMINISTRADOR');
  assert.equal(user.status, 'ACTIVO');
});

test('3. Login fallido: contraseña incorrecta', async () => {
  inicializarEsquema();
  const repo = new UsuarioRepository(db);
  const service = new AuthService(repo);
  const resultado = await service.login('admin1', 'passwordIncorrecta');
  assert.ok(resultado.isFailure, 'Debería fallar con contraseña incorrecta');
  assert.equal(resultado.error, 'Usuario o contraseña inválidos');
});

test('4. Login fallido: usuario inexistente', async () => {
  inicializarEsquema();
  const repo = new UsuarioRepository(db);
  const service = new AuthService(repo);
  const resultado = await service.login('usuarioInexistente', 'cualquierCosa');
  assert.ok(resultado.isFailure, 'Debería fallar con usuario inexistente');
  assert.equal(resultado.error, 'Usuario o contraseña inválidos');
});

test('5. Login fallido: usuario inactivo', async () => {
  inicializarEsquema();
  const repo = new UsuarioRepository(db);
  // Get the admin1 user to know its current id
  const admin1User = await repo.buscarPorUsername('admin1');
  // Modificamos el usuario a inactivo para la prueba
  await repo.actualizar({
    id: admin1User.id,
    username: 'admin1',
    passwordHash: '$2a$10$placeholder',
    rol: 'ADMINISTRADOR',
    estado: 'INACTIVO'
  });
  const service = new AuthService(repo);
  const resultado = await service.login('admin1', 'admin123');
  assert.ok(resultado.isFailure, 'Debería fallar con usuario inactivo');
});