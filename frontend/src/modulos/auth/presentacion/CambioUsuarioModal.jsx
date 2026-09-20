import React from 'react';

export function CambioUsuarioModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '400px',
        width: '100%'
      }}>
        <h3>Cambiar de Usuario</h3>
        <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '8px' }}>
          Modal para cambio rápido de cajero (Henrry - HU-0303)
        </p>
        <button onClick={onClose} style={{ marginTop: '16px', padding: '8px 16px', cursor: 'pointer' }}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
