import React, { useState } from 'react';
import { AlertCircle, HelpCircle } from 'lucide-react';
import { validarUmbral } from '../utilidades/validarUmbral.js';

export function CampoUmbralStock({ value = '', onChange, error: errorProp, disabled = false }) {
  const [errorLocal, setErrorLocal] = useState(null);
  const validation = validarUmbral(value);
  const error = errorProp ?? (validation.valido ? null : validation.error);

  const handleChange = (e) => {
    const raw = e.target.value;
    onChange(raw === '' ? '' : Number(raw)); // Emite '' (vacío) o número
    setErrorLocal(validation.error);
  };

  return (
    <div className="campo-umbral" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label 
        htmlFor="stockMinimoAlerta" 
        style={{ 
          display: 'block', 
          fontSize: '0.85rem', 
          fontWeight: 700, 
          color: '#4A3B32', 
          marginBottom: '6px' 
        }}
      >
        Stock mínimo de alerta
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id="stockMinimoAlerta"
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          placeholder="10"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '12px',
            border: `1.5px solid ${error ? '#FCA5A5' : '#F4E8DC'}`,
            fontSize: '0.95rem',
            outline: 'none',
            fontFamily: 'inherit'
          }}
        />
        {error && (
          <div style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            color: '#DC2626',
            fontSize: '1rem'
          }}
          onClick={() => alert(error)}
          title="Ver error"
          >
            <AlertCircle size={18} />
          </div>
        )}
        <HelpCircle 
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            color: '#877468',
            fontSize: '1rem'
          }}
          title="Por defecto 10. Déjelo vacío para usar el valor por defecto."
        />
      </div>
      {error && (
        <div style={{
          backgroundColor: '#FEE2E2',
          color: '#DC2626',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginTop: '4px'
        }}>
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}