import React, { useEffect, useState } from 'react';
import { consultarTotalesPorMedio } from '../../servicios/estadisticasService.js';
import { formatCOP } from '../../../inventario/utilidades/formatoMoneda.js';

const TARJETAS = [
  { clave: 'totalDia', etiqueta: 'Total del Día', color: '#1F2937' },
  { clave: 'totalEfectivo', etiqueta: 'Efectivo', color: '#059669' },
  { clave: 'totalNequi', etiqueta: 'Nequi', color: '#7C3AED' },
  { clave: 'totalOtro', etiqueta: 'Otros', color: '#B45309' }
];

/**
 * Resumen de caja diaria por medio de pago (HU-0802).
 * Consulta GET /api/pagos/dia/totales al montar la pestaña.
 */
export function ResumenCaja() {
  const [totales, setTotales] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError('');

    consultarTotalesPorMedio()
      .then((respuesta) => {
        if (!activo) return;
        setTotales(respuesta?.data ?? respuesta ?? null);
      })
      .catch((err) => {
        if (!activo) return;
        setError(err?.message || 'No se pudieron cargar los totales de caja.');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  if (cargando) {
    return (
      <p style={{ margin: '16px 0 0', color: '#6B7280', fontSize: '0.9rem' }}>
        Consultando totales de caja...
      </p>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        style={{
          marginTop: '16px',
          padding: '12px',
          color: '#B91C1C',
          backgroundColor: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: '8px',
          fontSize: '0.9rem'
        }}
      >
        {error}
      </div>
    );
  }

  const valores = totales ?? {};
  const totalDia = Number(valores.totalDia ?? 0);

  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginTop: '16px'
      }}>
        {TARJETAS.map(({ clave, etiqueta, color }) => (
          <div key={clave} style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>{etiqueta}</div>
            <div style={{ fontWeight: 700, fontSize: '1.2rem', color }}>
              {formatCOP.format(Number(valores[clave] ?? 0))}
            </div>
          </div>
        ))}
      </div>

      {totalDia === 0 && (
        <p style={{ margin: '10px 0 0', fontSize: '0.85rem', color: '#6B7280' }}>
          Sin pagos registrados hoy.
        </p>
      )}
    </div>
  );
}
