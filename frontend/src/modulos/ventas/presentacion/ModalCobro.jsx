import React from 'react';

export function ModalCobro({ isOpen, onClose }) {
  if (!isOpen) return null;
  return <div>{/* Modal para procesar cobro (Efectivo, Nequi, Mixto) */}</div>;
}
