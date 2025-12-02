import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
export default function AuthModal({ mode, onClose, onSwitchMode }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAgree, setTermsAgree] = useState(false);
  const [remeber, setRemeber] = useState(false);
  
  const handleSignUp = async (event, name, email, confirmPassword, password, termsAgree ) => {
     event.preventDefault(); 
    if(!termsAgree){
      event.preventDefault();
      alert("You must agree to the terms and conditions to sign up.");
      return;
    }
    if (password !== confirmPassword) {
      event.preventDefault();
      alert("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      event.preventDefault();
      alert("Password must be at least 6 characters long.");
      return;
    }
    if (!email.includes('@')) {
      event.preventDefault();
      alert("Please enter a valid email address.");
      return;
    }
    if (!name.includes(' ')) {
      event.preventDefault();
      alert("Please enter your full name.");
      return;
    }
    // Proceed with form submission (e.g., send data to server)
    try {
      const response = await axios.post('http://localhost:5000/createUser', {name, email, password})
      if (response.data.success) {
        alert("Sign up successful!");
        onClose();
        localStorage.setItem('currentUser', JSON.stringify(response.data.user));
        window.location.reload(); 
      } else {
        alert(response.data.message || "Sign up failed");
      }
    } catch (error) {
      alert(error);
    }
  };
  const handleLogin = async (event, email, password, remeber) => {
    event.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/getUser', { email, password})
      if (response.data.success) {
        alert("Sign in successful!");
        onClose();
        localStorage.setItem('currentUser', JSON.stringify(response.data.user));
        window.location.reload(); 
      } else {
        alert(response.data.message || "Sign in failed");
      }
    } catch (error) {
      alert(error);
    }
  };
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="loginPassword" className="form-label">Password</label>
          <input 
            type="password" 
            className="form-control" 
            id="loginPassword" 
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="mb-3 form-check">
          <input type="checkbox" className="form-check-input" id="rememberMe"checked={remeber}
            onChange={(e) => setRemeber(e.target.checked)} />
          <label className="form-check-label" htmlFor="rememberMe"
          >
            Remember me
          </label>
        </div>
        <button type="submit" className="btn btn-primary w-100 mb-3"
        onClick={(event)  => handleLogin(event, email, password, remeber)}>Login</button>
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
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="signupEmail" className="form-label">Email address</label>
          <input 
            type="email" 
            className="form-control" 
            id="signupEmail" 
            placeholder="Enter your email"
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="signupPassword" className="form-label">Password</label>
          <input 
            type="password" 
            className="form-control" 
            id="signupPassword" 
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
          <input 
            type="password" 
            className="form-control" 
            id="confirmPassword" 
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <div className="mb-3 form-check">
          <input type="checkbox" className="form-check-input" id="agreeTerms"
           checked={termsAgree}
            onChange={(e) => setTermsAgree(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="agreeTerms">
            I agree to the Terms and Conditions
          </label>
        </div>
        <button type="submit" className="btn btn-success w-100 mb-3"
          onClick={(event) => handleSignUp(event, name, email, confirmPassword, password, termsAgree)}
          >Sign Up</button>
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