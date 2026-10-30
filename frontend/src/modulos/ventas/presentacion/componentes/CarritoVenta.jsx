import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Minus, Plus, RotateCcw, Search, ShoppingCart, Trash2 } from 'lucide-react';
import {
  MENSAJE_CANTIDAD_INVALIDA,
  subtotalLinea,
  validarCantidad
} from './carritoLogica';
import './CarritoVenta.css';

const formatoPorDefecto = (valor) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0
}).format(Number(valor) || 0);

/**
 * HU-0303.1 — Línea del carrito con cantidad editable.
 * El error y la reversión son locales; el estado real vive en VentasPage.
 */
function LineaCarrito({ item, onCambiarCantidad, onEliminar, deshabilitado, formato }) {
  const [borrador, setBorrador] = useState(String(item.cantidad));
  const [error, setError] = useState('');
  const ultimaCantidad = useRef(item.cantidad);

  useEffect(() => {
    if (item.cantidad !== ultimaCantidad.current) {
      ultimaCantidad.current = item.cantidad;
      setBorrador(String(item.cantidad));
      setError('');
    }
  }, [item.cantidad]);

  function confirmarCantidad(valor) {
    const resultado = validarCantidad(valor);
    if (!resultado.valida) {
      setError(resultado.error);
      return;
    }
    setError('');
    setBorrador(String(resultado.cantidad));
    ultimaCantidad.current = resultado.cantidad;
    onCambiarCantidad?.(item.id, resultado.cantidad);
  }

  function alCambiar(evento) {
    const valor = evento.target.value;
    setBorrador(valor);
    if (validarCantidad(valor).valida) {
      confirmarCantidad(valor);
    } else {
      setError(MENSAJE_CANTIDAD_INVALIDA);
    }
  }

  function alSalir() {
    if (!validarCantidad(borrador).valida) {
      setBorrador(String(ultimaCantidad.current));
      setError(MENSAJE_CANTIDAD_INVALIDA);
    }
  }

  function ajustar(delta) {
    confirmarCantidad(item.cantidad + delta);
  }

  const errorId = `cv-cantidad-error-${String(item.id).replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <div className="pos-cart-item">
      <div className="pos-cart-item-top">
        <div>
          <strong>{item.nombre}</strong>
          <small>{formato(item.precioVentaUnitario)} / unidad</small>
        </div>
        <button
          type="button"
          className="pos-trash"
          disabled={deshabilitado}
          title={`Quitar ${item.nombre}`}
          aria-label={`Quitar ${item.nombre} del carrito`}
          onClick={() => onEliminar?.(item.id)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            fontSize: '0.88rem',
            fontWeight: 700,
            color: '#b91c1c',
            backgroundColor: '#fee2e2',
            border: '1.5px solid #fecaca',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          <Trash2 size={16} />
          <span>Quitar</span>
        </button>
      </div>
      <div className="pos-cart-item-bottom">
        <div
          className={`pos-quantity ${error ? 'cv-quantity--error' : ''}`}
          aria-label={`Cantidad de ${item.nombre}`}
        >
          <button
            type="button"
            disabled={deshabilitado || item.cantidad <= 1}
            aria-label={`Disminuir cantidad de ${item.nombre}`}
            onClick={() => ajustar(-1)}
          >
            <Minus size={16} />
          </button>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            aria-label={`Cantidad de ${item.nombre}`}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            disabled={deshabilitado}
            value={borrador}
            onChange={alCambiar}
            onBlur={alSalir}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') evento.preventDefault();
            }}
          />
          <button
            type="button"
            disabled={deshabilitado}
            aria-label={`Aumentar cantidad de ${item.nombre}`}
            onClick={() => ajustar(1)}
          >
            <Plus size={16} />
          </button>
        </div>
        <strong>{formato(subtotalLinea(item))}</strong>
      </div>
      {error && (
        <p className="cv-cart-error" id={errorId} role="alert">
          <AlertCircle size={14} aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

/**
 * HU-0303.1 — Lista del carrito, estado vacío y acción de vaciar.
 * No conoce pagos ni la lógica de búsqueda; solo notifica al padre.
 */
export function CarritoVenta({
  items = [],
  onCambiarCantidad,
  onEliminar,
  onVaciar,
  onBuscar,
  deshabilitado = false,
  formato = formatoPorDefecto
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <div className="pos-cart-empty">
        <div><ShoppingCart size={29} /></div>
        <strong>Aún no hay productos</strong>
        <p>Busca un producto y pulsa su tarjeta para añadirlo.</p>
        {typeof onBuscar === 'function' && (
          <button type="button" onClick={onBuscar}>
            <Search size={16} /> Buscar productos
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="pos-cart-list">
        {items.map((item) => (
          <LineaCarrito
            key={item.id}
            item={item}
            onCambiarCantidad={onCambiarCantidad}
            onEliminar={onEliminar}
            deshabilitado={deshabilitado}
            formato={formato}
          />
        ))}
      </div>
      <button
        type="button"
        className="pos-clear-cart"
        onClick={() => onVaciar?.()}
        disabled={deshabilitado}
      >
        <RotateCcw size={15} /> Vaciar carrito
      </button>
    </>
  );
}
