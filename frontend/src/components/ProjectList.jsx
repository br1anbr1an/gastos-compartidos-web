import { useState, useEffect } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { Plus, Check, Folder, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import './ProjectList.css';

const API_URL = 'http://localhost:8000';

export const ProjectList = () => {
  const { projects, currentProject, switchProject, addProject, users, formatCurrency, categories } = useExpenses();
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [projectExpenses, setProjectExpenses] = useState({});

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
    
    const user1Total = expenses
      .filter(e => e.user_id === user1.id)
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    
    const user2Total = expenses
      .filter(e => e.user_id === user2.id)
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    
    const difference = Math.abs(user1Total - user2Total) / 2;
    
    if (difference === 0) return null;
    
    const debtor = user1Total < user2Total ? user1.name : user2.name;
    const creditor = user1Total < user2Total ? user2.name : user1.name;
    
    return {
      debtor,
      creditor,
      amount: difference
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
    addProject(newProjectName);
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
        <form className="new-project-form" onSubmit={handleCreate}>
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Nombre del proyecto..."
            autoFocus
          />
          <button type="submit" disabled={!newProjectName.trim()}>
            Crear
          </button>
          <button type="button" onClick={() => setIsCreating(false)}>
            Cancelar
          </button>
        </form>
      )}

      <div className="projects-grid">
        {projects.map((project) => {
          const total = calculateProjectTotal(project.id);
          const settlement = project.closed_at ? calculateSettlement(project.id) : null;
          
          return (
            <div 
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
                    <span className={`status-badge ${project.status}`}>
                      {project.status === 'in_progress' ? 'En Progreso' : 'Pagado'}
                    </span>
                  </div>
                  {settlement && (
                    <div className="project-settlement">
                      {settlement.debtor} pagó {formatCurrency(settlement.amount)} a {settlement.creditor}
                    </div>
                  )}
                </div>
              </div>
              <div className="project-total">
                {formatCurrency(total)}
              </div>
              <button 
                className="export-btn"
                onClick={(e) => exportToExcel(project, e)}
                title="Exportar a Excel"
              >
                <FileDown size={18} />
              </button>
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
