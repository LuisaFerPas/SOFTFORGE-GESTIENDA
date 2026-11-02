import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, LoaderCircle, Printer } from 'lucide-react';
import { reimprimirFactura } from '../../servicios/ventasService';
import {
  describirErrorReimpresion,
  describirResultadoReimpresion,
  esFacturaReimprimible
} from './reimpresionEstado';
import './ReimprimirFacturaButton.css';

/**
 * SD-124 / HU-0405.3.
 * Añadir dentro del <td> de acciones de HistorialFacturasPage.jsx:
 * <ReimprimirFacturaButton factura={factura} />
 * No renderiza el botón para facturas que NO estén EMITIDAS.
 */
export function ReimprimirFacturaButton({ factura, onPreparada }) {
  const [estado, setEstado] = useState('inicial');
  const [mensaje, setMensaje] = useState('');
  const enviandoRef = useRef(false);
  const montadoRef = useRef(false);

  useEffect(() => {
    montadoRef.current = true;
    return () => { montadoRef.current = false; };
  }, []);

  useEffect(() => {
    setEstado('inicial');
    setMensaje('');
  }, [factura?.consecutivo, factura?.estado]);

  if (!esFacturaReimprimible(factura)) return null;

  const consecutivo = factura.consecutivo.trim().toUpperCase();
  const procesando = estado === 'procesando';

  async function solicitarReimpresion() {
    // Ref evita una segunda petición entre dos actualizaciones de React.
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setEstado('procesando');
    setMensaje('');
    try {
      const respuesta = await reimprimirFactura(consecutivo);
      const resultado = describirResultadoReimpresion(respuesta, consecutivo);
      if (!montadoRef.current) return;
      setEstado(resultado.tipo);
      setMensaje(resultado.mensaje);
      if (typeof onPreparada === 'function') onPreparada(consecutivo);
    } catch (error) {
      if (!montadoRef.current) return;
      setEstado('error');
      setMensaje(describirErrorReimpresion(error));
    } finally {
      enviandoRef.current = false;
    }
  }

  const mensajeId = `reimpresion-${consecutivo.replace(/[^A-Z0-9-]/g, '')}`;

  return (
    <div className="pos-reimpresion">
      <button
        className="pos-reimpresion__boton"
        type="button"
        onClick={solicitarReimpresion}
        disabled={procesando}
        aria-busy={procesando}
        aria-describedby={mensaje ? mensajeId : undefined}
        title="Consulta la factura para reimpresión. La impresión física aún no está habilitada."
      >
        {procesando ? <LoaderCircle className="pos-reimpresion__giro" size={16} aria-hidden="true" />
          : <Printer size={16} aria-hidden="true" />}
        {procesando ? 'Consultando…' : 'Reimprimir'}
      </button>

      {mensaje && (
        <div
          id={mensajeId}
          role={estado === 'error' ? 'alert' : 'status'}
          className={`pos-reimpresion__mensaje pos-reimpresion__mensaje--${estado}`}
        >
          {estado === 'error' ? <AlertCircle size={16} aria-hidden="true" />
            : estado === 'exito' ? <CheckCircle2 size={16} aria-hidden="true" />
              : <Info size={16} aria-hidden="true" />}
          <span>{mensaje}</span>
        </div>
      )}
    </div>
  );
}
