import { useState } from 'react'

import Navbar from './components/Navbar'
import AuthModal from './components/AuthModal'
import GradeTracker from "./components/GradeTracker";

function Home() {
  const [authMode, setAuthMode] = useState(null) // 'login' | 'signup' | null
  function handleSignOut() {
    localStorage.removeItem('currentUser');
    window.location.reload();
  }
 

  return (
<div className="app-root">
       <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container-fluid px-3 px-md-4 px-lg-5">
        <a className="navbar-brand fw-bold fs-4" href="#" onClick={(e) => e.preventDefault()}>
          SyllaScribe
        </a>
        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav" 
          aria-controls="navbarNav" 
          aria-expanded="false" 
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse justify-content-end" id="navbarNav">
          <div className="d-flex gap-2">
           
            <button 
              className="btn btn-light"
              onClick={() =>handleSignOut()}
            >
              logout?
            </button>
          </div>
        </div>
      </div>
    </nav>
      <main className="container mt-5">
       
      </main>
      
    </div>
  )
}

export default Home