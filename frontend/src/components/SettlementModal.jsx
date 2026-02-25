import { X } from 'lucide-react';
import './SettlementModal.css';

export const SettlementModal = ({ isOpen, onClose, settlement, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settlement-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          <X size={24} />
        </button>
        
        <h2 className="settlement-title">Cerrar Proyecto</h2>
        
        <div className="settlement-info">
          <div className="settlement-summary">
            <p className="settlement-text">
              <span className="debtor-name">{settlement.debtor}</span> debe pagar
            </p>
            <div className="settlement-amount">{settlement.amount}</div>
            <p className="settlement-text">
              a <span className="creditor-name">{settlement.creditor}</span>
            </p>
          </div>
          
          <div className="settlement-breakdown">
            <p className="breakdown-item">
              <span>{settlement.user1Name}:</span>
              <strong>{settlement.user1Total}</strong>
            </p>
            <p className="breakdown-item">
              <span>{settlement.user2Name}:</span>
              <strong>{settlement.user2Total}</strong>
            </p>
            <p className="breakdown-divider"></p>
            <p className="breakdown-item total-item">
              <span>Total:</span>
              <strong>{settlement.total}</strong>
            </p>
          </div>
        </div>

        <div className="settlement-actions">
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={onConfirm}>
            Confirmar Pago y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
