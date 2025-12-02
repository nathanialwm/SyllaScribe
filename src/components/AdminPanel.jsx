import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { Shield, Users, BarChart3 } from 'lucide-react';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, statsData] = await Promise.all([
        adminAPI.getUsers(),
        adminAPI.getStats()
      ]);
      setUsers(usersData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load admin data:', error);
      alert('Failed to load admin data. You may not have admin privileges.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (userId) => {
    const newPassword = prompt('Enter new password:');
    if (!newPassword) return;
    try {
      await adminAPI.resetPassword(userId, newPassword);
      alert('Password reset successfully');
    } catch (error) {
      console.error('Failed to reset password:', error);
      alert('Failed to reset password');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user account?')) return;
    try {
      await adminAPI.deleteUser(userId);
      await loadData();
      alert('User account deleted');
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    }
  };

  if (loading) {
    return <div className="text-center p-5">Loading admin panel...</div>;
  }

  return (
    <div className="admin-panel">
      <h2><Shield size={24} className="me-2" />Admin Panel</h2>

      {stats && (
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card">
              <div className="card-body">
                <h5><Users size={20} className="me-2" />Total Users</h5>
                <h3>{stats.totalUsers}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card">
              <div className="card-body">
                <h5>Total Courses</h5>
                <h3>{stats.totalCourses}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card">
              <div className="card-body">
                <h5>Total Enrollments</h5>
                <h3>{stats.totalEnrollments}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card">
              <div className="card-body">
                <h5>Total Reminders</h5>
                <h3>{stats.totalReminders}</h3>
              </div>
            </div>
          </div>
        </div>
      )}

      <h3 className="mb-3">User Management</h3>
      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Admin</th>
              <th>Last Activity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.admin ? 'Yes' : 'No'}</td>
                <td>{user.lastActivity ? new Date(user.lastActivity).toLocaleDateString() : 'Never'}</td>
                <td>
                  <button
                    className="btn btn-sm btn-warning me-2"
                    onClick={() => handleResetPassword(user._id)}
                  >
                    Reset Password
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDeleteUser(user._id)}
                  >
                    Delete Account
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

