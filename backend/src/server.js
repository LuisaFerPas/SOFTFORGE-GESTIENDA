import 'dotenv/config';
import { app } from './app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Gestienda API corriendo en http://localhost:${PORT}`);
  console.log(`[Server] Acceso en red local: http://<IP_LOCAL>:${PORT}`);
});
