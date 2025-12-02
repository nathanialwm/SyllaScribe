import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { testAPIConnection } from '../utils/testConnection.js';

export default function AuthModal({ mode, onClose, onSwitchMode }) {
  const { login, register, loading } = useAuth();
  const [formError, setFormError] = useState(null);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    if (!mode) return;
    
    // Test API connection when modal opens
    testAPIConnection().then(result => {
      if (!result.connected) {
        setConnectionError('Cannot connect to server. Please ensure the backend is running on http://localhost:5000');
      } else {
        setConnectionError(null);
      }
    });
  }, [mode]);

  if (!mode) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setFormError(null);
    try {
      const email = e.target.loginEmail.value.trim();
      const password = e.target.loginPassword.value;

      if (!email || !password) {
        setFormError('Please fill in all fields');
        return;
      }

      console.log('AuthModal: Attempting login');
      const result = await login(email, password);
      console.log('AuthModal: Login result:', result);
      
      if (!result.success) {
        setFormError(result.error || 'Login failed. Please try again.');
      } else {
        console.log('AuthModal: Login successful, closing modal');
        onClose();
        // Refresh to update UI
        setTimeout(() => window.location.reload(), 100);
      }
    } catch (error) {
      console.error('AuthModal: Login exception:', error);
      setFormError(error.message || 'An unexpected error occurred');
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setFormError(null);
    try {
      const name = e.target.signupName.value.trim();
      const email = e.target.signupEmail.value.trim();
      const password = e.target.signupPassword.value;
      const confirm = e.target.confirmPassword.value;

      if (!name || !email || !password || !confirm) {
        setFormError('Please fill in all fields');
        return;
      }

      if (password !== confirm) {
        setFormError('Passwords do not match');
        return;
      }

      if (password.length < 6) {
        setFormError('Password must be at least 6 characters');
        return;
      }

      console.log('AuthModal: Attempting registration');
      const result = await register(name, email, password);
      console.log('AuthModal: Registration result:', result);
      
      if (!result.success) {
        setFormError(result.error || 'Registration failed. Please try again.');
      } else {
        console.log('AuthModal: Registration successful, closing modal');
        onClose();
        // Refresh to update UI
        setTimeout(() => window.location.reload(), 100);
      }
    } catch (error) {
      console.error('AuthModal: Registration exception:', error);
      setFormError(error.message || 'An unexpected error occurred');
    }
  };

  const LoginForm = () => (
    <div>
      <h4 className="mb-4">Login to SyllaScribe</h4>
      {connectionError && (
        <div className="alert alert-warning" role="alert">
          {connectionError}
        </div>
      )}
      {formError && (
        <div className="alert alert-danger" role="alert">
          {formError}
        </div>
      )}
      <form onSubmit={handleLogin}>
        <div className="mb-3">
          <label htmlFor="loginEmail" className="form-label">Email address</label>
          <input 
            type="email" 
            className="form-control" 
            id="loginEmail" 
            placeholder="Enter your email"
          />
        </div>
        <div className="mb-3">
          <label htmlFor="loginPassword" className="form-label">Password</label>
          <input 
            type="password" 
            className="form-control" 
            id="loginPassword" 
            placeholder="Enter your password"
          />
        </div>
        <div className="mb-3 form-check">
          <input type="checkbox" className="form-check-input" id="rememberMe" />
          <label className="form-check-label" htmlFor="rememberMe">
            Remember me
          </label>
        </div>
        <button type="submit" className="btn btn-primary w-100 mb-3" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
        <div className="text-center">
          <p className="mb-0">Don't have an account?</p>
          <button 
            type="button" 
            className="btn btn-link p-0"
            onClick={() => onSwitchMode('signup')}
          >
            Sign up here
          </button>
        </div>
      </form>
    </div>
  );

  const SignupForm = () => (
    <div>
      <h4 className="mb-4">Sign Up for SyllaScribe</h4>
      {connectionError && (
        <div className="alert alert-warning" role="alert">
          {connectionError}
        </div>
      )}
      {formError && (
        <div className="alert alert-danger" role="alert">
          {formError}
        </div>
      )}
      <form onSubmit={handleSignup}>
        <div className="mb-3">
          <label htmlFor="signupName" className="form-label">Full Name</label>
          <input 
            type="text" 
            className="form-control" 
            id="signupName" 
            placeholder="Enter your full name"
          />
        </div>
        <div className="mb-3">
          <label htmlFor="signupEmail" className="form-label">Email address</label>
          <input 
            type="email" 
            className="form-control" 
            id="signupEmail" 
            placeholder="Enter your email"
          />
        </div>
        <div className="mb-3">
          <label htmlFor="signupPassword" className="form-label">Password</label>
          <input 
            type="password" 
            className="form-control" 
            id="signupPassword" 
            placeholder="Create a password"
          />
        </div>
        <div className="mb-3">
          <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
          <input 
            type="password" 
            className="form-control" 
            id="confirmPassword" 
            placeholder="Confirm your password"
          />
        </div>
        <div className="mb-3 form-check">
          <input type="checkbox" className="form-check-input" id="agreeTerms" />
          <label className="form-check-label" htmlFor="agreeTerms">
            I agree to the Terms and Conditions
          </label>
        </div>
        <button type="submit" className="btn btn-success w-100 mb-3" disabled={loading}>
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
        <div className="text-center">
          <p className="mb-0">Already have an account?</p>
          <button 
            type="button" 
            className="btn btn-link p-0"
            onClick={() => onSwitchMode('login')}
          >
            Login here
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <>
      <div 
        className={`modal fade ${mode ? 'show' : ''}`} 
        style={{ display: mode ? 'block' : 'none' }}
        tabIndex="-1"
        onClick={onClose}
      >
        <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <button 
                type="button" 
                className="btn-close" 
                onClick={onClose}
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              {mode === 'login' ? <LoginForm /> : <SignupForm />}
            </div>
          </div>
        </div>
      </div>
      {mode && <div className="modal-backdrop fade show"></div>}
    </>
  );
}