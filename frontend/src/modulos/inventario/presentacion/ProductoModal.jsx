import React from 'react';

export function ProductoModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  return <div>{/* Modal para agregar/editar producto */}</div>;
}

export function EntradaStockModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  return <div>{/* Modal para registrar entrada de stock */}</div>;
}
