import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../compartido/contexto/AuthContext';
import { listarApartadosActivos } from '../../apartados/servicios/apartadosService';
import { consultarResumenFinanciero, consultarPagosDelDia } from '../../estadisticas/servicios/estadisticasService';
import { consultarVentasRecientesApi } from '../../ventas/servicios/ventasService';

export function useDashboardData() {
  const { isAdmin } = useAuth();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [ventasHoy, setVentasHoy] = useState({ total: 0, transacciones: 0 });
  const [gananciaEstimada, setGananciaEstimada] = useState({ total: 0, margenTexto: 'Sin ventas hoy' });
  const [apartadosActivos, setApartadosActivos] = useState({ cantidad: 0, totalValor: 0 });
  const [ventasRecientes, setVentasRecientes] = useState([]);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      // 1. Apartados activos
      const promesaApartados = listarApartadosActivos()
        .then(res => {
          const lista = Array.isArray(res?.data) ? res.data : [];
          const totalValor = lista.reduce((acc, a) => acc + (Number(a.totalProductos) || Number(a.saldoPendiente) || 0), 0);
          setApartadosActivos({ cantidad: lista.length, totalValor });
        })
        .catch(err => {
          console.error('[Dashboard] Error al consultar apartados:', err);
          setApartadosActivos({ cantidad: 0, totalValor: 0 });
        });

      // 2. Ventas recientes
      const promesaRecientes = consultarVentasRecientesApi(5)
        .then(res => {
          setVentasRecientes(Array.isArray(res?.data) ? res.data : []);
        })
        .catch(err => {
          console.error('[Dashboard] Error al consultar ventas recientes:', err);
          setVentasRecientes([]);
        });

      // 3. Ventas hoy y ganancia estimada
      let promesaFinanzas;
      if (isAdmin) {
        promesaFinanzas = consultarResumenFinanciero('DIA')
          .then(res => {
            const data = res?.data || {};
            const total = Number(data.ingresosBrutos) || 0;
            const transacciones = Number(data.numeroTransacciones) || 0;
            const utilidad = Number(data.utilidadEstimada) || 0;
            const margen = total > 0 ? Math.round((utilidad / total) * 100) : 0;
            const margenTexto = total > 0 ? `Margen: ${margen}%` : 'Sin ventas hoy';

            setVentasHoy({ total, transacciones });
            setGananciaEstimada({ total: utilidad, margenTexto });
          })
          .catch(err => {
            console.error('[Dashboard] Error al consultar financiero:', err);
            return consultarPagosDelDia().then(res => {
              const pagos = Array.isArray(res?.data) ? res.data : [];
              const ventas = pagos.filter(p => p.tipo === 'VENTA');
              const total = ventas.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
              setVentasHoy({ total, transacciones: ventas.length });
              setGananciaEstimada({ total: 0, margenTexto: 'Sin datos' });
            });
          });
      } else {
        promesaFinanzas = consultarPagosDelDia()
          .then(res => {
            const pagos = Array.isArray(res?.data) ? res.data : [];
            const ventas = pagos.filter(p => p.tipo === 'VENTA');
            const total = ventas.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
            setVentasHoy({ total, transacciones: ventas.length });
            setGananciaEstimada({ total: 0, margenTexto: '' });
          })
          .catch(err => {
            console.error('[Dashboard] Error al consultar pagos del día:', err);
            setVentasHoy({ total: 0, transacciones: 0 });
          });
      }

      await Promise.allSettled([promesaApartados, promesaRecientes, promesaFinanzas]);
    } catch (e) {
      setError(e.message || 'Error al cargar datos del dashboard');
    } finally {
      setCargando(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  return {
    cargando,
    error,
    ventasHoy,
    gananciaEstimada,
    apartadosActivos,
    ventasRecientes,
    recargar: cargarDatos
  };
}
