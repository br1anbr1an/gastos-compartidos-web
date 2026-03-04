import { useState } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { CustomSelect } from './UI/CustomSelect';
import './ExpenseForm.css';

const CATEGORIES = [
  'Despensa', 'Estilo de Vida', 'Michis', 
  'Mantenimiento Auto', 'Mantenimiento Casa', 
  'Gasolina', 'Salud', 'Otros', 
  'Servicios', 'Transporte'
];

export const ExpenseForm = ({ onClose }) => {
  const { addExpense, currentProject, categories } = useExpenses();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoan, setIsLoan] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description || !amount || !category) return;
    
    addExpense({
      description,
      amount: parseFloat(amount),
      category_id: category.id,
      date: new Date(date).toISOString(),
      is_loan: isLoan,
    });

    // Reset form or close
    setDescription('');
    setAmount('');
    setCategory(null);
    setIsLoan(false);
    onClose();
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
        Guardar Gasto
      </button>
    </form>
  );
};
