import React, { useEffect, useState } from 'react';
import { listarApartadosActivos, cancelarApartado } from '../servicios/apartadosService.js';
import { TarjetaApartado } from './TarjetaApartado.jsx';
import { RegistrarAbonoModal } from './RegistrarAbonoModal.jsx';

/**
 * HU-0702 — Lista de apartados ACTIVOS con búsqueda y registro de abonos.
 * HU-0703 — Incluye modal de confirmación para cancelar apartados.
 */
export function ListaApartadosActivos({ filtro = '', version = 0, onCancelar }) {
  const [apartados, setApartados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [recarga, setRecarga] = useState(0);
  const [apartadoSeleccionado, setApartadoSeleccionado] = useState(null);

  // HU-0703: Estado del modal de confirmación de cancelación
  const [apartadoACancelar, setApartadoACancelar] = useState(null);
  const [cancelando, setCancelando] = useState(false);
  const [errorCancelacion, setErrorCancelacion] = useState('');

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError('');

    listarApartadosActivos()
      .then((respuesta) => {
        if (!activo) return;
        setApartados(Array.isArray(respuesta?.data) ? respuesta.data : []);
      })
      .catch((err) => {
        if (!activo) return;
        setApartados([]);
        setError(err?.message || 'No se pudieron cargar los apartados activos.');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [version, recarga]);

  const termino = String(filtro ?? '').trim().toLowerCase();
  const visibles = termino === ''
    ? apartados
    : apartados.filter((apartado) => {
        const cliente = String(apartado?.clienteNombre ?? '').toLowerCase();
        const codigo = String(apartado?.codigo ?? '').toLowerCase();
        return cliente.includes(termino) || codigo.includes(termino);
      });

  const cerrarModal = () => setApartadoSeleccionado(null);

  const alRegistrarAbono = () => {
    setApartadoSeleccionado(null);
    setRecarga((valor) => valor + 1);
  };

  // HU-0703: Abrir modal de confirmación
  const pedirConfirmacionCancelacion = (apartado) => {
    setApartadoACancelar(apartado);
    setErrorCancelacion('');
  };

  // HU-0703: Confirmar y ejecutar la cancelación
  const confirmarCancelacion = async () => {
    if (!apartadoACancelar) return;
    setCancelando(true);
    setErrorCancelacion('');
    try {
      await cancelarApartado(apartadoACancelar.id);
      setApartadoACancelar(null);
      setRecarga((valor) => valor + 1);
      if (typeof onCancelar === 'function') onCancelar(apartadoACancelar);
    } catch (err) {
      setErrorCancelacion(err?.message || 'No se pudo cancelar el apartado. Intenta de nuevo.');
    } finally {
      setCancelando(false);
    }
  };

  if (cargando) {
    return <p style={estilos.mensaje}>Consultando apartados activos...</p>;
  }

  if (error) {
    return (
      <div role="alert" style={estilos.error}>
        <span>{error}</span>
        <button
          type="button"
          onClick={() => setRecarga((valor) => valor + 1)}
          style={estilos.botonReintentar}
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (visibles.length === 0) {
    return <p style={estilos.mensaje}>No hay apartados activos.</p>;
  }

  return (
    <>
      <div style={estilos.lista}>
        {visibles.map((apartado) => (
          <TarjetaApartado
            key={apartado.id}
            apartado={apartado}
            onRegistrarAbono={setApartadoSeleccionado}
            onCancelar={pedirConfirmacionCancelacion}
          />
        ))}
      </div>

      <RegistrarAbonoModal
        isOpen={Boolean(apartadoSeleccionado)}
        apartado={apartadoSeleccionado}
        onClose={cerrarModal}
        onRegistrado={alRegistrarAbono}
      />

      {/* HU-0703.4: Modal de confirmación de cancelación */}
      {apartadoACancelar && (
        <div style={estilos.fondoModal}>
          <div role="dialog" aria-modal="true" style={estilos.modal}>
            <h2 style={estilos.tituloModal}>¿Cancelar apartado?</h2>
            <p style={estilos.textoModal}>
              Estás a punto de cancelar el apartado{' '}
              <strong>{apartadoACancelar.codigo}</strong> de{' '}
              <strong>{apartadoACancelar.clienteNombre}</strong>.
            </p>
            <p style={estilos.textoModal}>
              Los productos reservados volverán al inventario disponible. Esta acción no se puede deshacer.
            </p>

            {errorCancelacion && (
              <p style={estilos.errorModal}>{errorCancelacion}</p>
            )}

            <div style={estilos.accionesModal}>
              <button
                type="button"
                onClick={() => setApartadoACancelar(null)}
                disabled={cancelando}
                style={estilos.botonVolver}
              >
                No, volver
              </button>
              <button
                type="button"
                onClick={confirmarCancelacion}
                disabled={cancelando}
                style={estilos.botonConfirmar}
              >
                {cancelando ? 'Cancelando...' : 'Sí, cancelar apartado'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const estilos = {
  lista: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  mensaje: {
    margin: 0,
    padding: '20px',
    textAlign: 'center',
    color: '#6B7280',
    backgroundColor: '#FFFDF7',
    border: '1px solid #E5E7EB',
    borderRadius: '12px'
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
    padding: '16px',
    color: '#B91C1C',
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: '12px'
  },
  botonReintentar: {
    padding: '7px 12px',
    fontSize: '0.85rem',
    fontWeight: 600,
    borderRadius: '6px',
    border: '1px solid #B91C1C',
    backgroundColor: '#FFFFFF',
    color: '#B91C1C',
    cursor: 'pointer'
  },
  // HU-0703.4: Estilos del modal de confirmación de cancelación
  fondoModal: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '28px',
    maxWidth: '460px',
    width: '90%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
  },
  tituloModal: {
    margin: '0 0 12px 0',
    fontSize: '1.2rem',
    fontWeight: 700,
    color: '#1F2937'
  },
  textoModal: {
    margin: '0 0 10px 0',
    fontSize: '0.95rem',
    color: '#4B5563',
    lineHeight: 1.5
  },
  errorModal: {
    margin: '8px 0',
    padding: '10px 14px',
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
    borderRadius: '8px',
    fontSize: '0.9rem'
  },
  accionesModal: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '20px'
  },
  botonVolver: {
    padding: '9px 18px',
    fontSize: '0.9rem',
    fontWeight: 600,
    borderRadius: '8px',
    border: '1px solid #D1D5DB',
    backgroundColor: '#FFFFFF',
    color: '#374151',
    cursor: 'pointer'
  },
  botonConfirmar: {
    padding: '9px 18px',
    fontSize: '0.9rem',
    fontWeight: 600,
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
    cursor: 'pointer'
  }
};
