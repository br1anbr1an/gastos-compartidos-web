import { useState, useEffect } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { Plus, Check, Folder, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import './ProjectList.css';

const API_URL = 'http://localhost:8000';

export const ProjectList = () => {
  const { projects, currentProject, switchProject, addProject, users, formatCurrency, categories, currentUser } = useExpenses();
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [projectExpenses, setProjectExpenses] = useState({});
  const [isPrivate, setIsPrivate] = useState(false);

  // Fetch expenses for all projects
  useEffect(() => {
    const fetchAllProjectExpenses = async () => {
      const expensesMap = {};

      for (const project of projects) {
        try {
          const res = await fetch(`${API_URL}/expenses/?project_id=${project.id}`);
          if (res.ok) {
            const data = await res.json();
            expensesMap[project.id] = data;
          }
        } catch (error) {
          console.error(`Error fetching expenses for project ${project.id}:`, error);
        }
      }

      setProjectExpenses(expensesMap);
    };

    if (projects.length > 0) {
      fetchAllProjectExpenses();
    }
  }, [projects]);

  const calculateProjectTotal = (projectId) => {
    const expenses = projectExpenses[projectId] || [];
    return expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
  };

  const calculateSettlement = (projectId) => {
    const expenses = projectExpenses[projectId] || [];
    if (expenses.length === 0 || users.length < 2) return null;

    const user1 = users[0];
    const user2 = users[1];

    // Separate regular and loan expenses
    const regularExpenses = expenses.filter(e => !e.is_loan);
    const loanExpenses = expenses.filter(e => e.is_loan);

    // 1. Calculate Shared Base Debt
    const user1Shared = regularExpenses
      .filter(e => e.user_id === user1.id)
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);

    const user2Shared = regularExpenses
      .filter(e => e.user_id === user2.id)
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);

    // The person who paid less owes half the difference to the person who paid more
    // Positive means user2 owes user1, negative means user1 owes user2
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

    if (totalDebtToUser1 === 0) return null;

    const amount = Math.abs(totalDebtToUser1);
    const debtor = totalDebtToUser1 > 0 ? user2.name : user1.name;
    const creditor = totalDebtToUser1 > 0 ? user1.name : user2.name;

    return {
      debtor,
      creditor,
      amount
    };
  };

  const exportToExcel = (project, e) => {
    e.stopPropagation(); // Prevent switching project

    const expenses = projectExpenses[project.id] || [];
    if (expenses.length === 0) {
      alert('No hay gastos para exportar en este proyecto');
      return;
    }

    // Prepare expense data
    const expenseData = expenses.map(expense => {
      const category = categories.find(c => c.id === expense.category_id);
      const user = users.find(u => u.id === expense.user_id);
      return {
        'Descripción': expense.description,
        'Monto': parseFloat(expense.amount),
        'Fecha': new Date(expense.date).toLocaleDateString('es-MX'),
        'Categoría': category?.name || 'Sin categoría',
        'Usuario': user?.name || 'Anónimo'
      };
    });

    // Calculate user totals
    const settlement = calculateSettlement(project.id);
    const total = calculateProjectTotal(project.id);

    const user1 = users[0];
    const user2 = users[1];

    const user1Total = expenses
      .filter(e => e.user_id === user1?.id)
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);

    const user2Total = expenses
      .filter(e => e.user_id === user2?.id)
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);

    // Create summary data
    const summaryData = [
      { 'Resumen': 'Total del Proyecto', 'Valor': total },
      { 'Resumen': '', 'Valor': '' },
      { 'Resumen': `Total pagado por ${user1?.name}`, 'Valor': user1Total },
      { 'Resumen': `Total pagado por ${user2?.name}`, 'Valor': user2Total },
      { 'Resumen': '', 'Valor': '' },
    ];

    if (settlement) {
      summaryData.push({
        'Resumen': 'Liquidación',
        'Valor': `${settlement.debtor} debe pagar ${formatCurrency(settlement.amount)} a ${settlement.creditor}`
      });
    }

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Create worksheet with expenses
    const ws = XLSX.utils.json_to_sheet(expenseData);

    // Add summary to the right side (column G onwards)
    XLSX.utils.sheet_add_json(ws, summaryData, { origin: 'G1', skipHeader: false });

    // Set column widths
    ws['!cols'] = [
      { wch: 30 }, // Descripción
      { wch: 12 }, // Monto
      { wch: 12 }, // Fecha
      { wch: 15 }, // Categoría
      { wch: 15 }, // Usuario
      { wch: 2 },  // Spacing
      { wch: 25 }, // Resumen label
      { wch: 40 }  // Resumen value
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Gastos');

    // Generate filename
    const filename = `${project.name.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    addProject(newProjectName, isPrivate);
    setNewProjectName('');
    setIsCreating(false);
  };

  return (
    <div className="project-list-container">
      <div className="project-header">
        <h2>Mis Proyectos</h2>
        <button
          className="new-project-btn"
          onClick={() => setIsCreating(true)}
        >
          <Plus size={20} />
          <span>Nuevo</span>
        </button>
      </div>

      {isCreating && (
        <form className="prj-new-form" onSubmit={handleCreate}>
          <div className="prj-form-content">
            <div className="prj-input-row">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Nombre del nuevo proyecto..."
                autoFocus
                className="prj-name-input"
              />
              
              <div className="prj-toggle-wrapper">
                <span className="prj-toggle-label">{isPrivate ? 'Privado' : 'Público'}</span>
                <label className="prj-toggle-switch">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                  />
                  <span className="prj-slider prj-round"></span>
                </label>
              </div>
            </div>

            <div className="prj-form-actions">
              <button type="button" className="prj-cancel-btn" onClick={() => setIsCreating(false)}>
                Cancelar
              </button>
              <button type="submit" className="prj-submit-btn" disabled={!newProjectName.trim()}>
                Crear Proyecto
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="projects-grid">
        {projects.map((project) => {
          const total = calculateProjectTotal(project.id);
          const settlement = project.status === 'paid' ? calculateSettlement(project.id) : null;
          
          // Logic: Show if it's NOT private OR if current user is the owner
          const isOwner = currentUser && project.user_id === currentUser.id;
          const shouldShow = !project.is_private || isOwner;

          if (!shouldShow) return null;

          return (<div
              key={project.id}
              className={`project-card ${currentProject?.id === project.id ? 'active' : ''}`}
              onClick={() => switchProject(project.id)}
            >
              <div className="project-icon">
                <Folder size={24} />
              </div>
              <div className="project-info">
                <div className="project-header">
                  <div className="project-title-section">
                    <h3>{project.name}</h3>
                    <div className="expense-meta">
                      <span className={`status-badge ${project.is_private ? 'private' : 'public'}`}>
                      {project.is_private ? 'Privado' : 'Público'}
                      </span>
                      <span className={`status-badge ${project.status}`}>
                        {project.status === 'in_progress' ? 'En Progreso' : 'Cerrado'}
                      </span>
                    </div>
                  </div>
                  {!isOwner && !project.is_private && settlement && (
                    <div className="project-settlement">
                      {settlement.debtor} pagó {formatCurrency(settlement.amount)} a {settlement.creditor}
                    </div>
                  )}
                </div>
              </div>
              <div className="project-total">
                {formatCurrency(total)}
              </div>
              {/* <button 
                className="export-btn"
                onClick={(e) => exportToExcel(project, e)}
                title="Exportar a Excel"
              >
                <FileDown size={18} />
              </button> */}
              {currentProject?.id === project.id && (
                <div className="active-check">
                  <Check size={16} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
