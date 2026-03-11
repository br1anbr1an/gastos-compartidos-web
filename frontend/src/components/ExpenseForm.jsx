import { useState, useMemo, useEffect } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { CustomSelect } from './UI/CustomSelect';
import { X, Plus, Trash2 } from 'lucide-react';
import './ExpenseForm.css';

const CATEGORIES = [
  'Despensa', 'Estilo de Vida', 'Michis', 
  'Mantenimiento Auto', 'Mantenimiento Casa', 
  'Gasolina', 'Salud', 'Otros', 
  'Servicios', 'Transporte'
];

export const ExpenseForm = ({ onClose, editingExpense = null, title }) => {
  const { addExpense, updateExpense, currentProject, categories } = useExpenses();
  
  const displayTitle = title || (editingExpense ? 'Editar Gasto' : 'Nuevo Gasto');
  
  // Track initial state to detect changes
  const initialData = useMemo(() => {
    // Current backend returns "YYYY-MM-DD"
    const initialDate = editingExpense?.date 
      ? (typeof editingExpense.date === 'string' && editingExpense.date.includes('T')
          ? editingExpense.date.split('T')[0]
          : editingExpense.date)
      : new Date().toISOString().split('T')[0];

    // Normalize amount to 2 decimal places to match calculated total
    const initialAmount = editingExpense?.amount 
      ? parseFloat(editingExpense.amount).toFixed(2)
      : '';

    return {
      description: editingExpense?.description || '',
      amount: initialAmount,
      category_id: editingExpense?.category_id || null,
      date: initialDate,
      is_loan: editingExpense?.is_loan || false,
      items: (editingExpense?.items || []).map(item => ({
        description: item.description,
        amount: parseFloat(item.amount).toFixed(2)
      }))
    };
  }, [editingExpense]);

  const [description, setDescription] = useState(initialData.description);
  const [amount, setAmount] = useState(initialData.amount);
  const [items, setItems] = useState(initialData.items);
  const [category, setCategory] = useState(
    initialData.category_id ? categories.find(c => c.id === initialData.category_id) : null
  );
  const [date, setDate] = useState(initialData.date);
  const [isLoan, setIsLoan] = useState(initialData.is_loan);

  // Auto-calculate total if items exist
  useEffect(() => {
    if (items.length > 0) {
      const total = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      const formattedTotal = total.toFixed(2);
      // Only update if it actually changed to avoid unnecessary dirty state
      if (amount !== formattedTotal) {
        setAmount(formattedTotal);
      }
    }
  }, [items, amount]);

  const isDirty = 
    description !== initialData.description ||
    amount !== initialData.amount ||
    (category?.id || null) !== initialData.category_id ||
    date !== initialData.date ||
    isLoan !== initialData.is_loan ||
    JSON.stringify(items) !== JSON.stringify(initialData.items);

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
      items: items.map(item => ({
        description: item.description,
        amount: parseFloat(item.amount)
      }))
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
      <div className="form-header">
        <h2>{displayTitle}</h2>
        <button type="button" className="form-close-btn" onClick={handleClose} title="Cerrar">
          <X size={24} />
        </button>
      </div>

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
        <label htmlFor="amount">Monto {items.length > 0 && '(Calculado)'}</label>
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
          readOnly={items.length > 0}
          className={items.length > 0 ? 'readonly-input' : ''}
        />
      </div>

      <div className="form-section">
        <div className="section-header">
          <h3>Desglose (Opcional)</h3>
          <button 
            type="button" 
            className="add-item-btn"
            onClick={() => setItems([...items, { description: '', amount: '' }])}
          >
            <Plus size={16} /> Añadir Ítem
          </button>
        </div>
        
        <div className="items-list">
          {items.map((item, index) => (
            <div key={index} className="item-row">
              <input
                type="text"
                placeholder="Descripción (ej: Leche)"
                value={item.description}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[index].description = e.target.value;
                  setItems(newItems);
                }}
                required
              />
              <input
                type="number"
                placeholder="0.00"
                step="0.01"
                value={item.amount}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[index].amount = e.target.value;
                  setItems(newItems);
                }}
                required
              />
              <button 
                type="button" 
                className="remove-item-btn"
                onClick={() => setItems(items.filter((_, i) => i !== index))}
                title="Eliminar ítem"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
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
