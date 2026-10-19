// Ejecutar: npm run seed:productos (sobre BD local DE DESARROLLO)
import { db } from '../src/infraestructura/database/conexion.js';
import { inicializarEsquema } from '../src/infraestructura/database/esquema.js';
import { seedProductos } from '../src/infraestructura/database/seedProductos.js';

if (process.env.NODE_ENV === 'production') {
  console.error('No se permite ejecutar la semilla de demostración en producción.');
  process.exitCode = 1;
} else {
  inicializarEsquema();
  console.log('[SD-71] Semilla DEMO:', seedProductos(db));
}
db.close();
