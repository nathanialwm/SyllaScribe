import React from 'react';

export default function Navbar({ onShowAuth }) {
  return (
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
              className="btn btn-outline-light"
              onClick={() => onShowAuth('login')}
            >
              Login
            </button>
            <button 
              className="btn btn-light"
              onClick={() => onShowAuth('signup')}
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}