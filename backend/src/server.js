import 'dotenv/config';
import { app } from './app.js';
import { obtenerIpLocal } from './compartido/utilidades/red.js';

const PORT = process.env.PORT || 3000;
const ipLocal = obtenerIpLocal();

app.listen(PORT, '0.0.0.0', () => {
  console.log('====================================================');
  console.log('🛒 GESTIENDA — VARIEDADES DON MATI');
  console.log(`💻 Acceso en este PC:     http://localhost:${PORT}`);
  console.log(`📱 Acceso desde celular:  http://${ipLocal}:${PORT}`);
  console.log('====================================================');
});
