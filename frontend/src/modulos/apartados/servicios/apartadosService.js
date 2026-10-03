import { apiFetch } from '../../../compartido/servicios/apiCliente.js';

export async function listarApartadosApi() {
  return apiFetch('/apartados');
}

export async function registrarAbonoApi(apartadoId, datosAbono) {
  return apiFetch(`/apartados/${apartadoId}/abonos`, {
    method: 'POST',
    body: JSON.stringify(datosAbono)
  });
}
