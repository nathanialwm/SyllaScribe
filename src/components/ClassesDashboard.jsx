import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { enrollmentsAPI, coursesAPI, pastGradesAPI, analyticsAPI } from '../services/api';
import { BookOpen, Archive, Plus, Download, Moon, Sun, Bell, GraduationCap, AlertTriangle, BarChart3, Calendar } from 'lucide-react';
import ClassDetail from './ClassDetail';
import GradeTracker from './GradeTracker';
import RemindersView from './RemindersView';
import PastGradesView from './PastGradesView';
import AdminPanel from './AdminPanel';
import CalendarView from './CalendarView';
import './ClassesDashboard.css';

export default function ClassesDashboard() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [archivedEnrollments, setArchivedEnrollments] = useState([]);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [gpa, setGpa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [darkMode, setDarkMode] = useState(user?.settings?.darkMode || false);
  const [showAddClass, setShowAddClass] = useState(false);
  const [activeTab, setActiveTab] = useState('classes');
  const [finalsConflicts, setFinalsConflicts] = useState([]);
  const [testImportance, setTestImportance] = useState([]);

  useEffect(() => {
    loadData();
    if (user) {
      loadAnalytics();
    }
  }, []);

  const loadAnalytics = async () => {
    try {
      const [conflicts, importance] = await Promise.all([
        analyticsAPI.getFinalsConflicts().catch(() => ({ conflicts: [] })),
        analyticsAPI.getTestImportance().catch(() => ({ tests: [] }))
      ]);
      setFinalsConflicts(conflicts.conflicts || []);
      setTestImportance(importance.tests || []);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [darkMode]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [active, archived, gpaData] = await Promise.all([
        enrollmentsAPI.getAll(false),
        enrollmentsAPI.getAll(true),
        pastGradesAPI.getGPA().catch(() => ({ gpa: 0 }))
      ]);
      setEnrollments(active);
      setArchivedEnrollments(archived);
      setGpa(gpaData.gpa || 0);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (enrollmentId, archive) => {
    try {
      await enrollmentsAPI.update(enrollmentId, { archived: archive });
      await loadData();
    } catch (error) {
      console.error('Failed to archive enrollment:', error);
      alert('Failed to archive class');
    }
  };

  const handleDelete = async (enrollmentId) => {
    if (!confirm('Are you sure you want to delete this class?')) return;
    try {
      await enrollmentsAPI.delete(enrollmentId);
      await loadData();
      if (selectedEnrollment?._id === enrollmentId) {
        setSelectedEnrollment(null);
      }
    } catch (error) {
      console.error('Failed to delete enrollment:', error);
      alert('Failed to delete class');
    }
  };

  const exportGrades = () => {
    const data = {
      activeClasses: enrollments.map(e => ({
        course: e.courseId?.title || 'Unknown',
        grade: e.currentGrade || 0
      })),
      archivedClasses: archivedEnrollments.map(e => ({
        course: e.courseId?.title || 'Unknown',
        grade: e.currentGrade || 0
      })),
      gpa: gpa
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grades-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleDarkMode = async () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ darkMode: newMode })
      });
    } catch (error) {
      console.error('Failed to save dark mode setting:', error);
    }
  };

  if (loading) {
    return <div className="text-center p-5">Loading...</div>;
  }

  if (showAddClass) {
    return (
      <div>
        <button className="btn btn-outline-secondary mb-3" onClick={() => setShowAddClass(false)}>
          Back to Dashboard
        </button>
        <GradeTracker onSave={() => { setShowAddClass(false); loadData(); }} />
      </div>
    );
  }

  if (selectedEnrollment) {
    return (
      <ClassDetail
        enrollment={selectedEnrollment}
        onBack={() => setSelectedEnrollment(null)}
        onUpdate={loadData}
      />
    );
  }

  const displayEnrollments = showArchived ? archivedEnrollments : enrollments;

  return (
    <div className="classes-dashboard">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>SyllaScribe Dashboard</h2>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-secondary"
            onClick={toggleDarkMode}
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button className="btn btn-primary" onClick={exportGrades}>
            <Download size={16} className="me-2" />
            Export Grades
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <ul className="nav nav-tabs mb-4" role="tablist">
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === 'classes' ? 'active' : ''}`}
            onClick={() => setActiveTab('classes')}
            role="tab"
            aria-selected={activeTab === 'classes'}
            aria-controls="classes-tab"
            id="classes-tab-button"
          >
            <BookOpen size={16} className="me-2" aria-hidden="true" />
            Classes
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === 'reminders' ? 'active' : ''}`}
            onClick={() => setActiveTab('reminders')}
            role="tab"
            aria-selected={activeTab === 'reminders'}
            aria-controls="reminders-tab"
            id="reminders-tab-button"
          >
            <Bell size={16} className="me-2" aria-hidden="true" />
            Reminders
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
            role="tab"
            aria-selected={activeTab === 'calendar'}
            aria-controls="calendar-tab"
            id="calendar-tab-button"
          >
            <Calendar size={16} className="me-2" aria-hidden="true" />
            Calendar
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === 'gpa' ? 'active' : ''}`}
            onClick={() => setActiveTab('gpa')}
            role="tab"
            aria-selected={activeTab === 'gpa'}
            aria-controls="gpa-tab"
            id="gpa-tab-button"
          >
            <GraduationCap size={16} className="me-2" aria-hidden="true" />
            GPA & Past Grades
          </button>
        </li>
        {user?.admin && (
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
              role="tab"
              aria-selected={activeTab === 'admin'}
              aria-controls="admin-tab"
              id="admin-tab-button"
            >
              Admin Panel
            </button>
          </li>
        )}
      </ul>

      {/* Finals Conflicts Alert */}
      {finalsConflicts.length > 0 && activeTab === 'classes' && (
        <div className="alert alert-warning mb-4">
          <AlertTriangle size={20} className="me-2" />
          <strong>Finals Conflict Detected!</strong>
          <ul className="mb-0 mt-2">
            {finalsConflicts.map((conflict, idx) => (
              <li key={idx}>
                {conflict.finals.map(f => f.course).join(' and ')} on {new Date(conflict.date).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Test Importance */}
      {testImportance.length > 0 && activeTab === 'classes' && (
        <div className="card mb-4">
          <div className="card-header">
            <BarChart3 size={16} className="me-2" />
            Upcoming Tests (Sorted by Importance)
          </div>
          <div className="card-body">
            <div className="list-group">
              {testImportance.slice(0, 5).map((test, idx) => (
                <div key={idx} className="list-group-item">
                  <strong>{test.course}</strong> - {test.assignment}
                  <br />
                  <small className="text-muted">
                    Due in {test.daysUntil} days | Weight: {test.weight}% | Importance: {test.importance.toFixed(2)}
                  </small>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'classes' && (
        <>
          {gpa > 0 && (
            <div className="card mb-4">
              <div className="card-body">
                <h5 className="card-title">Overall GPA</h5>
                <h3 className="mb-0">{gpa.toFixed(2)}</h3>
              </div>
            </div>
          )}

          <div className="mb-3">
            <button
              className={`btn ${showArchived ? 'btn-outline-primary' : 'btn-primary'}`}
              onClick={() => setShowArchived(false)}
            >
              <BookOpen size={16} className="me-2" />
              Active Classes ({enrollments.length})
            </button>
            <button
              className={`btn ms-2 ${showArchived ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setShowArchived(true)}
            >
              <Archive size={16} className="me-2" />
              Archived ({archivedEnrollments.length})
            </button>
            <button className="btn btn-success ms-2" onClick={() => setShowAddClass(true)}>
              <Plus size={16} className="me-2" />
              Add Class
            </button>
          </div>

          {displayEnrollments.length === 0 ? (
            <div className="card">
              <div className="card-body text-center">
                <p className="text-muted">No {showArchived ? 'archived' : 'active'} classes yet.</p>
                {!showArchived && (
                  <p>Upload a syllabus to get started!</p>
                )}
              </div>
            </div>
          ) : (
            <div className="row">
              {displayEnrollments.map((enrollment) => (
                <div key={enrollment._id} className="col-md-6 col-lg-4 mb-3">
                  <div className="card h-100">
                    <div className="card-body">
                      <h5 className="card-title">{enrollment.courseId?.title || 'Unknown Course'}</h5>
                      {enrollment.courseId?.instructor && (
                        <p className="text-muted small mb-2">Instructor: {enrollment.courseId.instructor}</p>
                      )}
                      {enrollment.semester && (
                        <p className="text-muted small mb-2">Semester: {enrollment.semester}</p>
                      )}
                      {enrollment.currentGrade !== undefined && (
                        <h4 className="mb-3">Grade: {enrollment.currentGrade.toFixed(2)}%</h4>
                      )}
                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-primary btn-sm flex-grow-1"
                          onClick={() => setSelectedEnrollment(enrollment)}
                        >
                          View Details
                        </button>
                        <button
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => handleArchive(enrollment._id, !showArchived)}
                        >
                          {showArchived ? 'Unarchive' : 'Archive'}
                        </button>
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => handleDelete(enrollment._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'reminders' && <RemindersView />}
      {activeTab === 'calendar' && <CalendarView />}
      {activeTab === 'gpa' && <PastGradesView />}
      {activeTab === 'admin' && user?.admin && <AdminPanel />}

      {gpa > 0 && (
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title">Overall GPA</h5>
            <h3 className="mb-0">{gpa.toFixed(2)}</h3>
          </div>
        </div>
      )}

      <div className="mb-3">
        <button
          className={`btn ${showArchived ? 'btn-outline-primary' : 'btn-primary'}`}
          onClick={() => setShowArchived(false)}
        >
          <BookOpen size={16} className="me-2" />
          Active Classes ({enrollments.length})
        </button>
        <button
          className={`btn ms-2 ${showArchived ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setShowArchived(true)}
        >
          <Archive size={16} className="me-2" />
          Archived ({archivedEnrollments.length})
        </button>
      </div>

      {displayEnrollments.length === 0 ? (
        <div className="card">
          <div className="card-body text-center">
            <p className="text-muted">No {showArchived ? 'archived' : 'active'} classes yet.</p>
            {!showArchived && (
              <p>Upload a syllabus to get started!</p>
            )}
          </div>
        </div>
      ) : (
        <div className="row">
          {displayEnrollments.map((enrollment) => (
            <div key={enrollment._id} className="col-md-6 col-lg-4 mb-3">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">{enrollment.courseId?.title || 'Unknown Course'}</h5>
                  {enrollment.courseId?.instructor && (
                    <p className="text-muted small mb-2">Instructor: {enrollment.courseId.instructor}</p>
                  )}
                  {enrollment.semester && (
                    <p className="text-muted small mb-2">Semester: {enrollment.semester}</p>
                  )}
                  {enrollment.currentGrade !== undefined && (
                    <h4 className="mb-3">Grade: {enrollment.currentGrade.toFixed(2)}%</h4>
                  )}
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-primary btn-sm flex-grow-1"
                      onClick={() => setSelectedEnrollment(enrollment)}
                    >
                      View Details
                    </button>
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => handleArchive(enrollment._id, !showArchived)}
                    >
                      {showArchived ? 'Unarchive' : 'Archive'}
                    </button>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => handleDelete(enrollment._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

