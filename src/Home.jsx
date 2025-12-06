
import { useState, useEffect } from 'react'  
import axios from 'axios' 
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './components/ThemeContext';
import GradeTracker from "./components/GradeTracker";

function Home() {
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([])
  const [sectionTitle, setSectionTitle] = useState('Add New Class');
   const [loading, setLoading] = useState(false) 
  const [error, setError] = useState(null)  
   useEffect(() => {
    const getUser = () => {
      try {
        // Try sessionStorage first, then localStorage
        const sessionUser = sessionStorage.getItem('currentUser');
        const localUser = localStorage.getItem('currentUser');
        
        let userData = null;
        if (sessionUser) {
          userData = JSON.parse(sessionUser);
        } else if (localUser) {
          userData = JSON.parse(localUser);
        }
        
        setUser(userData);
      } catch (error) {
        console.error('Error parsing user data:', error);
        // Clear invalid data
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentUser');
      }
    };
    
    getUser();
  }, []);
  function handleSignOut() {
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');
    window.location.reload();
  }
  function handleSettings() {
    alert("Settings feature coming soon!");
  }
 
   useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true)
        const response = await axios.get('http://localhost:5000/getCourses')
        setCourses(response.data)
        setError(null)
      } catch (err) {
        setError('Failed to load courses')
        console.error('Error fetching courses:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchCourses()
  }, [])
  return (
    <>
      <style>{`
        .navbar .navbar-brand {
          color: ${theme === 'light' ? '#ffffff' : '#000000'} !important;
        }
        .navbar #settings-btn,
        .navbar #logout-btn,
        .navbar #theme-toggle-btn {
          color: ${theme === 'light' ? '#ffffff' : '#000000'} !important;
        }
        .navbar #theme-toggle-btn svg {
          color: ${theme === 'light' ? '#ffffff' : '#000000'} !important;
          stroke: ${theme === 'light' ? '#ffffff' : '#000000'} !important;
        }
        #classes-header.bg-light,
        #add-class-header.bg-light {
          background-color: ${theme === 'light' ? '#f8f9fa' : '#212529'} !important;
        }
        #classes-header h5,
        #add-class-header h5 {
          color: ${theme === 'light' ? '#000000' : '#ffffff'} !important;
        }
      `}</style>
      <div className="app-root">
       <nav className="navbar navbar-expand-lg" style={{ backgroundColor: 'var(--primary)' }}>
      <div className="container-fluid px-3 px-md-4 px-lg-5">
        <a className="navbar-brand fw-bold fs-4" href="#" onClick={(e) => e.preventDefault()}>
            Welcome to SyllaScribe {user && user.name ? user.name : 'Guest'}!
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
          <div className="d-flex gap-2 align-items-center">
           <button 
              id="settings-btn"
              className="btn btn-outline-light"
              onClick={() => handleSettings()}
            >
              Settings
            </button>
            <button 
              id="logout-btn"
              className="btn btn-outline-light"
              onClick={() =>handleSignOut()}
            >
              Logout
            </button>
            <button
              id="theme-toggle-btn"
              type="button"
              className="btn btn-outline-light d-flex align-items-center gap-1"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              aria-pressed={theme === 'dark'}
              onClick={(e) => { console.debug('[Home] toggle clicked', theme); toggleTheme(); }}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </div>
    </nav>
       <main className="container-fluid mt-4">
       <div className="row">
          {/* Left Section - Empty */}
          <div className="col-md-6">
            <div className="card shadow-sm border">
              <div id="classes-header" className="card-header" style={{ backgroundColor: theme === 'light' ? '#f8f9fa' : '#212529' }}>
                 <h5 className="mb-0">Classes ({courses.length})</h5>
                {loading && (
                  <div className="spinner-border spinner-border-sm text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                )}
              
              </div>
              <div className="card-body">
                {/* Empty - Add content later */}
              </div>
            </div>
          </div>
          
          {/* Right Section - Empty */}
          <div className="col-md-6">
            <div className="card shadow-sm border">
              <div id="add-class-header" className="card-header" style={{ backgroundColor: theme === 'light' ? '#f8f9fa' : '#212529' }}>
                <h5 className="mb-0">{sectionTitle}</h5>
              </div>
              <div className="card-body">
                <GradeTracker />
              </div>
            </div>
          </div>
        </div>
      </main>
      
    </div>
    </>
  )
}

export default Home