import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

const Modal = ({ open, onClose, children, maxWidth = 480 }) => {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        animation: 'fadeIn .15s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius)',
          width: '100%', maxWidth,
          maxHeight: '90vh',
          overflow: 'auto',
          animation: 'fadeIn .2s ease',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Modal;