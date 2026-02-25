import { createContext, useState, useEffect, useContext } from 'react';

const ExpenseContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const useExpenses = () => {
  return useContext(ExpenseContext);
};

export const ExpenseProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterUserId, setFilterUserId] = useState('all');
  const [filterCategoryId, setFilterCategoryId] = useState('all');
  const [categories, setCategories] = useState([]);

  // --- Initial Data Fetch ---
  useEffect(() => {
    const initData = async () => {
      try {
        // 1. Fetch/Create User "Yo"
        // In a real app this would be Auth. For now we auto-login "me@example.com"
        const usersRes = await fetch(`${API_URL}/users/`);
        const usersData = await usersRes.json();
        
        let me = usersData.find(u => u.email === 'me@example.com');
        if (!me) {
           const createRes = await fetch(`${API_URL}/users/`, {
             method: 'POST',
             headers: {'Content-Type': 'application/json'},
             body: JSON.stringify({ name: 'Yo', email: 'me@example.com' })
           });
           me = await createRes.json();
        }
        setCurrentUser(me);
        setUsers(usersData.length ? usersData : [me]); // Update users list

        // 2. Fetch Projects
        const projectsRes = await fetch(`${API_URL}/projects/`);
        const projectsData = await projectsRes.json();
        setProjects(projectsData);

        const categoriesRes = await fetch(`${API_URL}/categories/`);
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);

        // 3. Set Active Project (Default to first or stored)
        let active = null;
        if (projectsData.length === 0) {
            // Create default project if none
            const createPRes = await fetch(`${API_URL}/projects/`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ name: 'Gastos Generales', status: 'in_progress' })
            });
            active = await createPRes.json();
            setProjects([active]);
        } else {
            const savedId = localStorage.getItem('activeProjectId');
            active = projectsData.find(p => p.id === savedId) || projectsData[0];
        }
        setCurrentProject(active);

      } catch (error) {
        console.error("Failed to initialize data:", error);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  // --- Fetch Expenses when Project Changes ---
  useEffect(() => {
    if (!currentProject) return;
    
    // Persist active selection
    localStorage.setItem('activeProjectId', currentProject.id);

    const   fetchExpenses = async () => {
        try {
            const res = await fetch(`${API_URL}/expenses/?project_id=${currentProject.id}`);
            if (res.ok) {
                const data = await res.json();
                setExpenses(data);
            }
        } catch (error) {
            console.error("Error fetching expenses:", error);
        }
    };
    fetchExpenses();
  }, [currentProject]);


  // --- Actions ---

  const addProject = async (name) => {
    try {
        const res = await fetch(`${API_URL}/projects/`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name, status: 'in_progress' })
        });
        if (res.ok) {
            const newProject = await res.json();
            setProjects(prev => [...prev, newProject]);
            setCurrentProject(newProject);
        }
    } catch (error) {
        console.error("Error creating project:", error);
    }
  };

  const switchProject = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    if (project) setCurrentProject(project);
  };

  const addExpense = async (expenseData) => {
    if (!currentUser || !currentProject) return;

    const payload = {
        ...expenseData,
        project_id: currentProject.id,
        user_id: currentUser.id
    };

    try {
        const res = await fetch(`${API_URL}/expenses/`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        
        if (res.ok) {
            const newExpense = await res.json();
            setExpenses(prev => [newExpense, ...prev]);
        }
    } catch (error) {
        console.error("Error creating expense:", error);
    }
  };

  const removeExpense = async (id) => {
    try {
      const res = await fetch(`${API_URL}/expenses/${id}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setExpenses((prev) => prev.filter((expense) => expense.id !== id));
      } else {
        console.error("Failed to delete expense");
      }
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  };

  const closeProject = async (projectId) => {
    try {
      const res = await fetch(`${API_URL}/projects/${projectId}/close`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'}
      });
      
      if (res.ok) {
        const updatedProject = await res.json();
        setProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p));
        if (currentProject?.id === projectId) {
          setCurrentProject(updatedProject);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error closing project:", error);
      return false;
    }
  };

  // --- Selectors ---

  const getExpensesByCurrentProject = () => {
    let filtered = expenses;
    
    // Filter by user
    if (filterUserId !== 'all') {
      filtered = filtered.filter(expense => expense.user_id === filterUserId);
    }
    
    // Filter by category
    if (filterCategoryId !== 'all') {
      filtered = filtered.filter(expense => expense.category_id === filterCategoryId);
    }
    
    return filtered;
  };

  const getExpensesByCategory = () => {
    const filteredExpenses = filterUserId === 'all' 
      ? expenses 
      : expenses.filter(expense => expense.user_id === filterUserId);
    
    return filteredExpenses.reduce((acc, expense) => {
      const category = categories.find(c => c.id === expense.category_id);
      const categoryName = category?.name || 'Sin categoría';
      acc[categoryName] = (acc[categoryName] || 0) + parseFloat(expense.amount);
      return acc;
    }, {});
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <ExpenseContext.Provider
      value={{
        expenses,
        users,
        projects,
        categories,
        currentUser,
        currentProject,
        loading,
        filterUserId,
        setFilterUserId,
        filterCategoryId,
        setFilterCategoryId,
        addProject,
        switchProject,
        addExpense,
        removeExpense,
        closeProject,
        
        getExpensesByCurrentProject, // Keep API consistent
        getExpensesByCategory,
        formatCurrency,
        formatDate,
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
};
