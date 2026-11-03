import { apiFetch } from '../../../compartido/servicios/apiCliente.js';

/**
 * Servicio API para Apartados (HE-07).
 * HU-0700.6 — Centralización de llamadas HTTP para el módulo de apartados.
 */

/**
 * Registra un nuevo apartado con sus productos y abono inicial.
 * HU-0701 (Juliana)
 * @param {{ clienteNombre: string, clienteTelefono?: string, productos: Array<{ productoId: number, cantidad: number }>, abonoInicial: number }} payload
 */
export async function crearApartado(payload) {
  return apiFetch('/apartados', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * Consulta la lista de todos los apartados con estado ACTIVO.
 * HU-0702 (Javier)
 */
export async function listarApartadosActivos() {
  return apiFetch('/apartados/activos');
}

/**
 * Registra un abono adicional a un apartado existente.
 * HU-0702 (Javier)
 * @param {number|string} apartadoId
 * @param {{ monto: number, medioPago?: string }} datosAbono
 */
export async function registrarAbono(apartadoId, datosAbono) {
  return apiFetch(`/apartados/${apartadoId}/abonos`, {
    method: 'POST',
    body: JSON.stringify(datosAbono)
  });
}

/**
 * Cancela un apartado activo y devuelve productos al inventario.
 * HU-0703 (Santiago)
 * @param {number|string} apartadoId
 */
export async function cancelarApartado(apartadoId) {
  return apiFetch(`/apartados/${apartadoId}/cancelar`, {
    method: 'PATCH'
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Alias de compatibilidad
// ─────────────────────────────────────────────────────────────────────────────
export async function listarApartadosApi() {
  return listarApartadosActivos();
}

export async function registrarAbonoApi(apartadoId, datosAbono) {
  return registrarAbono(apartadoId, datosAbono);
}
