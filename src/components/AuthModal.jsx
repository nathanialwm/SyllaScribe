import React, { useState, useEffect } from 'react';
import axios from 'axios';
export default function AuthModal({ mode, onClose, onSwitchMode }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAgree, setTermsAgree] = useState(false);
  const [remember, setRemember] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1 = request code, 2 = enter code and reset
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
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
        // Clear form fields
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setTermsAgree(false);
        // Switch to login mode with success message
        setSuccessMessage('Sign up successful, please log in');
        onSwitchMode('login');
      } else {
        alert(response.data.message || "Sign up failed");
      }
    } catch (error) {
      if (error.response?.status === 409) {
        alert("An account with this email already exists. Please log in instead.");
      } else if (error.response?.data?.message) {
        alert(error.response.data.message);
      } else {
        alert(error.message || "An error occurred during sign up");
      }
    }
  };
  const handleLogin = async (event, email, password, remember) => {
    event.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/getUser', { email, password})
      if (response.data.success) {
        // No alert - just proceed with login
        sessionStorage.setItem('currentUser', JSON.stringify(response.data.user));
        if (remember) {
        localStorage.setItem('currentUser', JSON.stringify(response.data.user));
      } else {
        // Clear localStorage if "Remember me" is NOT checked
        localStorage.removeItem('currentUser');
      }
        onClose();
        window.location.reload();
      } else {
        alert(response.data.message || "Sign in failed");
      }
    } catch (error) {
      if (error.response?.status === 401) {
        alert(error.response?.data?.message || "Invalid email or password");
      } else {
        alert(error.message || "An error occurred during login");
      }
    }
  };

  const handleRequestResetCode = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      alert("Please enter your email address");
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/requestPasswordReset', {
        email: resetEmail.trim()
      });
      if (response.data.success) {
        alert(response.data.message);
        setResetStep(2); // Move to step 2: enter code
      } else {
        alert(response.data.message || "Failed to request reset code");
      }
    } catch (error) {
      alert(error.response?.data?.message || error.message || "An error occurred while requesting reset code");
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetCode) {
      alert("Please enter the verification code");
      return;
    }
    if (!newPassword || !confirmNewPassword) {
      alert("Please enter and confirm your new password");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      alert("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters long");
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/resetPassword', {
        email: resetEmail.trim(),
        resetCode: resetCode.trim(),
        newPassword: newPassword.trim()
      });
      if (response.data.success) {
        alert("Password reset successfully! You can now log in with your new password.");
        setForgotPasswordMode(false);
        setResetStep(1);
        setResetEmail('');
        setResetCode('');
        setNewPassword('');
        setConfirmNewPassword('');
        onSwitchMode('login');
      } else {
        alert(response.data.message || "Failed to reset password");
      }
    } catch (error) {
      if (error.response?.status === 400) {
        alert(error.response?.data?.message || "Invalid or expired reset code");
      } else {
        alert(error.response?.data?.message || error.message || "An error occurred while resetting password");
      }
    }
  };
  // Reset forgot password mode when modal closes or mode changes
  useEffect(() => {
    if (!mode) {
      setForgotPasswordMode(false);
      setResetStep(1);
      setResetEmail('');
      setResetCode('');
      setNewPassword('');
      setConfirmNewPassword('');
    }
  }, [mode]);

  if (!mode) return null;

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
              {forgotPasswordMode ? (
                <div>
                  <h4 className="mb-4">Reset Password</h4>
                  {resetStep === 1 ? (
                    <form onSubmit={handleRequestResetCode}>
                      <div className="alert alert-info" role="alert">
                        Enter your email address to receive a verification code. The code will expire in 15 minutes.
                      </div>
                      <div className="mb-3">
                        <label htmlFor="resetEmail" className="form-label">Email address</label>
                        <input
                          type="email"
                          className="form-control"
                          id="resetEmail"
                          placeholder="Enter your email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          required
                        />
                      </div>
                      <button type="submit" className="btn btn-primary w-100 mb-3">
                        Send Verification Code
                      </button>
                      <div className="text-center">
                      <button
                        type="button"
                        className="btn btn-link p-0"
                        onClick={() => {
                          setForgotPasswordMode(false);
                          setResetStep(1);
                          setResetEmail('');
                          setResetCode('');
                          setNewPassword('');
                          setConfirmNewPassword('');
                        }}
                      >
                        Back to Login
                      </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleForgotPassword}>
                      <div className="alert alert-info" role="alert">
                        Check your email for the 6-digit verification code. (For development: check server console)
                      </div>
                      <div className="mb-3">
                        <label htmlFor="resetCode" className="form-label">Verification Code</label>
                        <input
                          type="text"
                          className="form-control"
                          id="resetCode"
                          placeholder="Enter 6-digit code"
                          value={resetCode}
                          onChange={(e) => setResetCode(e.target.value)}
                          maxLength="6"
                          pattern="[0-9]{6}"
                          required
                        />
                        <small className="form-text text-muted">Enter the 6-digit code sent to your email</small>
                      </div>
                      <div className="mb-3">
                        <label htmlFor="newPassword" className="form-label">New Password</label>
                        <input
                          type="password"
                          className="form-control"
                          id="newPassword"
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label htmlFor="confirmNewPassword" className="form-label">Confirm New Password</label>
                        <input
                          type="password"
                          className="form-control"
                          id="confirmNewPassword"
                          placeholder="Confirm new password"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          required
                        />
                      </div>
                      <button type="submit" className="btn btn-primary w-100 mb-3">
                        Reset Password
                      </button>
                      <div className="text-center">
                        <button
                          type="button"
                          className="btn btn-link p-0"
                          onClick={() => {
                            setResetStep(1);
                            setResetCode('');
                            setNewPassword('');
                            setConfirmNewPassword('');
                          }}
                        >
                          Request New Code
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : mode === 'login' ? (
                <div>
                  <h4 className="mb-4">Login to SyllaScribe</h4>
                  {successMessage && (
                    <div className="alert alert-success" role="alert">
                      {successMessage}
                    </div>
                  )}
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
                      <input type="checkbox" className="form-check-input" id="rememberMe"checked={remember}
                        onChange={(e) => setRemember(e.target.checked)} />
                      <label className="form-check-label" htmlFor="rememberMe">
                        Remember me
                      </label>
                    </div>
                    <button type="submit" className="btn btn-primary w-100 mb-3"
                    onClick={(event)  => handleLogin(event, email, password, remember)}>Login</button>
                    <div className="text-center mb-2">
                      <button
                        type="button"
                        className="btn btn-link p-0"
                        onClick={() => {
                          setForgotPasswordMode(true);
                          setResetStep(1);
                          setSuccessMessage('');
                        }}
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="text-center">
                      <p className="mb-0">Don't have an account?</p>
                      <button
                        type="button"
                        className="btn btn-link p-0"
                        onClick={() => {
                          setSuccessMessage('');
                          setForgotPasswordMode(false);
                          setResetStep(1);
                          onSwitchMode('signup');
                        }}
                      >
                        Sign up here
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
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
                        onClick={() => {
                          setSuccessMessage('');
                          setForgotPasswordMode(false);
                          setResetStep(1);
                          onSwitchMode('login');
                        }}
                      >
                        Login here
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {mode && <div className="modal-backdrop fade show"></div>}
    </>
  );
}