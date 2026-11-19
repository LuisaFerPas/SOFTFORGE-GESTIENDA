import { useEffect, useRef, useState } from 'react';
import { ScanBarcode } from 'lucide-react';

/**
 * HU-0301.3: Componente de entrada para pistola de código de barras.
 * Tiene autofoco al montarse y detecta la tecla "Enter" que envían estos dispositivos.
 */
export function InputCodigoBarras({ onBuscar, deshabilitado }) {
  const [codigo, setCodigo] = useState('');
  const [errorLocal, setErrorLocal] = useState('');
  const inputRef = useRef(null);
  const procesando = useRef(false);

  // Autofoco al cargar la vista
  useEffect(() => {
    if (inputRef.current && !deshabilitado) {
      inputRef.current.focus();
    }
  }, [deshabilitado]);

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const codigoLimpio = codigo.trim();
      
      if (!codigoLimpio || procesando.current) return;
      procesando.current = true;

      setErrorLocal('');
      
      try {
        // HU-0301.4: Devolvemos el producto para que VentasPage decida qué hacer
        await onBuscar(codigoLimpio);
        setCodigo(''); // Limpiar solo si fue exitoso
      } catch (error) {
        // HU-0301.5: Mostrar alerta sin limpiar el campo
        setErrorLocal(error.message || 'Producto no encontrado');
      } finally {
        procesando.current = false;
        // Devolver el foco al input para el siguiente escaneo
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <div style={{ position: 'relative' }}>
        <ScanBarcode 
          size={20} 
          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#877468' }} 
        />
        <input
          ref={inputRef}
          type="text"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escanea y pulsa Enter (o escribe el código)"
          aria-label="Código de barras: escanea o escribe y pulsa Enter"
          autoComplete="off"
          inputMode="text"
          disabled={deshabilitado}
          style={{
            width: '100%',
            padding: '12px 12px 12px 40px',
            borderRadius: '8px',
            border: errorLocal ? '2px solid #DC2626' : '1px solid #D4A373',
            backgroundColor: '#FFFDF7',
            fontSize: '1rem',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>
      <span style={{ fontSize: '0.76rem', color: '#604739' }}>Compatible con lectores USB configurados como teclado. Enfoca este campo para escanear.</span>
      {errorLocal && (
        <span style={{ color: '#DC2626', fontSize: '0.85rem', fontWeight: 'bold' }}>
          {errorLocal}
        </span>
      )}
    </div>
  );
}