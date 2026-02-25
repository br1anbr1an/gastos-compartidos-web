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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description || !amount || !category) return;
    
    addExpense({
      description,
      amount: parseFloat(amount),
      category_id: category.id,
      date: new Date(date).toISOString(),
    });

    // Reset form or close
    setDescription('');
    setAmount('');
    setCategory(null);
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

      <button type="submit" className="submit-button">
        Guardar Gasto
      </button>
    </form>
  );
};
