
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';

// ============================================================
// CONFIGURACIÓN SEGURA DEL ENTORNO DE PRUEBAS
// ============================================================

// Clave JWT exclusiva para pruebas, si no existe una configurada.
process.env.JWT_SECRET ||= 'test-secret-key-for-testing-only-32chars';

// IMPORTANTE:
// Las pruebas utilizarán SQLite en memoria.
// Nunca modificarán la base de datos de desarrollo.
process.env.DB_PATH = ':memory:';

// Importaciones dinámicas:
// Garantizan que DB_PATH esté configurado antes de abrir SQLite.
const { inicializarEsquema } = await import(
  '../src/infraestructura/database/esquema.js'
);

const { db } = await import(
  '../src/infraestructura/database/conexion.js'
);

const { UsuarioRepository } = await import(
  '../src/modulos/usuarios/dominio/UsuarioRepository.js'
);

const { AuthService } = await import(
  '../src/modulos/usuarios/aplicacion/AuthService.js'
);

// ============================================================
// PREPARACIÓN DE LA BASE DE DATOS DE PRUEBAS
// ============================================================

// Crear las tablas y los usuarios semilla en memoria.
inicializarEsquema();

// Preparar las dependencias del módulo de autenticación.
const repo = new UsuarioRepository(db);
const service = new AuthService(repo);

// Cerrar la conexión cuando finalicen todas las pruebas.
after(() => {
  db.close();
});

// ============================================================
// PRUEBA 1: VERIFICACIÓN DE BCRYPT
// ============================================================

test('1. bcrypt.compareSync directo con hash generado en el test', () => {
  const password = 'admin123';

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);

  const match = bcrypt.compareSync(password, hash);

  assert.ok(
    match,
    'bcrypt.compareSync debería retornar true para la contraseña correcta'
  );
});

// ============================================================
// PRUEBA 2: LOGIN EXITOSO
// ============================================================

test('2. Login exitoso con admin1 (verifica token y usuario)', async () => {
  const resultado = await service.login('admin1', 'admin123');

  assert.ok(
    resultado.isSuccess,
    'Debería ser login exitoso'
  );

  const { token, user } = resultado.getValue();

  assert.ok(token, 'Debe tener un token');
  assert.ok(user, 'Debe tener un usuario');

  assert.equal(user.username, 'admin1');
  assert.equal(user.role, 'ADMINISTRADOR');
  assert.equal(user.status, 'ACTIVO');
});

// ============================================================
// PRUEBA 3: CONTRASEÑA INCORRECTA
// ============================================================

test('3. Login fallido: contraseña incorrecta', async () => {
  const resultado = await service.login(
    'admin1',
    'passwordIncorrecta'
  );

  assert.ok(
    resultado.isFailure,
    'Debería fallar con contraseña incorrecta'
  );

  assert.equal(
    resultado.error,
    'Usuario o contraseña inválidos'
  );
});

// ============================================================
// PRUEBA 4: USUARIO INEXISTENTE
// ============================================================

test('4. Login fallido: usuario inexistente', async () => {
  const resultado = await service.login(
    'usuarioInexistente',
    'cualquierCosa'
  );

  assert.ok(
    resultado.isFailure,
    'Debería fallar con usuario inexistente'
  );

  assert.equal(
    resultado.error,
    'Usuario o contraseña inválidos'
  );
});

// ============================================================
// PRUEBA 5: USUARIO INACTIVO
// ============================================================

test('5. Login fallido: usuario inactivo', async () => {
  // Buscar el usuario original en la BD temporal.
  const usuarioOriginal = await repo.buscarPorUsername('admin1');

  assert.ok(
    usuarioOriginal,
    'El usuario admin1 debe existir'
  );

  // Desactivar temporalmente el usuario.
  // Se conserva su contraseña válida para comprobar
  // específicamente el bloqueo por estado INACTIVO.
  await repo.actualizar({
    ...usuarioOriginal,
    estado: 'INACTIVO'
  });

  try {
    const resultado = await service.login(
      'admin1',
      'admin123'
    );

    assert.ok(
      resultado.isFailure,
      'Debería fallar porque el usuario está inactivo'
    );

    assert.equal(
      resultado.error,
      'El usuario se encuentra inactivo'
    );

  } finally {
    // Restaurar el usuario original incluso si falla
    // alguna de las verificaciones anteriores.
    await repo.actualizar(usuarioOriginal);
  }

  // Verificar que el usuario quedó restaurado.
  const usuarioRestaurado = await repo.buscarPorUsername('admin1');

  assert.equal(usuarioRestaurado.estado, 'ACTIVO');

  assert.equal(
    usuarioRestaurado.passwordHash,
    usuarioOriginal.passwordHash
  );
});

// ============================================================
// PRUEBA 6: CAMBIO RÁPIDO DE USUARIO EXITOSO
// ============================================================

test('6. [HU-0203] Cambio rápido de usuario exitoso con vendedor', async () => {
  const resultado = await service.cambiarUsuario(
    'vendedor',
    'vendedor123'
  );

  assert.ok(
    resultado.isSuccess,
    'Debería cambiar de usuario exitosamente'
  );

  const { token, user } = resultado.getValue();

  assert.ok(token, 'Debe devolver un JWT válido');

  assert.equal(user.username, 'vendedor');
  assert.equal(user.role, 'VENDEDOR');
});

// ============================================================
// PRUEBA 7: CAMBIO RÁPIDO CON CREDENCIALES INCORRECTAS
// ============================================================

test('7. [HU-0203] Cambio rápido de usuario fallido con credenciales erróneas', async () => {
  const resultado = await service.cambiarUsuario(
    'vendedor',
    'claveMala'
  );

  assert.ok(
    resultado.isFailure,
    'Debería fallar con clave incorrecta'
  );

  assert.equal(
    resultado.error,
    'Usuario o contraseña inválidos'
  );
});
