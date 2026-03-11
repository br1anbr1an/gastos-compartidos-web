import { useState, useMemo } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { CustomSelect } from './UI/CustomSelect';
import { X } from 'lucide-react';
import './ExpenseForm.css';

const CATEGORIES = [
  'Despensa', 'Estilo de Vida', 'Michis', 
  'Mantenimiento Auto', 'Mantenimiento Casa', 
  'Gasolina', 'Salud', 'Otros', 
  'Servicios', 'Transporte'
];

export const ExpenseForm = ({ onClose, editingExpense = null }) => {
  const { addExpense, updateExpense, currentProject, categories } = useExpenses();
  
  // Track initial state to detect changes
  const initialData = useMemo(() => ({
    description: editingExpense?.description || '',
    amount: editingExpense?.amount?.toString() || '',
    category_id: editingExpense?.category_id || null,
    date: editingExpense 
      ? new Date(editingExpense.date).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0],
    is_loan: editingExpense?.is_loan || false
  }), [editingExpense]);

  const [description, setDescription] = useState(initialData.description);
  const [amount, setAmount] = useState(initialData.amount);
  const [category, setCategory] = useState(
    initialData.category_id ? categories.find(c => c.id === initialData.category_id) : null
  );
  const [date, setDate] = useState(initialData.date);
  const [isLoan, setIsLoan] = useState(initialData.is_loan);

  const isDirty = 
    description !== initialData.description ||
    amount.toString() !== initialData.amount ||
    (category?.id || null) !== initialData.category_id ||
    date !== initialData.date ||
    isLoan !== initialData.is_loan;

  const handleClose = () => {
    if (isDirty) {
      if (window.confirm('Tienes cambios sin guardar. ¿Estás seguro de que quieres cerrar?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description || !amount || !category) return;
    
    const expenseData = {
      description,
      amount: parseFloat(amount),
      category_id: category.id,
      date: date,
      is_loan: isLoan,
    };

    let success = false;
    if (editingExpense) {
      success = await updateExpense(editingExpense.id, expenseData);
    } else {
      success = await addExpense(expenseData);
    }

    if (success) {
      onClose();
    }
  };

  if (!currentProject) {
    return (
      <div className="form-error">
        <p>No hay un proyecto activo seleccionado.</p>
      </div>
    );
  }

  return (
    <form className="expense-form" onSubmit={handleSubmit}>
      <button type="button" className="form-close-btn" onClick={handleClose} title="Cerrar">
        <X size={20} />
      </button>

      <div className="form-group">
        <label htmlFor="description">Descripción</label>
        <input
          type="text"
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej: Compras del super"
          required
          autoFocus
        />
      </div>

      <div className="form-group">
        <label htmlFor="amount">Monto</label>
        <input
          type="number"
          id="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          step="0.01"
          min="0"
          required
          inputMode="decimal"
        />
      </div>

      <div className="form-group">
        <label htmlFor="category">Categoría</label>
        <CustomSelect
          options={categories}
          value={category || { name: 'Seleccionar categoría' }}
          onChange={setCategory}
        />
      </div>

      <div className="form-group">
        <label htmlFor="date">Fecha</label>
        <input
          type="date"
          id="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      <div className="form-group checkbox-group">
        <label className="checkbox-label">
          <span>Es un préstamo (no se divide y se paga íntegro)</span>
          <div className="toggle-switch">
            <input
              type="checkbox"
              checked={isLoan}
              onChange={(e) => setIsLoan(e.target.checked)}
            />
            <span className="slider"></span>
          </div>
        </label>
      </div>

      <button type="submit" className="submit-button">
        {editingExpense ? 'Actualizar Gasto' : 'Guardar Gasto'}
      </button>
    </form>
  );
};
