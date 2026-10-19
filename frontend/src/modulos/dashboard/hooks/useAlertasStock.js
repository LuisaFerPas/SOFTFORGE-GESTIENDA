import { useEffect, useState } from 'react';
import { obtenerAlertasApi } from '../../inventario/servicios/inventarioService';

/** SD-69: fuente única de datos para KPI y panel de dashboard. */
export function useAlertasStock(habilitado = true) {
  const [datos, setDatos] = useState({ alertas: [], cargando: habilitado, error: '' });
  useEffect(() => {
    if (!habilitado) return;
    let activo = true;
    obtenerAlertasApi().then(res => {
      if (activo) setDatos({ alertas: res.data || [], cargando: false, error: '' });
    }).catch(error => {
      if (activo) setDatos({ alertas: [], cargando: false, error: error.message });
    });
    return () => { activo = false; };
  }, [habilitado]);
  return datos;
}
