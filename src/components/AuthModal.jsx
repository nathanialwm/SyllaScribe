import React from 'react';

export default function AuthModal({ mode, onClose, onSwitchMode }) {
  if (!mode) return null;

  const LoginForm = () => (
    <div>
      <h4 className="mb-4">Login to SyllaScribe</h4>
      <form>
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
        <button type="submit" className="btn btn-primary w-100 mb-3">Login</button>
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
      <form>
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
        <button type="submit" className="btn btn-success w-100 mb-3">Sign Up</button>
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
