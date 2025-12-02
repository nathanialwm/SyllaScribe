
import { useState, useEffect } from 'react'  
import axios from 'axios' 
import GradeTracker from "./components/GradeTracker";

function Home() {
  const [courses, setCourses] = useState([])
  const [sectionTitle, setSectionTitle] = useState('Add New Class');
   const [loading, setLoading] = useState(false) 
  const [error, setError] = useState(null)  
  function handleSignOut() {
    localStorage.removeItem('currentUser');
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
<div className="app-root">
       <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container-fluid px-3 px-md-4 px-lg-5">
        <a className="navbar-brand fw-bold fs-4" href="#" onClick={(e) => e.preventDefault()}>
          Welcome to SyllaScribe {localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')).name : ' '}
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
              className="btn btn-outline-light"
              onClick={() => handleSettings()}
            >
              Settings
            </button>
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
       <main className="container-fluid mt-4">
       <div className="row">
          {/* Left Section - Empty */}
          <div className="col-md-6">
            <div className="card shadow-sm border">
              <div className="card-header bg-light">
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
              <div className="card-header bg-light">
                <h5 className="mb-0">{sectionTitle}</h5>
              </div>
              <div className="card-body">
                {GradeTracker()}
              </div>
            </div>
          </div>
        </div>
      </main>
      
    </div>
  )
}

export default Home