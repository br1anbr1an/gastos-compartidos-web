import { useState } from 'react'
import { ExpenseProvider } from './context/ExpenseContext'
import { Dashboard } from './components/Dashboard'
import { ExpenseList } from './components/ExpenseList'
import { ExpenseForm } from './components/ExpenseForm'
import { ProjectList } from './components/ProjectList'
import { Modal } from './components/UI/Modal'
import { Plus, LayoutDashboard, FolderOpen } from 'lucide-react'
import './App.css'

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'projects'

  return (
    <ExpenseProvider>
      <div className="app-container">
        <header className="app-header">
          <h1>{currentView === 'dashboard' ? 'Gastos Compartidos' : 'Mis Proyectos'}</h1>
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
    </ExpenseProvider>
  )
}

export default App
