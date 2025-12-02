import React, { useState, useEffect } from 'react';
import { calendarAPI } from '../services/api';
import { coursesAPI } from '../services/api';
import { Calendar, Plus, Edit, Trash2, Filter, X } from 'lucide-react';

export default function CalendarView() {
  const [events, setEvents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [filterCourse, setFilterCourse] = useState('');
  const [filterType, setFilterType] = useState('');
  const [viewMode, setViewMode] = useState('month'); // 'month', 'week', 'list'
  const [currentDate, setCurrentDate] = useState(new Date());

  // Event form state
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    eventType: 'other',
    courseId: '',
    location: '',
    isAllDay: true,
    reminderEnabled: true,
    reminderMinutes: 60
  });

  useEffect(() => {
    loadData();
  }, [filterCourse, filterType]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventsRes, coursesRes] = await Promise.all([
        calendarAPI.getAll(null, null, filterCourse || null, filterType || null),
        coursesAPI.getAll()
      ]);
      setEvents(eventsRes.events || []);
      setCourses(coursesRes.courses || []);
    } catch (err) {
      console.error('Error loading calendar data:', err);
      setError(err.message || 'Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setEventForm({
      title: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      eventType: 'other',
      courseId: '',
      location: '',
      isAllDay: true,
      reminderEnabled: true,
      reminderMinutes: 60
    });
    setShowEventModal(true);
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      description: event.description || '',
      startDate: event.startDate ? new Date(event.startDate).toISOString().split('T')[0] : '',
      endDate: event.endDate ? new Date(event.endDate).toISOString().split('T')[0] : '',
      eventType: event.eventType,
      courseId: event.courseId?._id || '',
      location: event.location || '',
      isAllDay: event.isAllDay,
      reminderEnabled: event.reminderEnabled,
      reminderMinutes: event.reminderMinutes || 60
    });
    setShowEventModal(true);
  };

  const handleSaveEvent = async () => {
    try {
      if (editingEvent) {
        await calendarAPI.update(editingEvent._id, eventForm);
      } else {
        await calendarAPI.create(eventForm);
      }
      setShowEventModal(false);
      loadData();
    } catch (err) {
      console.error('Error saving event:', err);
      alert('Failed to save event: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await calendarAPI.delete(eventId);
      loadData();
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('Failed to delete event: ' + (err.message || 'Unknown error'));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true
    });
  };

  const getEventTypeColor = (type) => {
    const colors = {
      exam: 'danger',
      assignment: 'primary',
      homework: 'info',
      project: 'warning',
      quiz: 'success',
      lecture: 'secondary',
      deadline: 'dark',
      other: 'light'
    };
    return colors[type] || 'light';
  };

  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.startDate) - new Date(b.startDate)
  );

  const upcomingEvents = sortedEvents.filter(e => 
    new Date(e.startDate) >= new Date()
  ).slice(0, 10);

  if (loading) {
    return <div className="text-center p-5">Loading calendar...</div>;
  }

  return (
    <div className="calendar-view p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Calendar</h2>
        <button className="btn btn-primary" onClick={handleCreateEvent}>
          <Plus size={18} className="me-2" />
          Add Event
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Filter by Course</label>
              <select
                className="form-select"
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
              >
                <option value="">All Courses</option>
                {courses.map(course => (
                  <option key={course._id} value={course._id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Filter by Type</label>
              <select
                className="form-select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="exam">Exam</option>
                <option value="assignment">Assignment</option>
                <option value="homework">Homework</option>
                <option value="project">Project</option>
                <option value="quiz">Quiz</option>
                <option value="lecture">Lecture</option>
                <option value="deadline">Deadline</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="col-md-4 d-flex align-items-end">
              {(filterCourse || filterType) && (
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setFilterCourse('');
                    setFilterType('');
                  }}
                >
                  <X size={16} className="me-2" />
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Events List */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Upcoming Events</h5>
        </div>
        <div className="card-body">
          {upcomingEvents.length === 0 ? (
            <p className="text-muted">No upcoming events</p>
          ) : (
            <div className="list-group">
              {upcomingEvents.map(event => (
                <div
                  key={event._id}
                  className="list-group-item d-flex justify-content-between align-items-start"
                >
                  <div className="ms-2 me-auto">
                    <div className="fw-bold">
                      <span className={`badge bg-${getEventTypeColor(event.eventType)} me-2`}>
                        {event.eventType}
                      </span>
                      {event.title}
                    </div>
                    <div className="text-muted small">
                      {formatDate(event.startDate)}
                      {!event.isAllDay && ` at ${formatTime(event.startDate)}`}
                      {event.courseId && ` • ${event.courseId.title}`}
                    </div>
                    {event.description && (
                      <div className="text-muted small mt-1">{event.description}</div>
                    )}
                  </div>
                  <div className="btn-group btn-group-sm">
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => handleEditEvent(event)}
                      title="Edit"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      className="btn btn-outline-danger"
                      onClick={() => handleDeleteEvent(event._id)}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* All Events List */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">All Events ({events.length})</h5>
        </div>
        <div className="card-body">
          {events.length === 0 ? (
            <p className="text-muted">No events found. Create your first event!</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Title</th>
                    <th>Course</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEvents.map(event => (
                    <tr key={event._id}>
                      <td>{formatDate(event.startDate)}</td>
                      <td>
                        <span className={`badge bg-${getEventTypeColor(event.eventType)}`}>
                          {event.eventType}
                        </span>
                      </td>
                      <td>{event.title}</td>
                      <td>{event.courseId?.title || 'N/A'}</td>
                      <td>
                        <span className={`badge bg-${
                          event.status === 'completed' ? 'success' :
                          event.status === 'missed' ? 'danger' :
                          event.status === 'in-progress' ? 'warning' : 'secondary'
                        }`}>
                          {event.status}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-primary"
                            onClick={() => handleEditEvent(event)}
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => handleDeleteEvent(event._id)}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingEvent ? 'Edit Event' : 'Create Event'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowEventModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  />
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Start Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={eventForm.startDate}
                      onChange={(e) => setEventForm({ ...eventForm, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">End Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={eventForm.endDate}
                      onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Event Type</label>
                    <select
                      className="form-select"
                      value={eventForm.eventType}
                      onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value })}
                    >
                      <option value="exam">Exam</option>
                      <option value="assignment">Assignment</option>
                      <option value="homework">Homework</option>
                      <option value="project">Project</option>
                      <option value="quiz">Quiz</option>
                      <option value="lecture">Lecture</option>
                      <option value="deadline">Deadline</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Course</label>
                    <select
                      className="form-select"
                      value={eventForm.courseId}
                      onChange={(e) => setEventForm({ ...eventForm, courseId: e.target.value })}
                    >
                      <option value="">No Course</option>
                      {courses.map(course => (
                        <option key={course._id} value={course._id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Location</label>
                  <input
                    type="text"
                    className="form-control"
                    value={eventForm.location}
                    onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={eventForm.isAllDay}
                      onChange={(e) => setEventForm({ ...eventForm, isAllDay: e.target.checked })}
                    />
                    <label className="form-check-label">All Day Event</label>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={eventForm.reminderEnabled}
                      onChange={(e) => setEventForm({ ...eventForm, reminderEnabled: e.target.checked })}
                    />
                    <label className="form-check-label">Enable Reminder</label>
                  </div>
                </div>
                {eventForm.reminderEnabled && (
                  <div className="mb-3">
                    <label className="form-label">Reminder (minutes before)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={eventForm.reminderMinutes}
                      onChange={(e) => setEventForm({ ...eventForm, reminderMinutes: parseInt(e.target.value) })}
                      min="0"
                    />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEventModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveEvent}
                  disabled={!eventForm.title || !eventForm.startDate}
                >
                  {editingEvent ? 'Update' : 'Create'} Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showEventModal && <div className="modal-backdrop fade show"></div>}
    </div>
  );
}

