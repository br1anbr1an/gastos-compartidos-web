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
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  const isAuthenticated = !!token && !!currentUser;

  // --- Auth Actions ---
  const login = async (email, password) => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const res = await fetch(`${API_URL}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });

      if (!res.ok) throw new Error('Credenciales inválidas');
      
      const data = await res.json();
      setToken(data.access_token);
      localStorage.setItem('token', data.access_token);
      return true;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const register = async (name, email, password) => {
    try {
      const res = await fetch(`${API_URL}/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      if (!res.ok) throw new Error('Error al registrar o el email ya existe');
      
      // Auto login after register
      await login(email, password);
      return true;
    } catch (error) {
      console.error("Register error:", error);
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setCurrentUser(null);
    setProjects([]);
    setExpenses([]);
    localStorage.removeItem('token');
  };

  // Helper for authenticated fetch
  const authFetch = async (url, options = {}) => {
    const headers = { ...options.headers };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  };

  // --- Initial Data Fetch ---
  useEffect(() => {
    const initData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 1. Fetch current user
        const userRes = await authFetch(`${API_URL}/users/me`);
        if (!userRes.ok) {
           if (userRes.status === 401) {
             logout();
           }
           throw new Error('No autorizado');
        }
        const userData = await userRes.json();
        setCurrentUser(userData);

        // Fetch all users for lists
        const allUsersRes = await authFetch(`${API_URL}/users/`);
        if (allUsersRes.ok) {
           setUsers(await allUsersRes.json());
        } else {
           setUsers([userData]); // Fallback
        }

        // 2. Fetch Projects
        const projectsRes = await authFetch(`${API_URL}/projects/`);
        const projectsData = await projectsRes.json();
        setProjects(projectsData);

        const categoriesRes = await authFetch(`${API_URL}/categories/`);
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);

        // 3. Set Active Project (Default to first or stored)
        let active = null;
        if (projectsData.length === 0) {
            // Create default project if none
            const createPRes = await authFetch(`${API_URL}/projects/`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ name: 'Gastos Generales', status: 'in_progress', user_id: userData.id })
            });
            active = await createPRes.json();
            setProjects([active]);
        } else {
            const savedId = parseInt(localStorage.getItem('activeProjectId'));
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
  }, [token]);

  // --- Fetch Expenses when Project Changes ---
  useEffect(() => {
    if (!currentProject || !token) return;
    
    // Persist active selection
    localStorage.setItem('activeProjectId', currentProject.id);

    const fetchExpenses = async () => {
        try {
            const res = await authFetch(`${API_URL}/expenses/?project_id=${currentProject.id}`);
            if (res.ok) {
                const data = await res.json();
                setExpenses(data);
            }
        } catch (error) {
            console.error("Error fetching expenses:", error);
        }
    };
    fetchExpenses();
  }, [currentProject, token]);


  // --- Actions ---

  const addProject = async (name, isPrivate = false) => {
    try {
        const res = await authFetch(`${API_URL}/projects/`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
              name, 
              status: 'in_progress',
              is_private: isPrivate,
              user_id: currentUser?.id
            })
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
    if (!isAuthenticated || !currentProject) return;

    const payload = {
        ...expenseData,
        project_id: currentProject.id,
        user_id: currentUser.id // backend actually overwrites this, but passing for sanity
    };

    try {
        const res = await authFetch(`${API_URL}/expenses/`, {
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
      const res = await authFetch(`${API_URL}/expenses/${id}`, {
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
      const res = await authFetch(`${API_URL}/projects/${projectId}/close`, {
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

  const addReaction = async (expenseId, emoji) => {
    if (!isAuthenticated) return;
    try {
      const res = await authFetch(`${API_URL}/expenses/${expenseId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      });
      if (res.ok) {
        const updatedReaction = await res.json();
        // Update expenses locally
        setExpenses(prev => prev.map(exp => {
          if (exp.id === expenseId) {
            let newReactions = [...(exp.reactions || [])];
            if (updatedReaction === null) {
              // Toggle off
              newReactions = newReactions.filter(r => r.user_id !== currentUser.id);
            } else {
              const existingIdx = newReactions.findIndex(r => r.user_id === currentUser.id);
              if (existingIdx > -1) {
                newReactions[existingIdx] = updatedReaction;
              } else {
                newReactions.push(updatedReaction);
              }
            }
            return { ...exp, reactions: newReactions };
          }
          return exp;
        }));
      }
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  };

  const removeReaction = async (expenseId) => {
    if (!isAuthenticated) return;
    try {
      const res = await authFetch(`${API_URL}/expenses/${expenseId}/reactions`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setExpenses(prev => prev.map(exp => {
          if (exp.id === expenseId) {
            const newReactions = (exp.reactions || []).filter(r => r.user_id !== currentUser.id);
            return { ...exp, reactions: newReactions };
          }
          return exp;
        }));
      }
    } catch (error) {
      console.error("Error removing reaction:", error);
    }
  };

  // --- Selectors ---

  const getExpensesByCurrentProject = () => {
    let filtered = expenses;
    
    // Filter by user
    if (filterUserId !== 'all') {
      filtered = filtered.filter(expense => parseInt(expense.user_id) === parseInt(filterUserId));
    }
    
    // Filter by category
    if (filterCategoryId !== 'all') {
      filtered = filtered.filter(expense => parseInt(expense.category_id) === parseInt(filterCategoryId));
    }
    
    return filtered;
  };

  const getExpensesByCategory = () => {
    const filteredExpenses = filterUserId === 'all' 
      ? expenses 
      : expenses.filter(expense => parseInt(expense.user_id) === parseInt(filterUserId));
    
    return filteredExpenses.reduce((acc, expense) => {
      const catId = expense.category_id || 'null';
      acc[catId] = (acc[catId] || 0) + parseFloat(expense.amount);
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
        isAuthenticated,
        token,
        filterUserId,
        setFilterUserId,
        filterCategoryId,
        setFilterCategoryId,
        login,
        logout,
        register,
        addProject,
        switchProject,
        addExpense,
        removeExpense,
        closeProject,
        addReaction,
        removeReaction,
        getExpensesByCurrentProject,
        getExpensesByCategory,
        formatCurrency,
        formatDate,
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
};

