import os from 'os';

/**
 * Detecta la dirección IPv4 local del equipo en la red Wi-Fi o Ethernet.
 * Descarta interfaces de loopback (127.0.0.1) o virtuales.
 * @returns {string} Dirección IP local (ej. '192.168.1.10') o 'localhost' si no hay red.
 */
export function obtenerIpLocal() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Filtrar IPv4 activas que no sean loopback
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}
