import { useExpenses } from '../context/ExpenseContext';
import { Trash2 } from 'lucide-react';
import './ExpenseList.css';

export const ExpenseList = () => {
  const { getExpensesByCurrentProject, removeExpense, formatCurrency, formatDate, currentProject, categories, users } = useExpenses();
  const expenses = getExpensesByCurrentProject();


  if (expenses.length === 0) {
    return (
      <div className="empty-state">
        <p>No hay gastos registrados aún.</p>
      </div>
    );
  }

  // Group by date
  const groupedExpenses = expenses.reduce((groups, expense) => {
    const category = categories.find(c => c.id === expense.category_id);
    expense.category = category?.name || 'Sin categoría';
    const date = expense.date.split('T')[0];
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(expense);
    return groups;
  }, {});

  // Sort dates descending
  const sortedDates = Object.keys(groupedExpenses).sort((a, b) => new Date(b) - new Date(a));

  return (
    <div className="expense-list">
      {sortedDates.map((date) => (
        <div key={date} className="date-group">
          <h3 className="date-header">{formatDate(date)}</h3>
          <div className="expense-items">
            {groupedExpenses[date].map((expense) => (
              <div key={expense.id} className="expense-item">
                <div className="expense-info">
                  <span className="expense-desc">{expense.description}</span>
                  <div className="expense-meta">
                    <span className="expense-cat">{expense.category}</span>
                    <span className="expense-user">
                      {users.find(u => u.id === expense.user_id)?.name || 'Anónimo'}
                    </span>
                    {expense.is_loan && (
                      <span className="expense-cat loan-badge" title="Este gasto no se divide a la mitad">
                        Préstamo
                      </span>
                    )}
                  </div>
                </div>
                <div className="expense-amount-actions">
                  <span className="expense-amount">{formatCurrency(expense.amount)}</span>
                  {!currentProject?.closed_at && (
                    <button 
                      className="delete-btn"
                      onClick={() => removeExpense(expense.id)}
                      aria-label="Eliminar gasto"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
