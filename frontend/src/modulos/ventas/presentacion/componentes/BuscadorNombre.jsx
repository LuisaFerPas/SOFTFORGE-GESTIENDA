import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Plus, Minus, X, Check, Loader2 } from 'lucide-react';
import { buscarProductosPorNombreApi } from '../../servicios/ventasService';

const COP = n =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

/**
 * HU-0302: Buscador reactivo de productos por nombre.
 * - Búsqueda reactiva con debounce de 250ms.
 * - Al presionar Enter: busca de inmediato sin esperar el debounce ni hacer clic afuera.
 * - Navegación con teclado (Flecha Arriba / Flecha Abajo / Enter).
 * - Agregar directo al carrito desde el dropdown con selector de cantidad ágil.
 */
export function BuscadorNombre({ onAgregar }) {
  const [texto, setTexto]               = useState('');
  const [resultados, setResultados]     = useState([]);
  const [cargando, setCargando]         = useState(false);
  const [abierto, setAbierto]           = useState(false);
  const [sinResultados, setSinResultados] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(0);
  const [cantidades, setCantidades]     = useState({}); // { [productoId]: number }

  const timerRef = useRef(null);
  const contenedorRef = useRef(null);
  const inputRef = useRef(null);

  // Función de búsqueda inmediata
  const ejecutarBusqueda = useCallback(async (termino) => {
    const query = termino.trim();
    if (!query) {
      setResultados([]);
      setAbierto(false);
      setSinResultados(false);
      return;
    }

    setCargando(true);
    try {
      const resp = await buscarProductosPorNombreApi(query);
      const lista = resp.data ?? [];
      setResultados(lista);
      setAbierto(true);
      setSinResultados(lista.length === 0);
      setIndiceActivo(0);

      // Inicializar cantidades por defecto en 1 para cada resultado
      const nuevasCant = {};
      lista.forEach(p => { nuevasCant[p.id] = 1; });
      setCantidades(nuevasCant);
    } catch {
      setResultados([]);
      setSinResultados(true);
    } finally {
      setCargando(false);
    }
  }, []);

  // Debounce al escribir
  useEffect(() => {
    clearTimeout(timerRef.current);

    if (!texto.trim()) {
      setResultados([]);
      setAbierto(false);
      setSinResultados(false);
      return;
    }

    timerRef.current = setTimeout(() => {
      ejecutarBusqueda(texto);
    }, 250);

    return () => clearTimeout(timerRef.current);
  }, [texto, ejecutarBusqueda]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickFuera(e) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) {
        setAbierto(false);
      }
    }
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, []);

  // Cambiar cantidad de un producto en el dropdown
  const cambiarCantidad = (id, delta) => {
    setCantidades(prev => {
      const actual = prev[id] || 1;
      const nuevo = Math.max(1, actual + delta);
      return { ...prev, [id]: nuevo };
    });
  };

  const handleCantidadDirecta = (id, valor) => {
    const num = parseInt(valor, 10);
    setCantidades(prev => ({
      ...prev,
      [id]: isNaN(num) || num < 1 ? 1 : num
    }));
  };

  // Agregar al carrito y reiniciar buscador
  const handleAgregar = useCallback((producto) => {
    const cant = cantidades[producto.id] || 1;
    onAgregar(producto, cant);
    setTexto('');
    setResultados([]);
    setAbierto(false);
    setSinResultados(false);
    inputRef.current?.focus();
  }, [cantidades, onAgregar]);

  // Manejo de teclado (Enter, Flechas, Escape)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(timerRef.current);

      // Si la lista ya está visible y hay resultados, agrega el producto seleccionado
      if (abierto && resultados.length > 0) {
        const item = resultados[indiceActivo] || resultados[0];
        if (item) handleAgregar(item);
        return;
      }

      // Si la lista no está abierta o se acaba de presionar Enter, busca inmediatamente
      if (texto.trim()) {
        ejecutarBusqueda(texto);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!abierto && resultados.length > 0) {
        setAbierto(true);
      } else {
        setIndiceActivo(prev => (prev + 1) % Math.max(1, resultados.length));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceActivo(prev => (prev - 1 + resultados.length) % Math.max(1, resultados.length));
    } else if (e.key === 'Escape') {
      setAbierto(false);
    }
  };

  const limpiar = () => {
    setTexto('');
    setResultados([]);
    setAbierto(false);
    setSinResultados(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={contenedorRef} style={{ position: 'relative', width: '100%' }}>
      {/* Campo de Entrada */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Search
          size={18}
          style={{
            position: 'absolute',
            left: 14,
            color: '#b58463',
            pointerEvents: 'none'
          }}
        />
        <input
          id="buscador-nombre-producto"
          ref={inputRef}
          type="text"
          aria-label="Buscar producto por nombre"
          aria-autocomplete="list"
          aria-controls="lista-resultados-nombre"
          aria-expanded={abierto}
          placeholder="Buscar por nombre... (ej. Carro, Pelota, Plastilina) — Presiona Enter"
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (resultados.length > 0) setAbierto(true);
          }}
          style={{
            width: '100%',
            paddingLeft: 42,
            paddingRight: texto ? 72 : 36,
            paddingTop: 12,
            paddingBottom: 12,
            border: '1.5px solid var(--border-card, #f0d5c2)',
            borderRadius: 14,
            fontSize: '0.98rem',
            background: '#ffffff',
            color: 'var(--text-title, #2B1810)',
            outline: 'none',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            transition: 'all 0.15s ease'
          }}
        />

        {/* Indicador de carga o botón de limpiar */}
        <div style={{ position: 'absolute', right: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          {cargando && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--primary-orange, #FF6600)' }} />}
          {texto && (
            <button
              type="button"
              onClick={limpiar}
              aria-label="Limpiar búsqueda"
              style={{
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '50%',
                width: 22,
                height: 22,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b7280'
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* DROPDOWN FLOTANTE DE RESULTADOS (HU-0302) */}
      {abierto && resultados.length > 0 && (
        <ul
          id="lista-resultados-nombre"
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 100,
            background: '#ffffff',
            border: '1.5px solid var(--border-card, #f0d5c2)',
            borderRadius: 16,
            boxShadow: '0 12px 36px rgba(67, 23, 4, 0.14)',
            maxHeight: 340,
            overflowY: 'auto',
            listStyle: 'none',
            margin: 0,
            padding: '6px',
            animation: 'slideDown 0.15s ease'
          }}
        >
          {resultados.map((p, index) => {
            const estaActivo = index === indiceActivo;
            const cant = cantidades[p.id] || 1;

            return (
              <li
                key={p.id}
                role="option"
                aria-selected={estaActivo}
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  marginBottom: 4,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: estaActivo ? '#fff6ed' : 'transparent',
                  border: estaActivo ? '1px solid #ffedd5' : '1px solid transparent',
                  transition: 'background 0.12s ease'
                }}
                onMouseEnter={() => setIndiceActivo(index)}
              >
                {/* Info Producto */}
                <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.08rem', color: 'var(--text-title, #2B1810)' }}>
                      {p.nombre}
                    </span>
                    {p.codigoInterno && (
                      <span style={{
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        background: '#fef3c7',
                        color: '#92400e',
                        padding: '2px 8px',
                        borderRadius: 6
                      }}>
                        {p.codigoInterno}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#785b49', marginTop: 3 }}>
                    Categoría: <strong style={{ color: '#452b1e' }}>{p.categoria}</strong>
                  </div>
                </div>

                {/* Precio + Control de Cantidad + Botón Agregar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                  <span style={{
                    fontSize: '1.18rem',
                    fontWeight: 900,
                    color: '#c2410c',
                    whiteSpace: 'nowrap'
                  }}>
                    {COP(p.precioVentaUnitario)}
                  </span>

                  {/* Stepper ágil dentro del resultado */}
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: '#ffffff',
                      border: '1.5px solid #d1d5db',
                      borderRadius: 10,
                      overflow: 'hidden'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => cambiarCantidad(p.id, -1)}
                      style={{
                        border: 'none',
                        background: '#f9fafb',
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#1f2937'
                      }}
                    >
                      <Minus size={15} />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={cant}
                      onChange={e => handleCantidadDirecta(p.id, e.target.value)}
                      style={{
                        width: 40,
                        height: 32,
                        border: 'none',
                        textAlign: 'center',
                        fontWeight: 800,
                        fontSize: '0.98rem',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => cambiarCantidad(p.id, 1)}
                      style={{
                        border: 'none',
                        background: '#f9fafb',
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#1f2937'
                      }}
                    >
                      <Plus size={15} />
                    </button>
                  </div>

                  {/* Botón directo de agregar */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAgregar(p);
                    }}
                    style={{
                      background: 'var(--primary-orange, #FF6600)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 10,
                      padding: '9px 16px',
                      fontSize: '0.92rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 2px 8px rgba(255, 102, 0, 0.25)',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#e65c00'}
                    onMouseLeave={e => e.currentTarget.style.background = '#FF6600'}
                  >
                    <Check size={16} /> Agregar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Mensaje sin coincidencias (CA-3 HU-0302) */}
      {sinResultados && texto.trim() && (
        <div
          role="status"
          style={{
            marginTop: 8,
            padding: '10px 14px',
            background: '#fffaf4',
            border: '1px solid #fed7aa',
            borderRadius: 10,
            fontSize: '0.88rem',
            color: '#9a3412',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <span>🔍</span> No se encontraron productos coincidentes con «<strong>{texto}</strong>».
        </div>
      )}
    </div>
  );
}
