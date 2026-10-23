import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiX } from 'react-icons/fi';

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

const Modal = ({ isOpen, onClose, title, description, children, size = 'md', footer }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Portalled to <body> so no parent transform/overflow can clip it.
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <motion.div
              className="fixed inset-0 bg-coal/55 backdrop-blur-[3px]"
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              className={`relative w-full ${sizes[size] || sizes.md} bg-white rounded-2xl shadow-[0_30px_80px_-20px_rgba(21,17,14,0.55)] overflow-hidden`}
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            >
              <div className="h-1 bg-gradient-to-r from-brand via-gold to-brand" />
              <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-line">
                <div>
                  <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
                  {description && <p className="mt-1 text-sm text-muted">{description}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 -mr-2 rounded-lg text-muted hover:text-brand hover:bg-brand-soft hover:rotate-90 transition-all duration-300"
                  aria-label="Close"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">{children}</div>

              {footer && (
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-line bg-cream/60">{footer}</div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default Modal;
