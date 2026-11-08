import React from 'react';
import { Calendar, Package, Phone, User } from 'lucide-react';
import { formatCOP } from '../../inventario/utilidades/formatoMoneda.js';

const ETIQUETAS_MEDIO_PAGO = {
  EFECTIVO: 'Efectivo',
  NEQUI: 'Nequi',
  OTRO: 'Otro'
};

/**
 * HU-0702 — Tarjeta de un apartado activo con su historial de abonos.
 */
export function TarjetaApartado({ apartado, onRegistrarAbono, onCancelar }) {
  const total = numeroSeguro(apartado?.totalProductos);
  const saldo = numeroSeguro(apartado?.saldoPendiente);
  const abonado = Math.max(0, total - saldo);
  const productos = Array.isArray(apartado?.productos) ? apartado.productos : [];
  const abonos = construirHistorial(apartado);

  return (
    <article style={estilos.tarjeta}>
      <header style={estilos.encabezado}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={estilos.insignia}>ACTIVO</span>
          <strong style={{ color: '#1F2937' }}>{apartado?.codigo ?? 'Sin código'}</strong>
        </div>
        <span style={estilos.fecha}>
          <Calendar size={14} />
          {formatearFechaHora(apartado?.fechaCreacion)}
        </span>
      </header>

      <div style={estilos.datosCliente}>
        <span style={estilos.dato}>
          <User size={15} style={{ color: '#9CA3AF' }} />
          {apartado?.clienteNombre ?? 'Cliente sin nombre'}
        </span>
        {apartado?.clienteTelefono ? (
          <span style={estilos.dato}>
            <Phone size={15} style={{ color: '#9CA3AF' }} />
            {apartado.clienteTelefono}
          </span>
        ) : null}
      </div>

      <div style={estilos.resumen}>
        <DatoResumen etiqueta="Total apartado" valor={formatCOP.format(total)} />
        <DatoResumen etiqueta="Abonado" valor={formatCOP.format(abonado)} color="#059669" />
        <DatoResumen etiqueta="Saldo pendiente" valor={formatCOP.format(saldo)} color="#DC2626" destacado />
      </div>

      <section style={estilos.seccion}>
        <h3 style={estilos.tituloSeccion}>
          <Package size={16} />
          Productos
        </h3>
        {productos.length === 0 ? (
          <p style={estilos.textoVacio}>Sin productos registrados.</p>
        ) : (
          <ul style={estilos.lista}>
            {productos.map((producto, indice) => (
              <li key={`${apartado?.id ?? 'apartado'}-producto-${indice}`} style={estilos.itemLista}>
                <span>
                  {producto.cantidad} × {producto.nombre ?? `Producto ${producto.productoId ?? ''}`}
                </span>
                <span style={{ fontWeight: 600 }}>
                  {formatCOP.format(numeroSeguro(producto.subtotal))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={estilos.seccion}>
        <h3 style={estilos.tituloSeccion}>Historial de abonos</h3>
        {abonos.length === 0 ? (
          <p style={estilos.textoVacio}>Sin abonos registrados.</p>
        ) : (
          <ul style={estilos.lista}>
            {abonos.map((abono) => (
              <li key={abono.clave} style={estilos.itemLista}>
                <span>
                  <strong>{abono.etiqueta}</strong>
                  {' · '}
                  {ETIQUETAS_MEDIO_PAGO[abono.medioPago] ?? abono.medioPago}
                  {abono.fechaHora ? ` · ${formatearFechaHora(abono.fechaHora)}` : ''}
                </span>
                <span style={{ fontWeight: 600, color: '#059669' }}>
                  {formatCOP.format(abono.monto)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer style={estilos.acciones}>
        {typeof onCancelar === 'function' ? (
          <button type="button" onClick={() => onCancelar(apartado)} style={estilos.botonSecundario}>
            Cancelar apartado
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onRegistrarAbono?.(apartado)}
          style={estilos.botonPrincipal}
        >
          Registrar abono
        </button>
      </footer>
    </article>
  );
}

function DatoResumen({ etiqueta, valor, color = '#1F2937', destacado = false }) {
  return (
    <div>
      <div style={estilos.etiquetaResumen}>{etiqueta}</div>
      <div style={{
        fontWeight: destacado ? 700 : 600,
        color,
        fontSize: destacado ? '1.05rem' : '0.95rem'
      }}>
        {valor}
      </div>
    </div>
  );
}

function construirHistorial(apartado) {
  const inicial = {
    clave: 'abono-inicial',
    etiqueta: 'Abono inicial',
    monto: numeroSeguro(apartado?.abonoInicial),
    medioPago: 'EFECTIVO',
    fechaHora: apartado?.fechaCreacion
  };

  const adicionales = (apartado?.abonosAdicionales ?? []).map((abono, indice) => ({
    clave: `abono-adicional-${indice}`,
    etiqueta: 'Abono',
    monto: numeroSeguro(abono.monto),
    medioPago: abono.medioPago ?? 'EFECTIVO',
    fechaHora: abono.fechaHora
  }));

  return [inicial, ...adicionales];
}

function numeroSeguro(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

function formatearFechaHora(valor) {
  if (!valor) return 'Sin fecha';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(fecha);
}

const estilos = {
  tarjeta: {
    backgroundColor: '#FFFDF7',
    border: '1px solid #E5E7EB',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  encabezado: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
    paddingBottom: '12px',
    borderBottom: '1px solid #F3F4F6'
  },
  insignia: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 700
  },
  fecha: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.85rem',
    color: '#6B7280'
  },
  datosCliente: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    padding: '12px 0'
  },
  dato: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.9rem',
    color: '#4B5563'
  },
  resumen: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    padding: '12px',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px'
  },
  etiquetaResumen: {
    fontSize: '0.8rem',
    color: '#6B7280',
    marginBottom: '2px'
  },
  seccion: {
    marginTop: '16px'
  },
  tituloSeccion: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.9rem',
    fontWeight: 700,
    color: '#374151',
    margin: '0 0 8px 0'
  },
  lista: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  itemLista: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    fontSize: '0.85rem',
    color: '#4B5563',
    padding: '6px 0',
    borderBottom: '1px dashed #F3F4F6'
  },
  textoVacio: {
    margin: 0,
    fontSize: '0.85rem',
    color: '#9CA3AF'
  },
  acciones: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    flexWrap: 'wrap',
    marginTop: '16px',
    paddingTop: '12px',
    borderTop: '1px solid #F3F4F6'
  },
  botonSecundario: {
    padding: '8px 14px',
    fontSize: '0.85rem',
    fontWeight: 600,
    borderRadius: '6px',
    border: '1px solid #EF4444',
    backgroundColor: '#FFFFFF',
    color: '#EF4444',
    cursor: 'pointer'
  },
  botonPrincipal: {
    padding: '8px 14px',
    fontSize: '0.85rem',
    fontWeight: 600,
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#FF6600',
    color: '#FFFFFF',
    cursor: 'pointer'
  }
};
