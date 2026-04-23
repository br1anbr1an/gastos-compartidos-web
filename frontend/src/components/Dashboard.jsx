import { useExpenses } from '../context/ExpenseContext';
import { SettlementModal } from './SettlementModal';
import { DoorOpen, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
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
    closeProject,
    isSyncing
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

  const scrollRef = useRef(null);

  const scrollCarousel = (direction) => {
    const container = scrollRef.current;
    if (!container) return;
    // Scroll by 3 card widths (card ~130px + gap ~8px = ~138px each)
    const scrollAmount = 138 * 3;
    container.scrollBy({ left: direction === 'right' ? scrollAmount : -scrollAmount, behavior: 'smooth' });
  };

  const calculateSettlement = () => {
    if (users.length < 2) return null;
    
    const user1 = users[0];
    const user2 = users[1];
    
    // Separate regular and loan expenses
    const regularExpenses = projectExpenses.filter(e => !e.is_loan);
    const loanExpenses = projectExpenses.filter(e => e.is_loan);
    
    // 1. Calculate Shared Base Debt
    const user1Shared = regularExpenses
      .filter(e => e.user_id === user1.id)
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
      
    const user2Shared = regularExpenses
      .filter(e => e.user_id === user2.id)
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
      
    const sharedDebtFromUser2ToUser1 = (user1Shared - user2Shared) / 2;
    
    // 2. Add Direct Debt from Loans
    const user1Loans = loanExpenses
      .filter(e => e.user_id === user1.id)
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
      
    const user2Loans = loanExpenses
      .filter(e => e.user_id === user2.id)
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
      
    const loanDebtFromUser2ToUser1 = user1Loans - user2Loans;
    
    // Total Debt from User 2 to User 1
    const totalDebtToUser1 = sharedDebtFromUser2ToUser1 + loanDebtFromUser2ToUser1;
    
    // Note: total expense amount includes both for reference
    const user1Total = user1Shared + user1Loans;
    const user2Total = user2Shared + user2Loans;
    
    const amount = Math.abs(totalDebtToUser1);
    const debtor = totalDebtToUser1 > 0 ? user2.name : user1.name;
    const creditor = totalDebtToUser1 > 0 ? user1.name : user2.name;
    
    return {
      debtor,
      creditor,
      amount: formatCurrency(amount),
      user1Name: user1.name,
      user2Name: user2.name,
      user1Total: formatCurrency(user1Total),
      user2Total: formatCurrency(user2Total),
      total: formatCurrency(total)
    };
  };

  const handleCloseProject = () => {
    setFilterUserId('all');
    setFilterCategoryId('all');
    setShowSettlement(true);
  };

  const handleConfirmSettlement = async () => {
    const success = await closeProject(currentProject.id);
    if (success) {
      setShowSettlement(false);
    }
  };

  const settlement = calculateSettlement();
  const isProjectClosed = currentProject.status === 'paid';

  return (
    <div className="dashboard">
      {/* Sticky compact header */}
      <div className={`sticky-header ${isScrolled ? 'visible' : ''}`}>
        <div className="sticky-header-content">
          <div className="sticky-project-info">
            <span className="sticky-project-name">
              {currentProject.name}
              {isSyncing && <RefreshCw size={14} className="syncing-icon" style={{ marginLeft: '8px', animation: 'spin 1s linear infinite', color: 'var(--color-text-muted)' }} />}
            </span>
            {isProjectClosed && <span className="sticky-status-badge">Cerrado</span>}
          </div>
          <div className="sticky-total">{formatCurrency(total)}</div>
        </div>
      </div>

      <div className={`filter-controls ${isScrolled || currentProject.is_private ? 'hidden' : ''}`}>
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
            
            // Logic: Show if it's NOT private OR if current user is the owner
            if (currentProject.is_private) return null;
            return (
              <>
                <div className="user-stat-side">
                  <span className="user-name">{user1.name}</span>
                  <span className="user-amount">{formatCurrency(user1Total)}</span>
                </div>
                
                <div className="progress-section">
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
                  
                  {isProjectClosed && settlement && (
                    <div className="settlement-dashboard-legend">
                      {settlement.debtor} pagó {settlement.amount} a {settlement.creditor}
                    </div>
                  )}
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

      <div className="category-scroll-wrapper">
        {Object.keys(byCategory).length > 5 && (
          <button
            className="carousel-arrow carousel-arrow-left"
            onClick={() => scrollCarousel('left')}
            aria-label="Desplazar izquierda"
          >
            <ChevronLeft size={18} />
          </button>
        )}

        <div className="category-scroll" ref={scrollRef}>
          {Object.entries(byCategory)
            .sort(([, a], [, b]) => b - a)
            .map(([catIdStr, amount]) => {
            const categoryId = catIdStr === 'null' ? null : parseInt(catIdStr);
            const category = categories.find(c => c.id === categoryId);
            const isSelected = filterCategoryId === categoryId;
            const catName = category?.name || 'Sin categoría';
            
            return (
              <div 
                key={catIdStr} 
                className={`category-card ${isSelected ? 'selected' : ''}`}
                onClick={() => setFilterCategoryId(isSelected ? 'all' : categoryId)}
              >
                <span className="cat-name">{catName}</span>
                <span className="cat-amount">{formatCurrency(amount)}</span>
              </div>
            );
          })}
        </div>

        {Object.keys(byCategory).length > 5 && (
          <button
            className="carousel-arrow carousel-arrow-right"
            onClick={() => scrollCarousel('right')}
            aria-label="Desplazar derecha"
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      {settlement && (
        <SettlementModal
          isOpen={showSettlement}
          onClose={() => setShowSettlement(false)}
          settlement={settlement}
          onConfirm={handleConfirmSettlement}
          currentProject={currentProject}
        />
      )}
    </div>
  );
};
