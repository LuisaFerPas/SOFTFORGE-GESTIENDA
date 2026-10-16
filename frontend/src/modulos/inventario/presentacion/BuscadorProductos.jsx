import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';

export function BuscadorProductos({ onBuscar, onBuscarInmediato, onProductoEncontrado, placeholder = 'Buscar por código o nombre...' }) {
  const [termino, setTermino] = useState('');
  const [ultimaTecla, setUltimaTecla] = useState(0);
  const [buffer, setBuffer] = useState('');
  const inputRef = useRef(null);

  const enfocar = useCallback(() => inputRef.current?.focus(), []);

  useEffect(() => { enfocar(); }, [enfocar]);

  const handleKeyDown = (e) => {
    const ahora = Date.now();
    const char = e.key;

    if (char.length === 1 && !e.ctrlKey && !e.metaKey) {
      // Detección pistola USB: ≥6 chars, <40ms entre teclas
      if (ahora - ultimaTecla < 40) {
        setBuffer((b) => b + char);
      } else {
        setBuffer(char);
      }
      setUltimaTecla(ahora);
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const texto = buffer || termino;
      if (texto.trim()) {
        // Escaneo de pistola: buffer largo capturado en ráfaga → búsqueda inmediata.
        // Enter manual (pocas teclas) → búsqueda normal con debounce.
        const esEscaneo = buffer.length >= 6;
        if (esEscaneo) {
          (onBuscarInmediato || onBuscar)(texto.trim());
        } else {
          (onBuscar || onBuscarInmediato)(texto.trim());
        }
      }
      setBuffer('');
      setTermino('');
      // Seleccionar texto para siguiente escaneo
      setTimeout(() => inputRef.current?.select(), 0);
    }
  };

  const handleChange = (e) => {
    setTermino(e.target.value);
    setBuffer(''); // Reset buffer si teclean manual
    onBuscar(e.target.value); // Con debounce en padre
  };

  const limpiar = () => {
    setTermino('');
    setBuffer('');
    (onBuscarInmediato || onBuscar)('');
    enfocar();
  };

  return (
    <div className="buscador-productos" style={{ position: 'relative', maxWidth: '400px' }}>
      <label htmlFor="buscador-productos" className="sr-only">Buscar productos</label>
      <div className="buscador-input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Search className="buscador-icon" style={{ position: 'absolute', left: '0.75rem', color: '#999', pointerEvents: 'none', width: '18px', height: '18px' }} />
        <input
          ref={inputRef}
          id="buscador-productos"
          type="text"
          placeholder={placeholder}
          value={termino}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
          style={{
            width: '100%',
            padding: '0.5rem 2.5rem 0.5rem 2.5rem',
            border: '1px solid var(--color-borde, #ddd)',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            background: 'white',
            outline: 'none'
          }}
        />
        {termino && (
          <button 
            type="button" 
            className="buscador-clear" 
            onClick={limpiar} 
            aria-label="Limpiar búsqueda"
            style={{
              position: 'absolute',
              right: '0.5rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#999',
              padding: '0.25rem'
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}