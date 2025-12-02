import { useState, useCallback } from 'react'
import './App.css'
import Navbar from './components/Navbar'
import AuthModal from './components/AuthModal'
import GradeTracker from "./components/GradeTracker";
import ClassesDashboard from './components/ClassesDashboard';
import { useAuth } from './context/AuthContext';

function App() {
  const { user } = useAuth();
  const [authMode, setAuthMode] = useState(null) // 'login' | 'signup' | null
  const [showGradeTracker, setShowGradeTracker] = useState(false);

  const openAuth = useCallback((mode) => {
    setAuthMode(mode)
  }, []);

  const closeAuth = useCallback(() => {
    setAuthMode(null)
  }, []);

  const switchAuthMode = useCallback((mode) => {
    setAuthMode(mode)
  }, []);

  return (
    <div className="app-root">
      <Navbar onShowAuth={openAuth} />
      <main className="container mt-5">
        {user ? (
          showGradeTracker ? (
            <div>
              <button className="btn btn-outline-secondary mb-3" onClick={() => setShowGradeTracker(false)}>
                Back to Dashboard
              </button>
              <GradeTracker onSave={() => setShowGradeTracker(false)} />
            </div>
          ) : (
            <ClassesDashboard onAddClass={() => setShowGradeTracker(true)} />
          )
        ) : (
          <GradeTracker />
        )}
      </main>
      {authMode && (
        <AuthModal 
          mode={authMode} 
          onClose={closeAuth} 
          onSwitchMode={switchAuthMode}
        />
      )}
    </div>
  )
}

export default App