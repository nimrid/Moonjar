'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-cream rounded-3xl border-3 border-ink shadow-sticker-lg max-h-[90vh] flex flex-col p-4 sm:p-6 relative my-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between pb-3 border-b-2 border-slate-200 mb-3 sm:mb-4 shrink-0">
          <h2 id="modal-title" className="text-lg sm:text-xl font-bold font-display text-ink">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-xl border-2 border-ink bg-slate-100 hover:bg-slate-200 text-ink transition-transform active:scale-95"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  );
};
