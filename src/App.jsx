import { useState } from 'react'
import './App.css'
import Navbar from './components/Navbar'
import AuthModal from './components/AuthModal'
import GradeTracker from "./components/GradeTracker";

function App() {
  const [authMode, setAuthMode] = useState(null) // 'login' | 'signup' | null

  function openAuth(mode) {
    setAuthMode(mode)
  }

  function closeAuth() {
    setAuthMode(null)
  }

  function switchAuthMode(mode) {
    setAuthMode(mode)
  }

  return (
<div className="app-root">
      <Navbar onShowAuth={openAuth} />
      <main className="container mt-5">
        <GradeTracker /> {/* gradetracker for signed out users */}
      </main>
      <AuthModal 
        mode={authMode} 
        onClose={closeAuth} 
        onSwitchMode={switchAuthMode}
      />
    </div>
  )
}

export default App