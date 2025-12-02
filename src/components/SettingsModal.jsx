import React, { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { X, Trash2 } from 'lucide-react';

export default function SettingsModal({ onClose }) {
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(user?.settings?.darkMode || false);
  const [notifications, setNotifications] = useState(user?.settings?.notifications !== false);
  const [emailNotifications, setEmailNotifications] = useState(user?.settings?.emailNotifications !== false);
  const [calendarSync, setCalendarSync] = useState(user?.settings?.calendarSync || false);
  const [timezone, setTimezone] = useState(user?.settings?.timezone || 'America/New_York');
  const [dateFormat, setDateFormat] = useState(user?.settings?.dateFormat || 'MM/DD/YYYY');
  const [timeFormat, setTimeFormat] = useState(user?.settings?.timeFormat || '12h');
  const [defaultReminderMinutes, setDefaultReminderMinutes] = useState(user?.settings?.defaultReminderMinutes || 60);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await authAPI.updateSettings({
        darkMode,
        notifications,
        emailNotifications,
        calendarSync,
        timezone,
        dateFormat,
        timeFormat,
        defaultReminderMinutes
      });
      // Apply dark mode immediately
      if (darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('darkMode', 'true');
      } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('darkMode', 'false');
      }
      alert('Settings saved successfully');
      onClose();
      // Refresh to update UI
      window.location.reload();
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Apply dark mode immediately when toggled (before saving)
  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [darkMode]);

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }
    try {
      await authAPI.deleteAccount();
      alert('Account deleted successfully');
      logout();
      onClose();
    } catch (error) {
      console.error('Failed to delete account:', error);
      alert('Failed to delete account');
    }
  };

  return (
    <>
      <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
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
              <div className="mb-3">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="darkModeSwitch"
                    checked={darkMode}
                    onChange={(e) => setDarkMode(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="darkModeSwitch">
                    Dark Mode
                  </label>
                </div>
              </div>

              <div className="mb-3">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="notificationsSwitch"
                    checked={notifications}
                    onChange={(e) => setNotifications(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="notificationsSwitch">
                    Enable In-App Notifications
                  </label>
                </div>
              </div>

              <div className="mb-3">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="emailNotificationsSwitch"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="emailNotificationsSwitch">
                    Enable Email Notifications
                  </label>
                </div>
              </div>

              <div className="mb-3">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="calendarSyncSwitch"
                    checked={calendarSync}
                    onChange={(e) => setCalendarSync(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="calendarSyncSwitch">
                    Enable Calendar Sync (Future Feature)
                  </label>
                </div>
              </div>

              <hr />

              <h6 className="mb-3">Date & Time Preferences</h6>

              <div className="mb-3">
                <label className="form-label">Timezone</label>
                <select
                  className="form-select"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="America/Phoenix">Arizona Time</option>
                  <option value="America/Anchorage">Alaska Time</option>
                  <option value="Pacific/Honolulu">Hawaii Time</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Date Format</label>
                <select
                  className="form-select"
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Time Format</label>
                <select
                  className="form-select"
                  value={timeFormat}
                  onChange={(e) => setTimeFormat(e.target.value)}
                >
                  <option value="12h">12-hour (AM/PM)</option>
                  <option value="24h">24-hour</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Default Reminder (minutes before event)</label>
                <input
                  type="number"
                  className="form-control"
                  value={defaultReminderMinutes}
                  onChange={(e) => setDefaultReminderMinutes(parseInt(e.target.value) || 60)}
                  min="0"
                  max="10080"
                />
                <small className="form-text text-muted">Default reminder time for new calendar events</small>
              </div>

              <hr />

              <div className="mb-3">
                <h6 className="text-danger">Danger Zone</h6>
                {!showDeleteConfirm ? (
                  <button
                    className="btn btn-outline-danger"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 size={16} className="me-2" />
                    Delete My Account
                  </button>
                ) : (
                  <div>
                    <p className="text-danger small mb-2">
                      This will permanently delete your account and all associated data.
                    </p>
                    <button
                      className="btn btn-danger me-2"
                      onClick={handleDeleteAccount}
                    >
                      Confirm Delete
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show"></div>
    </>
  );
}

