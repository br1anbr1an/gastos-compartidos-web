import { useState } from 'react'
import { ExpenseProvider, useExpenses } from './context/ExpenseContext'
import { Dashboard } from './components/Dashboard'
import { ExpenseList } from './components/ExpenseList'
import { ExpenseForm } from './components/ExpenseForm'
import { ProjectList } from './components/ProjectList'
import { Modal } from './components/UI/Modal'
import { Auth } from './components/Auth/Auth'
import { Plus, LayoutDashboard, FolderOpen, LogOut } from 'lucide-react'
import './App.css'

function MainLayout() {
  const { isAuthenticated, loading, logout } = useExpenses();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');

  if (loading) {
    return <div className="loading-screen">Cargando...</div>;
  }

  if (!isAuthenticated) {
    return <Auth />;
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>{currentView === 'dashboard' ? 'Gastos Compartidos' : 'Mis Proyectos'}</h1>
        <button onClick={logout} className="header-icon-btn" aria-label="Cerrar Sesión">
          <LogOut size={24} />
        </button>
      </header>
      
      <main className="app-content">
        {currentView === 'dashboard' ? (
          <>
            <Dashboard />
            <ExpenseList />
          </>
        ) : (
          <ProjectList />
        )}
      </main>

      {currentView === 'dashboard' && (
        <button 
          className="fab" 
          onClick={() => setIsModalOpen(true)}
          aria-label="Agregar Gasto"
        >
          <Plus size={32} />
        </button>
      )}

      <nav className="bottom-nav">
        <button 
          className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentView('dashboard')}
        >
          <LayoutDashboard size={24} />
          <span>Gastos</span>
        </button>
        <button 
          className={`nav-item ${currentView === 'projects' ? 'active' : ''}`}
          onClick={() => setCurrentView('projects')}
        >
          <FolderOpen size={24} />
          <span>Proyectos</span>
        </button>
      </nav>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Nuevo Gasto"
      >
        <ExpenseForm onClose={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
}

function App() {
  return (
    <ExpenseProvider>
      <MainLayout />
    </ExpenseProvider>
  )
}

export default App
