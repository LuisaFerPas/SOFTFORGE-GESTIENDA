import { apiFetch } from '../../../compartido/servicios/apiCliente.js';

export async function crearVentaApi(datosVenta) {
  return apiFetch('/ventas', {
    method: 'POST',
    body: JSON.stringify(datosVenta)
  });
}
