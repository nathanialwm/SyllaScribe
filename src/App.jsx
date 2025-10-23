import { useState } from 'react'
import './App.css'
import Navbar from './components/Navbar'
import AuthModal from './components/AuthModal'

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
        <h2>Welcome to SyllaScribe</h2>
        <p>This is a placeholder main area. Use the Log in / Sign up buttons to open the forms.</p>
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
