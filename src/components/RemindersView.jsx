import React, { useState, useEffect } from 'react';
import { remindersAPI, enrollmentsAPI } from '../services/api';
import { Bell, Calendar, Check, X } from 'lucide-react';

export default function RemindersView() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpcoming, setShowUpcoming] = useState(true);

  useEffect(() => {
    loadReminders();
  }, [showUpcoming]);

  const loadReminders = async () => {
    try {
      setLoading(true);
      const data = await remindersAPI.getAll(showUpcoming, false);
      setReminders(data);
    } catch (error) {
      console.error('Failed to load reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (reminderId) => {
    try {
      await remindersAPI.update(reminderId, { completed: true });
      await loadReminders();
    } catch (error) {
      console.error('Failed to complete reminder:', error);
    }
  };

  const handleDelete = async (reminderId) => {
    try {
      await remindersAPI.delete(reminderId);
      await loadReminders();
    } catch (error) {
      console.error('Failed to delete reminder:', error);
    }
  };

  if (loading) {
    return <div className="text-center p-5">Loading reminders...</div>;
  }

  return (
    <div className="reminders-view">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3><Bell size={24} className="me-2" />Reminders</h3>
        <div>
          <button
            className={`btn btn-sm ${showUpcoming ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setShowUpcoming(true)}
          >
            Upcoming
          </button>
          <button
            className={`btn btn-sm ms-2 ${!showUpcoming ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setShowUpcoming(false)}
          >
            All
          </button>
        </div>
      </div>

      {reminders.length === 0 ? (
        <div className="alert alert-info">No reminders found.</div>
      ) : (
        <div className="list-group">
          {reminders.map(reminder => (
            <div key={reminder._id} className="list-group-item">
              <div className="d-flex justify-content-between align-items-start">
                <div className="flex-grow-1">
                  <h6>{reminder.title}</h6>
                  <p className="text-muted small mb-1">
                    {reminder.enrollmentId?.courseId?.title || 'Unknown Course'}
                  </p>
                  <p className="small mb-1">
                    <Calendar size={14} className="me-1" />
                    Due: {new Date(reminder.dueDate).toLocaleString()}
                  </p>
                  {reminder.description && (
                    <p className="small text-muted">{reminder.description}</p>
                  )}
                </div>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-sm btn-success"
                    onClick={() => handleComplete(reminder._id)}
                  >
                    <Check size={16} />
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(reminder._id)}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

