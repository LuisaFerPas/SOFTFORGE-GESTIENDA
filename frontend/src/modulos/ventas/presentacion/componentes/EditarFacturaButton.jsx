import { useState } from 'react';
import { PencilLine } from 'lucide-react';
import { useAuth } from '../../../../compartido/contexto/AuthContext';
import { ModalEditarFactura } from './ModalEditarFactura';
import './EdicionFactura.css';

/** HU-0404 Fase A: acceso administrativo para corregir el cliente. */
export function EditarFacturaButton({ factura, onEditada }) {
  const { isAdmin } = useAuth();
  const [abierto, setAbierto] = useState(false);

  if (!isAdmin || !factura || factura.estado !== 'EMITIDA') return null;

  return (
    <>
      <button
        type="button"
        className="fh-view fh-edit"
        onClick={() => setAbierto(true)}
        title={`Corregir el nombre del cliente de ${factura.consecutivo}`}
      >
        <PencilLine size={16} /> Corregir nombre
      </button>
      <ModalEditarFactura
        abierto={abierto}
        factura={factura}
        onCerrar={() => setAbierto(false)}
        onGuardada={onEditada}
      />
    </>
  );
}
