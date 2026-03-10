import { useExpenses } from '../context/ExpenseContext';
import { Trash2, SmilePlus } from 'lucide-react';
import './ExpenseList.css';

export const ExpenseList = () => {
  const { 
    getExpensesByCurrentProject, 
    removeExpense, 
    formatCurrency, 
    formatDate, 
    currentProject, 
    categories, 
    users,
    currentUser,
    addReaction
  } = useExpenses();
  const expenses = getExpensesByCurrentProject();

  const EMOJIS = ['😂', '❤️', '😮', '😡', '👍', '😋'];

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
            {groupedExpenses[date].map((expense) => {
              const reactions = expense.reactions || [];
              const reactionCounts = reactions.reduce((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {});
              const myReaction = reactions.find(r => r.user_id === currentUser?.id)?.emoji;

              return (
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
                    
                    <div className="expense-reactions">
                      {Object.entries(reactionCounts).map(([emoji, count]) => (
                        <button 
                          key={emoji} 
                          className={`reaction-pill ${myReaction === emoji ? 'active' : ''}`}
                          onClick={() => addReaction(expense.id, emoji)}
                        >
                          <span className="emoji">{emoji}</span>
                          <span className="count">{count}</span>
                        </button>
                      ))}
                      
                      <div className="add-reaction-container">
                        <button className="add-reaction-trigger" title="Reaccionar">
                          <SmilePlus size={16} />
                        </button>
                        <div className="emoji-picker">
                          {EMOJIS.map(emoji => (
                            <button 
                              key={emoji} 
                              className={`emoji-btn ${myReaction === emoji ? 'selected' : ''}`}
                              onClick={() => addReaction(expense.id, emoji)}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="expense-amount-actions">
                    <span className="expense-amount">{formatCurrency(expense.amount)}</span>
                    {currentUser?.id === expense.user_id && !currentProject?.closed_at && (
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
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
