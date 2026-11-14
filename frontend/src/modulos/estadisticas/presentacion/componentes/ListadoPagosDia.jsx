import React, { useEffect, useState } from 'react';
import { consultarPagosDelDia } from '../../servicios/estadisticasService.js';
import { formatCOP } from '../../../inventario/utilidades/formatoMoneda.js';
import { Receipt, LoaderCircle, AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Listado de pagos individuales del día (HU-0801).
 * Muestra ventas y abonos de apartados con hora, operación, medio de pago y monto.
 */
export function ListadoPagosDia() {
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError('');

    consultarPagosDelDia()
      .then((respuesta) => {
        if (!activo) return;
        const lista = Array.isArray(respuesta?.data) ? respuesta.data : [];
        setPagos(lista);
      })
      .catch((err) => {
        if (!activo) return;
        setError(err?.message || 'No se pudieron consultar los pagos del día.');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [recarga]);

  const refrescar = () => setRecarga((v) => v + 1);

  return (
    <div>
      <div style={estilos.encabezado}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Receipt size={20} color="#FF6600" />
          <h3 style={estilos.titulo}>Detalle de Pagos del Día</h3>
          <span style={estilos.badgeConteo}>{pagos.length}</span>
        </div>
        <button
          type="button"
          onClick={refrescar}
          disabled={cargando}
          style={estilos.botonRefrescar}
          title="Recargar pagos del día"
        >
          <RefreshCw size={15} className={cargando ? 'pos-spin' : ''} />
          <span>Actualizar</span>
        </button>
      </div>

      {cargando && (
        <div style={estilos.estadoCarga}>
          <LoaderCircle size={24} className="pos-spin" color="#FF6600" />
          <p style={{ margin: 0, color: '#6B7280', fontSize: '0.9rem' }}>
            Cargando pagos del día...
          </p>
        </div>
      )}

      {error && !cargando && (
        <div style={estilos.estadoError}>
          <AlertCircle size={18} color="#DC2626" />
          <span style={{ fontSize: '0.9rem' }}>{error}</span>
          <button type="button" onClick={refrescar} style={estilos.botonReintentar}>
            Reintentar
          </button>
        </div>
      )}

      {/* HU-0801.4: Estado vacío cuando no hay pagos registrados */}
      {!cargando && !error && pagos.length === 0 && (
        <div style={estilos.estadoVacio}>
          <Receipt size={36} color="#9CA3AF" style={{ margin: '0 auto 8px' }} />
          <p style={estilos.textoVacio}>No se han registrado pagos hoy</p>
          <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>
            Los pagos por ventas y abonos de apartados aparecerán aquí tan pronto se registren.
          </span>
        </div>
      )}

      {/* HU-0801.3: Tabla de Pagos del Día */}
      {!cargando && !error && pagos.length > 0 && (
        <div style={estilos.contenedorTabla}>
          <table style={estilos.tabla}>
            <thead>
              <tr style={estilos.filaEncabezado}>
                <th style={estilos.th}>Hora</th>
                <th style={estilos.th}>Operación</th>
                <th style={estilos.th}>Medio de Pago</th>
                <th style={{ ...estilos.th, textAlign: 'right' }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {pagos.map((pago, index) => {
                const esVenta = pago.tipo === 'VENTA';
                return (
                  <tr key={`${pago.tipo}-${pago.id}-${index}`} style={estilos.fila}>
                    <td style={estilos.tdHora}>
                      {pago.hora || formatearHora(pago.fechaHora)}
                    </td>
                    <td style={estilos.td}>
                      <span
                        style={{
                          ...estilos.badgeTipo,
                          backgroundColor: esVenta ? '#E0F2FE' : '#FEF3C7',
                          color: esVenta ? '#0369A1' : '#92400E'
                        }}
                      >
                        {esVenta ? `Venta #${pago.referenciaId}` : `Abono Apartado #${pago.referenciaId}`}
                      </span>
                    </td>
                    <td style={estilos.td}>
                      <span style={estilos.etiquetaMedio}>
                        {formatearMedioPago(pago.medioPago)}
                      </span>
                    </td>
                    <td style={estilos.tdMonto}>
                      {formatCOP.format(Number(pago.monto) || 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatearMedioPago(medio) {
  const normalizado = String(medio || '').toUpperCase();
  switch (normalizado) {
    case 'EFECTIVO':
      return '💵 Efectivo';
    case 'NEQUI':
      return '📱 Nequi';
    case 'OTRO':
      return '💳 Otro';
    case 'MIXTO':
      return '🔄 Mixto';
    default:
      return normalizado || 'Otro';
  }
}

function formatearHora(fechaIso) {
  if (!fechaIso) return '--:--';
  const d = new Date(fechaIso);
  if (isNaN(d.getTime())) return String(fechaIso);
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const estilos = {
  encabezado: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '10px'
  },
  titulo: {
    margin: 0,
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#1F2937'
  },
  badgeConteo: {
    backgroundColor: '#F3F4F6',
    color: '#4B5563',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: 700
  },
  botonRefrescar: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    fontSize: '0.8rem',
    fontWeight: 600,
    borderRadius: '6px',
    border: '1px solid #D1D5DB',
    backgroundColor: '#FFFFFF',
    color: '#4B5563',
    cursor: 'pointer'
  },
  estadoCarga: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '30px 20px'
  },
  estadoError: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    backgroundColor: '#FEF2F2',
    color: '#B91C1C',
    borderRadius: '8px',
    border: '1px solid #FECACA'
  },
  botonReintentar: {
    marginLeft: 'auto',
    padding: '4px 10px',
    fontSize: '0.8rem',
    fontWeight: 600,
    borderRadius: '4px',
    border: '1px solid #B91C1C',
    backgroundColor: '#FFFFFF',
    color: '#B91C1C',
    cursor: 'pointer'
  },
  estadoVacio: {
    textAlign: 'center',
    padding: '36px 20px',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
    border: '1px dashed #D1D5DB'
  },
  textoVacio: {
    margin: '0 0 4px',
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#4B5563'
  },
  contenedorTabla: {
    overflowX: 'auto',
    borderRadius: '8px',
    border: '1px solid #E5E7EB'
  },
  tabla: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.88rem'
  },
  filaEncabezado: {
    backgroundColor: '#F9FAFB',
    borderBottom: '2px solid #E5E7EB',
    textAlign: 'left'
  },
  th: {
    padding: '10px 14px',
    fontWeight: 600,
    color: '#4B5563',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  fila: {
    borderBottom: '1px solid #F3F4F6',
    transition: 'background-color 0.15s ease'
  },
  td: {
    padding: '10px 14px',
    color: '#374151',
    verticalAlign: 'middle'
  },
  tdHora: {
    padding: '10px 14px',
    color: '#6B7280',
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 500,
    whiteSpace: 'nowrap'
  },
  tdMonto: {
    padding: '10px 14px',
    textAlign: 'right',
    fontWeight: 700,
    color: '#059669',
    fontVariantNumeric: 'tabular-nums'
  },
  badgeTipo: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 700
  },
  etiquetaMedio: {
    fontSize: '0.85rem',
    color: '#374151'
  }
};
