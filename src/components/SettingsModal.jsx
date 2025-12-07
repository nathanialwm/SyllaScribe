import React, { useState } from 'react';
import axios from 'axios';
import { useTheme } from './ThemeContext';

export default function SettingsModal({ isOpen, onClose }) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('password'); // 'password', 'email', 'delete', 'font'
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem('fontSize') || 'medium';
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  if (!isOpen) return null;

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setMessage({ type: 'error', text: 'All fields are required' });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long' });
      return;
    }

    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser'));
      const response = await axios.post('http://localhost:5000/api/auth/changePassword', {
        email: currentUser.email,
        currentPassword,
        newPassword
      });

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Password changed successfully' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        setMessage({ type: 'error', text: response.data.message || 'Failed to change password' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error changing password' });
    }
  };

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!newEmail || !emailPassword) {
      setMessage({ type: 'error', text: 'All fields are required' });
      return;
    }

    if (!newEmail.includes('@')) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser'));
      const response = await axios.post('http://localhost:5000/api/auth/changeEmail', {
        currentEmail: currentUser.email,
        newEmail: newEmail.trim(),
        password: emailPassword.trim()
      });

      if (response.data.success) {
        // Update localStorage with new email
        const updatedUser = { ...currentUser, email: newEmail.trim() };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        setMessage({ type: 'success', text: 'Email changed successfully' });
        setNewEmail('');
        setEmailPassword('');
      } else {
        setMessage({ type: 'error', text: response.data.message || 'Failed to change email' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error changing email' });
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!deletePassword) {
      setMessage({ type: 'error', text: 'Please enter your password to confirm' });
      return;
    }

    const confirmDelete = window.confirm('Are you sure you want to delete your account? This action cannot be undone.');
    if (!confirmDelete) return;

    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser'));
      const response = await axios.post('http://localhost:5000/api/auth/deleteAccount', {
        email: currentUser.email,
        password: deletePassword
      });

      if (response.data.success) {
        localStorage.removeItem('currentUser');
        alert('Account deleted successfully');
        window.location.reload();
      } else {
        setMessage({ type: 'error', text: response.data.message || 'Failed to delete account' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error deleting account' });
    }
  };

  const handleFontSizeChange = (size) => {
    setFontSize(size);
    localStorage.setItem('fontSize', size);
    document.documentElement.style.fontSize = 
      size === 'small' ? '14px' : size === 'medium' ? '16px' : '18px';
    setMessage({ type: 'success', text: 'Font size updated' });
    setTimeout(() => setMessage({ type: '', text: '' }), 2000);
  };

  return (
    <>
      <div
        className={`modal fade ${isOpen ? 'show' : ''}`}
        style={{ display: isOpen ? 'block' : 'none' }}
        tabIndex="-1"
        onClick={onClose}
      >
        <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Settings</h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              <ul className="nav nav-tabs mb-3" role="tablist">
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === 'password' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('password');
                      setMessage({ type: '', text: '' });
                    }}
                  >
                    Change Password
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === 'email' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('email');
                      setMessage({ type: '', text: '' });
                    }}
                  >
                    Change Email
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === 'delete' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('delete');
                      setMessage({ type: '', text: '' });
                    }}
                  >
                    Delete Account
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === 'font' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('font');
                      setMessage({ type: '', text: '' });
                    }}
                  >
                    Font Size
                  </button>
                </li>
              </ul>

              {message.text && (
                <div className={`alert alert-${message.type === 'error' ? 'danger' : 'success'}`} role="alert">
                  {message.text}
                </div>
              )}

              {activeTab === 'password' && (
                <form onSubmit={handleChangePassword}>
                  <div className="mb-3">
                    <label htmlFor="currentPassword" className="form-label">Current Password</label>
                    <input
                      type="password"
                      className="form-control"
                      id="currentPassword"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="newPassword" className="form-label">New Password</label>
                    <input
                      type="password"
                      className="form-control"
                      id="newPassword"
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
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    Change Password
                  </button>
                </form>
              )}

              {activeTab === 'email' && (
                <form onSubmit={handleChangeEmail}>
                  <div className="mb-3">
                    <label htmlFor="currentEmail" className="form-label">Current Email</label>
                    <input
                      type="email"
                      className="form-control"
                      id="currentEmail"
                      value={JSON.parse(localStorage.getItem('currentUser'))?.email || ''}
                      disabled
                      style={{
                        backgroundColor: theme === 'dark' ? '#212529' : '#e9ecef',
                        color: theme === 'dark' ? '#ffffff' : '#000000',
                        cursor: 'not-allowed'
                      }}
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="newEmail" className="form-label">New Email</label>
                    <input
                      type="email"
                      className="form-control"
                      id="newEmail"
                      placeholder="Enter new email address"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="emailPassword" className="form-label">Confirm with Password</label>
                    <input
                      type="password"
                      className="form-control"
                      id="emailPassword"
                      placeholder="Enter your password"
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    Change Email
                  </button>
                </form>
              )}

              {activeTab === 'delete' && (
                <form onSubmit={handleDeleteAccount}>
                  <div className="alert alert-warning" role="alert">
                    <strong>Warning:</strong> Deleting your account will permanently remove all your data. This action cannot be undone.
                  </div>
                  <div className="mb-3">
                    <label htmlFor="deletePassword" className="form-label">Enter your password to confirm</label>
                    <input
                      type="password"
                      className="form-control"
                      id="deletePassword"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-danger">
                    Delete Account
                  </button>
                </form>
              )}

              {activeTab === 'font' && (
                <div>
                  <p className="mb-3">Choose your preferred font size:</p>
                  <div className="btn-group" role="group">
                    <button
                      type="button"
                      className={`btn ${fontSize === 'small' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => handleFontSizeChange('small')}
                    >
                      Small
                    </button>
                    <button
                      type="button"
                      className={`btn ${fontSize === 'medium' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => handleFontSizeChange('medium')}
                    >
                      Medium
                    </button>
                    <button
                      type="button"
                      className={`btn ${fontSize === 'large' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => handleFontSizeChange('large')}
                    >
                      Large
                    </button>
                  </div>
                  <div className="mt-3">
                    <p style={{ fontSize: fontSize === 'small' ? '14px' : fontSize === 'medium' ? '16px' : '18px' }}>
                      Preview: This is how text will look with your selected font size.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {isOpen && <div className="modal-backdrop fade show"></div>}
    </>
  );
}

