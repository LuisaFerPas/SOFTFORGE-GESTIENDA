/**
 * SD-124: estado de la solicitud de reimpresión, sin atribuir
 * al sistema una impresión física que el backend no ha ejecutado.
 */
export function esFacturaReimprimible(factura) {
  return factura?.estado === 'EMITIDA' &&
    typeof factura.consecutivo === 'string' &&
    /^F-[0-9]{4,}$/.test(factura.consecutivo.trim().toUpperCase());
}

export function describirResultadoReimpresion(respuesta, consecutivo) {
  const esperado = String(consecutivo ?? '').trim().toUpperCase();
  const datos = respuesta?.data;
  const obtenido = datos?.factura?.consecutivo;

  if (respuesta?.success !== true || !datos ||
      typeof obtenido !== 'string' || obtenido.trim().toUpperCase() !== esperado) {
    throw new Error('No se pudo confirmar la factura solicitada. Intenta nuevamente.');
  }

  if (datos.impresionRealizada === true) {
    return {
      tipo: 'exito',
      mensaje: `Factura ${esperado} impresa correctamente.`
    };
  }
  return {
    tipo: 'informacion',
    mensaje: `Factura ${esperado} localizada. La impresión física todavía no se ha realizado.`
  };
}

export function describirErrorReimpresion(error) {
  const mensaje = typeof error?.message === 'string' ? error.message.trim() : '';
  if (!mensaje) return 'No fue posible consultar la factura. Intenta nuevamente.';
  if (/failed to fetch|networkerror|network request failed|fetch failed|error de red/i.test(mensaje)) {
    return 'No se pudo conectar con el servidor. Verifica la conexión e intenta nuevamente.';
  }
  return mensaje;
}
