import React, { useEffect, useState } from 'react';
import { listarApartadosActivos } from '../servicios/apartadosService.js';
import { TarjetaApartado } from './TarjetaApartado.jsx';
import { RegistrarAbonoModal } from './RegistrarAbonoModal.jsx';

/**
 * HU-0702 — Lista de apartados ACTIVOS con búsqueda y registro de abonos.
 */
export function ListaApartadosActivos({ filtro = '', version = 0, onCancelar }) {
  const [apartados, setApartados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [recarga, setRecarga] = useState(0);
  const [apartadoSeleccionado, setApartadoSeleccionado] = useState(null);

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
            onCancelar={onCancelar}
          />
        ))}
      </div>

      <RegistrarAbonoModal
        isOpen={Boolean(apartadoSeleccionado)}
        apartado={apartadoSeleccionado}
        onClose={cerrarModal}
        onRegistrado={alRegistrarAbono}
      />
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
  }
};
