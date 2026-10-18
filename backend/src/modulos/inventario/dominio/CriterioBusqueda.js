export const TIPO_BUSQUEDA = Object.freeze({
  CODIGO: 'CODIGO',
  NOMBRE: 'NOMBRE',
  VACIO: 'VACIO'
});

export function interpretar(texto) {
  const limpio = String(texto ?? '').trim();
  if (!limpio) return { tipo: TIPO_BUSQUEDA.VACIO };
  // ≥6 dígitos o patrón XXX-000 / XX-0000
  if (/^\d{6,}$/.test(limpio) || /^[A-Za-z]{2,4}-?\d+$/.test(limpio)) {
    return { tipo: TIPO_BUSQUEDA.CODIGO };
  }
  return { tipo: TIPO_BUSQUEDA.NOMBRE };
}