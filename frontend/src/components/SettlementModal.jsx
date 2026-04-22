import { X, Loader2, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import './SettlementModal.css';

export const SettlementModal = ({ isOpen, onClose, settlement, onConfirm, currentProject }) => {
  const [isClosing, setIsClosing] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsClosing(true);
    // Combine the API call and an artificial delay using Promise.all
    await Promise.all([
      onConfirm(),
      new Promise(resolve => setTimeout(resolve, 800))
    ]);
    setIsClosing(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settlement-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar" disabled={isClosing}>
          <X size={24} />
        </button>

        <h2 className="settlement-title">Cerrar Proyecto</h2>

        {!currentProject.is_private ? (
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
          </div>) : (
          <div className="settlement-info">
            <div className="settlement-breakdown">
              <p className="breakdown-item total-item">
                <span>Total:</span>
                <strong>{settlement.total}</strong>
              </p>
            </div>
          </div>)}

        <div className="settlement-warning">
          <AlertTriangle size={20} />
          <p>Esta acción es irreversible. Una vez cerrado el proyecto, no podrás añadir, editar ni eliminar gastos.</p>
        </div>

        <div className="settlement-actions">
          <button className="btn-secondary" onClick={onClose} disabled={isClosing}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={handleConfirm} disabled={isClosing}>
            {isClosing ? (
              <>
                <Loader2 size={18} className="spinner" />
                Cerrando...
              </>
            ) : (
              currentProject.is_private ? 'Confirmar Cierre' : 'Confirmar Pago y Cerrar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
