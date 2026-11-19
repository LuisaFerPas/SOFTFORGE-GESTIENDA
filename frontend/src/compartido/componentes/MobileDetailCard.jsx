import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import './mobileDetailCard.css';

/** Una fila legible en móvil. En escritorio se conserva la tabla original. */
export function MobileDetailCard({ titulo, subtitulo, monto, estado, children, indice = 0 }) {
  const [abierto, setAbierto] = useState(false);
  const id = useId();

  return (
    <article className="dm-card" style={{ '--dm-index': Math.min(indice, 8) }}>
      <div className="dm-card__row">
        <div className="dm-card__identity">
          <strong className="dm-card__title">{titulo}</strong>
          {subtitulo && <span className="dm-card__subtitle">{subtitulo}</span>}
        </div>
        {monto && <strong className="dm-card__amount">{monto}</strong>}
      </div>
      {estado && <div className="dm-card__state">{estado}</div>}
      {children && <>
        <button
          type="button"
          className="dm-card__toggle"
          aria-expanded={abierto}
          aria-controls={id}
          onClick={() => setAbierto(actual => !actual)}
        >
          {abierto ? 'Ver menos' : 'Ver más'}
          <ChevronDown size={18} aria-hidden="true" className={abierto ? 'dm-card__chevron dm-card__chevron--open' : 'dm-card__chevron'} />
        </button>
        <div id={id} className="dm-card__details" hidden={!abierto}>
          {children}
        </div>
      </>}
    </article>
  );
}

export function CampoDetalle({ etiqueta, children }) {
  return <div className="dm-card__field"><dt>{etiqueta}</dt><dd>{children}</dd></div>;
}
