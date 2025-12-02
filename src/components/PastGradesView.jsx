import React, { useState, useEffect } from 'react';
import { pastGradesAPI } from '../services/api';
import { GraduationCap, Plus, Trash2 } from 'lucide-react';

export default function PastGradesView() {
  const [pastGrades, setPastGrades] = useState([]);
  const [gpa, setGpa] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    courseName: '',
    semester: '',
    letterGrade: '',
    numericGrade: '',
    credits: '3',
    gpaScale: '4.0'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [grades, gpaData] = await Promise.all([
        pastGradesAPI.getAll(),
        pastGradesAPI.getGPA()
      ]);
      setPastGrades(grades);
      setGpa(gpaData.gpa || 0);
    } catch (error) {
      console.error('Failed to load past grades:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await pastGradesAPI.create({
        ...formData,
        numericGrade: formData.numericGrade ? parseFloat(formData.numericGrade) : undefined,
        credits: parseFloat(formData.credits),
        gpaScale: parseFloat(formData.gpaScale)
      });
      setFormData({
        courseName: '',
        semester: '',
        letterGrade: '',
        numericGrade: '',
        credits: '3',
        gpaScale: '4.0'
      });
      setShowAddForm(false);
      await loadData();
    } catch (error) {
      console.error('Failed to add past grade:', error);
      alert('Failed to add past grade');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this past grade?')) return;
    try {
      await pastGradesAPI.delete(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete past grade:', error);
    }
  };

  if (loading) {
    return <div className="text-center p-5">Loading...</div>;
  }

  return (
    <div className="past-grades-view">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3><GraduationCap size={24} className="me-2" />Past Grades & GPA</h3>
          <h4 className="mt-2">Overall GPA: {gpa.toFixed(2)}</h4>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={16} className="me-2" />
          Add Past Grade
        </button>
      </div>

      {showAddForm && (
        <div className="card mb-4">
          <div className="card-body">
            <h5>Add Past Grade</h5>
            <form onSubmit={handleSubmit}>
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">Course Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.courseName}
                    onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Semester</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-4">
                  <label className="form-label">Letter Grade (optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.letterGrade}
                    onChange={(e) => setFormData({ ...formData, letterGrade: e.target.value })}
                    placeholder="A, B+, C, etc."
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Numeric Grade (optional)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.numericGrade}
                    onChange={(e) => setFormData({ ...formData, numericGrade: e.target.value })}
                    placeholder="0-100 or GPA scale"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Credits</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-success">Add Grade</button>
              <button
                type="button"
                className="btn btn-secondary ms-2"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {pastGrades.length === 0 ? (
        <div className="alert alert-info">No past grades added yet.</div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Semester</th>
                <th>Letter Grade</th>
                <th>Numeric Grade</th>
                <th>Credits</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pastGrades.map(grade => (
                <tr key={grade._id}>
                  <td>{grade.courseName}</td>
                  <td>{grade.semester}</td>
                  <td>{grade.letterGrade || '-'}</td>
                  <td>{grade.numericGrade !== undefined ? grade.numericGrade : '-'}</td>
                  <td>{grade.credits}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(grade._id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

