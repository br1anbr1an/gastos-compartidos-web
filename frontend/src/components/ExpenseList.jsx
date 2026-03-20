import { useState } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { Trash2, SmilePlus, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { ExpenseForm } from './ExpenseForm';
import { RefreshCw } from 'lucide-react';
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
    addReaction,
    refreshExpenses,
  } = useExpenses();
  const [editingId, setEditingId] = useState(null);
  const expenses = getExpensesByCurrentProject();
  const [expandedIds, setExpandedIds] = useState(new Set());
// ... (omitting groupedExpenses and sortedDates for brevity, will apply carefully)
// Actual replacement below

  const EMOJIS = ['😂', '❤️', '😮', '😡', '👍', '😋'];

  const toggleExpand = (id) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

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
              const isEditing = editingId === expense.id;
              const isExpanded = expandedIds.has(expense.id);

              if (isEditing) {
                return (
                  <div key={expense.id} className="expense-item editing">
                    <ExpenseForm 
                      editingExpense={expense} 
                      onClose={() => setEditingId(null)} 
                    />
                  </div>
                );
              }

              return (
                <div key={expense.id} className="expense-item-container">
                  <div className={`expense-item ${isExpanded ? 'expanded' : ''}`}>
                    <div className="expense-info">
                      <div className="expense-desc-row">
                        <span className="expense-desc">{expense.description}</span>
                        {expense.items && expense.items.length > 0 && (
                          <button 
                            className="expand-btn" 
                            onClick={() => toggleExpand(expense.id)}
                            title={isExpanded ? "Ocultar detalle" : "Ver detalle"}
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        )}
                      </div>
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
                        <div className="item-actions">
                          <button 
                            className="edit-btn"
                            onClick={() => setEditingId(expense.id)}
                            aria-label="Editar gasto"
                          >
                            <Pencil size={18} />
                          </button>
                          <button 
                            className="delete-btn"
                            onClick={() => removeExpense(expense.id)}
                            aria-label="Eliminar gasto"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {isExpanded && expense.items && expense.items.length > 0 && (
                    <div className="expense-details-expanded">
                      <ul className="sub-items-list">
                        {expense.items.map((item, idx) => (
                          <li key={idx} className="sub-item">
                            <span className="sub-item-desc">{item.description}</span>
                            <span className="sub-item-amount">{formatCurrency(item.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
