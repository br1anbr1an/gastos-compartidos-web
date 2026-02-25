import { useExpenses } from '../context/ExpenseContext';
import { SettlementModal } from './SettlementModal';
import { DoorOpen } from 'lucide-react';
import { useState, useEffect } from 'react';
import './Dashboard.css';

export const Dashboard = () => {
  const { 
    currentProject, 
    getExpensesByCurrentProject, 
    getExpensesByCategory, 
    formatCurrency,
    users,
    categories,
    filterUserId,
    setFilterUserId,
    filterCategoryId,
    setFilterCategoryId,
    closeProject
  } = useExpenses();

  const [showSettlement, setShowSettlement] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const projectExpenses = getExpensesByCurrentProject();
  const total = projectExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
  const byCategory = getExpensesByCategory();

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      const scrollThreshold = 200; // pixels
      setIsScrolled(window.scrollY > scrollThreshold);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!currentProject) return null;

  const calculateSettlement = () => {
    if (users.length < 2) return null;
    
    const user1 = users[0];
    const user2 = users[1];
    
    const user1Total = projectExpenses
      .filter(e => e.user_id === user1.id)
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    
    const user2Total = projectExpenses
      .filter(e => e.user_id === user2.id)
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    
    const halfTotal = total / 2;
    const difference = Math.abs(user1Total - user2Total) / 2;
    
    const debtor = user1Total < user2Total ? user1.name : user2.name;
    const creditor = user1Total < user2Total ? user2.name : user1.name;
    
    return {
      debtor,
      creditor,
      amount: formatCurrency(difference),
      user1Name: user1.name,
      user2Name: user2.name,
      user1Total: formatCurrency(user1Total),
      user2Total: formatCurrency(user2Total),
      total: formatCurrency(total)
    };
  };

  const handleCloseProject = () => {
    setShowSettlement(true);
  };

  const handleConfirmSettlement = async () => {
    const success = await closeProject(currentProject.id);
    if (success) {
      setShowSettlement(false);
    }
  };

  const settlement = calculateSettlement();
  const isProjectClosed = currentProject.closed_at !== null;

  return (
    <div className="dashboard">
      {/* Sticky compact header */}
      <div className={`sticky-header ${isScrolled ? 'visible' : ''}`}>
        <div className="sticky-header-content">
          <div className="sticky-project-info">
            <span className="sticky-project-name">{currentProject.name}</span>
            {isProjectClosed && <span className="sticky-status-badge">Cerrado</span>}
          </div>
          <div className="sticky-total">{formatCurrency(total)}</div>
        </div>
      </div>

      <div className={`filter-controls ${isScrolled ? 'hidden' : ''}`}>
        <button 
          className={`filter-btn ${filterUserId === 'all' ? 'active' : ''}`}
          onClick={() => setFilterUserId('all')}
        >
          Todos
        </button>
        {users.map(user => (
          <button
            key={user.id}
            className={`filter-btn ${filterUserId === user.id ? 'active' : ''}`}
            onClick={() => setFilterUserId(user.id)}
          >
            {user.name}
          </button>
        ))}
      </div>

      <div className="total-card">
        <span className="project-badge">{currentProject.name}</span>
        {isProjectClosed && (
          <span className="project-status-badge closed">Cerrado</span>
        )}
        <h2>Total</h2>
        <div className="total-amount">{formatCurrency(total)}</div>
        
        <div className="user-totals">
          {users.length >= 2 && (() => {
            const user1 = users[0];
            const user2 = users[1];
            
            const user1Total = projectExpenses
              .filter(e => e.user_id === user1.id)
              .reduce((sum, e) => sum + parseFloat(e.amount), 0);
            
            const user2Total = projectExpenses
              .filter(e => e.user_id === user2.id)
              .reduce((sum, e) => sum + parseFloat(e.amount), 0);
            
            const user1Percentage = total > 0 ? (user1Total / total) * 100 : 50;
            const user2Percentage = total > 0 ? (user2Total / total) * 100 : 50;

            return (
              <>
                <div className="user-stat-side">
                  <span className="user-name">{user1.name}</span>
                  <span className="user-amount">{formatCurrency(user1Total)}</span>
                </div>
                
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar-left" 
                    style={{ width: `${user1Percentage}%` }}
                  ></div>
                  <div 
                    className="progress-bar-right" 
                    style={{ width: `${user2Percentage}%` }}
                  ></div>
                </div>
                
                <div className="user-stat-side">
                  <span className="user-name">{user2.name}</span>
                  <span className="user-amount">{formatCurrency(user2Total)}</span>
                </div>
              </>
            );
          })()}
        </div>

        {!isProjectClosed && total > 0 && (
          <button className="close-project-btn" onClick={handleCloseProject}>
            <DoorOpen size={18} />
            Cerrar Proyecto
          </button>
        )}
      </div>

      <div className="category-scroll">
        {Object.entries(byCategory).map(([cat, amount]) => {
          const category = categories.find(c => c.name === cat);
          const isSelected = filterCategoryId === category?.id;
          
          return (
            <div 
              key={cat} 
              className={`category-card ${isSelected ? 'selected' : ''}`}
              onClick={() => setFilterCategoryId(isSelected ? 'all' : category?.id)}
            >
              <span className="cat-name">{cat}</span>
              <span className="cat-amount">{formatCurrency(amount)}</span>
            </div>
          );
        })}
      </div>

      {settlement && (
        <SettlementModal
          isOpen={showSettlement}
          onClose={() => setShowSettlement(false)}
          settlement={settlement}
          onConfirm={handleConfirmSettlement}
        />
      )}
    </div>
  );
};
