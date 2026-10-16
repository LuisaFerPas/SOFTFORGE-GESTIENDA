import { useState, useRef, useCallback, useEffect } from 'react';
import { listarProductosApi } from '../servicios/inventarioService.js';

export function useBusquedaProductos() {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

  const buscar = useCallback(async (termino) => {
    const requestId = ++requestIdRef.current;
    setCargando(true);
    setError(null);
    
    try {
      const res = await listarProductosApi({ search: termino });
      // Ignorar respuestas viejas
      if (requestId !== requestIdRef.current) return;
      
      if (res.success) {
        setItems(res.data);
      } else {
        setError(res.message);
        setItems([]);
      }
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setError(e.message);
      setItems([]);
    } finally {
      if (requestId === requestIdRef.current) setCargando(false);
    }
  }, []);

  // Debounce para teclado
  const buscarConDebounce = useCallback(
    (() => {
      let timeoutId;
      return (termino) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => buscar(termino), 300);
      };
    })(),
    [buscar]
  );

  return { items, cargando, error, buscar, buscarConDebounce };
}