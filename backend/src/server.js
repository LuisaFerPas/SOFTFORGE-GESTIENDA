import 'dotenv/config';
import { app } from './app.js';
import { obtenerIpLocal } from './compartido/utilidades/red.js';

const PORT = process.env.PORT || 3000;
const FRONTEND_PORT = process.env.FRONTEND_PORT || 5173;
const ipLocal = obtenerIpLocal();

app.listen(PORT, '0.0.0.0', () => {
  console.log('====================================================');
  console.log('🛒 GESTIENDA — VARIEDADES DON MATI');
  console.log(`💻 Acceso en este PC (Frontend): http://localhost:${FRONTEND_PORT}/login`);
  console.log(`📱 Acceso desde celular:         http://${ipLocal}:${FRONTEND_PORT}/`);
  console.log(`⚙️  API Backend:                   http://localhost:${PORT}/api`);
  console.log('====================================================');
});
