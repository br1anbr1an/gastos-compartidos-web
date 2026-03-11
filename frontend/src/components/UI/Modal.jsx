import { X } from 'lucide-react';
import './Modal.css';

export const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="modal-header">
            <h2>{title}</h2>
            <button className="close-button" onClick={onClose}>
              <X size={24} />
            </button>
          </div>
        )}
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};
