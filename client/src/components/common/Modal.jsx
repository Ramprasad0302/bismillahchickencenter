import { Fragment } from 'react';
import { FiX } from 'react-icons/fi';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  description,
  children,
  size = 'md',
  footer 
}) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <Fragment>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={onClose}
          />
          
          {/* Modal */}
          <div className={`relative w-full ${sizes[size]} bg-white rounded-xl shadow-xl`}>
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-[#E5E8E6]">
              <div>
                <h3 className="text-lg font-semibold text-[#151A17]">{title}</h3>
                {description && (
                  <p className="mt-1 text-sm text-[#6B716D]">{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="flex justify-end gap-3 p-6 border-t border-[#E5E8E6]">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default Modal;