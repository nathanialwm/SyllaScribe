import React, { useState, useEffect } from 'react';
import { enrollmentsAPI, coursesAPI } from '../services/api';
import { ArrowLeft, Check, X, Clock, AlertCircle } from 'lucide-react';
import './ClassDetail.css';

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started', icon: Clock },
  { value: 'in_progress', label: 'In Progress', icon: Clock },
  { value: 'submitted', label: 'Submitted', icon: Check },
  { value: 'late', label: 'Late', icon: AlertCircle },
  { value: 'graded', label: 'Graded', icon: Check },
  { value: 'missed', label: 'Missed', icon: X }
];

export default function ClassDetail({ enrollment, onBack, onUpdate }) {
  const [course, setCourse] = useState(null);
  const [currentGrade, setCurrentGrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingGrade, setEditingGrade] = useState(null);
  const [hypotheticalScores, setHypotheticalScores] = useState({});

  useEffect(() => {
    loadCourseData();
  }, [enrollment]);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      const [courseData, gradeData] = await Promise.all([
        coursesAPI.getById(enrollment.courseId._id || enrollment.courseId),
        coursesAPI.getGrade(enrollment.courseId._id || enrollment.courseId).catch(() => ({ grade: 0 }))
      ]);
      setCourse(courseData);
      setCurrentGrade(gradeData.grade || 0);
    } catch (error) {
      console.error('Failed to load course data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeUpdate = async (categoryName, assignmentName, assignmentId, score, maxScore, status) => {
    try {
      await enrollmentsAPI.addGrade(enrollment._id, {
        assignmentId,
        categoryName,
        assignmentName,
        score: parseFloat(score),
        maxScore: parseFloat(maxScore) || 100,
        status: status || 'graded'
      });
      await loadCourseData();
      await onUpdate();
      setEditingGrade(null);
    } catch (error) {
      console.error('Failed to update grade:', error);
      alert('Failed to update grade');
    }
  };

  const handleQuickStatusUpdate = async (assignmentId, status, isParticipation) => {
    try {
      const score = isParticipation ? (status === 'graded' ? 100 : 0) : undefined;
      await enrollmentsAPI.updateGradeStatus(enrollment._id, assignmentId, status, score);
      await loadCourseData();
      await onUpdate();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status');
    }
  };

  const calculateHypotheticalGrade = () => {
    if (!course || !course.categories) return currentGrade;

    let total = 0;
    let totalWeight = 0;

    course.categories.forEach(cat => {
      const weight = cat.weight || 0;
      if (weight === 0) return;

      const categoryGrades = enrollment.grades.filter(g => g.categoryName === cat.name);
      const scores = [];

      cat.assignments.forEach(assign => {
        const existingGrade = categoryGrades.find(g => g.assignmentName === assign.name);
        const key = `${cat.name}-${assign.name}`;
        const hypothetical = hypotheticalScores[key];

        if (hypothetical !== undefined && hypothetical !== '') {
          scores.push({
            score: parseFloat(hypothetical),
            maxScore: assign.maxScore || 100,
            weight: assign.weight || (1 / cat.assignments.length)
          });
        } else if (existingGrade && existingGrade.score !== undefined && existingGrade.score !== null) {
          scores.push({
            score: existingGrade.score,
            maxScore: existingGrade.maxScore || 100,
            weight: assign.weight || (1 / cat.assignments.length)
          });
        }
      });

      if (scores.length === 0) {
        totalWeight += weight;
        return;
      }

      // Apply drop lowest
      const dropLowest = cat.dropLowest || 0;
      const sorted = [...scores].sort((a, b) => {
        const aPct = a.maxScore > 0 ? (a.score / a.maxScore) : 0;
        const bPct = b.maxScore > 0 ? (b.score / b.maxScore) : 0;
        return aPct - bPct;
      });
      const toUse = sorted.slice(dropLowest);

      let categoryEarned = 0;
      let categoryPossible = 0;
      toUse.forEach(grade => {
        const itemWeight = grade.weight || (1 / toUse.length);
        categoryEarned += grade.score * itemWeight;
        categoryPossible += grade.maxScore * itemWeight;
      });

      if (categoryPossible > 0) {
        const categoryPct = categoryEarned / categoryPossible;
        total += categoryPct * (weight / 100);
      }
      totalWeight += weight;
    });

    if (totalWeight > 0 && totalWeight !== 100) {
      total = (total / totalWeight) * 100;
    }

    return Number(total.toFixed(2));
  };

  const updateLatePolicy = async (policy) => {
    try {
      await coursesAPI.update(course._id, { latePolicy: policy });
      await loadCourseData();
    } catch (error) {
      console.error('Failed to update late policy:', error);
      alert('Failed to update late policy');
    }
  };

  const updateAssignmentDate = async (categoryIndex, assignmentIndex, dueDate) => {
    try {
      const updatedCourse = { ...course };
      updatedCourse.categories[categoryIndex].assignments[assignmentIndex].dueDate = dueDate;
      await coursesAPI.update(course._id, { categories: updatedCourse.categories });
      await loadCourseData();
    } catch (error) {
      console.error('Failed to update date:', error);
      alert('Failed to update date');
    }
  };

  if (loading) {
    return <div className="text-center p-5">Loading...</div>;
  }

  if (!course) {
    return (
      <div>
        <button className="btn btn-outline-secondary mb-3" onClick={onBack}>
          <ArrowLeft size={16} className="me-2" />
          Back
        </button>
        <div className="alert alert-danger">Course not found</div>
      </div>
    );
  }

  const hypotheticalGrade = calculateHypotheticalGrade();
  const hasHypotheticals = Object.keys(hypotheticalScores).some(key => hypotheticalScores[key] !== '');

  return (
    <div className="class-detail">
      <button className="btn btn-outline-secondary mb-3" onClick={onBack}>
        <ArrowLeft size={16} className="me-2" />
        Back to Classes
      </button>

      <div className="card mb-4">
        <div className="card-body">
          <h2>{course.title}</h2>
          {course.instructor && <p className="text-muted">Instructor: {course.instructor}</p>}
          {enrollment.semester && <p className="text-muted">Semester: {enrollment.semester}</p>}
          <div className="d-flex gap-4 mt-3">
            <div>
              <strong>Current Grade:</strong> {currentGrade.toFixed(2)}%
            </div>
            {hasHypotheticals && (
              <div>
                <strong>Hypothetical Grade:</strong> {hypotheticalGrade.toFixed(2)}%
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Late Policy Section */}
      <div className="card mb-4">
        <div className="card-header">
          <h5>Late Submission Policy</h5>
        </div>
        <div className="card-body">
          <div className="mb-3">
            <label className="form-label">Policy Type</label>
            <select
              className="form-select"
              value={course.latePolicy?.type || 'none'}
              onChange={(e) => updateLatePolicy({ ...course.latePolicy, type: e.target.value })}
            >
              <option value="none">No Penalty</option>
              <option value="percentage">Percentage Deduction</option>
              <option value="fixed">Fixed Points Deduction</option>
            </select>
          </div>
          {course.latePolicy?.type !== 'none' && (
            <div className="mb-3">
              <label className="form-label">Deduction Value</label>
              <input
                type="number"
                className="form-control"
                value={course.latePolicy?.value || 0}
                onChange={(e) => updateLatePolicy({ ...course.latePolicy, value: parseFloat(e.target.value) })}
              />
            </div>
          )}
        </div>
      </div>

      {/* Categories and Assignments */}
      {course.categories && course.categories.map((category, catIndex) => {
        const categoryGrades = enrollment.grades.filter(g => g.categoryName === category.name);
        const categoryScore = categoryGrades.reduce((sum, g) => sum + (g.score || 0), 0);
        const categoryMax = categoryGrades.reduce((sum, g) => sum + (g.maxScore || 100), 0);
        const categoryPct = categoryMax > 0 ? (categoryScore / categoryMax) * 100 : 0;

        return (
          <div key={catIndex} className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <div>
                <h5>{category.name}</h5>
                <small>Weight: {category.weight}%</small>
                {category.dropLowest > 0 && (
                  <small className="ms-2">(Drop {category.dropLowest} lowest)</small>
                )}
              </div>
              {categoryGrades.length > 0 && (
                <div>
                  <strong>{categoryPct.toFixed(2)}%</strong>
                </div>
              )}
            </div>
            <div className="card-body">
              {category.assignments && category.assignments.map((assignment, assignIndex) => {
                const existingGrade = categoryGrades.find(g => g.assignmentName === assignment.name);
                const gradeKey = `${category.name}-${assignment.name}`;
                const isEditing = editingGrade === gradeKey;

                return (
                  <div key={assignIndex} className="assignment-row mb-3 p-3 border rounded">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="flex-grow-1">
                        <h6>{assignment.name}</h6>
                        {assignment.dueDate && (
                          <small className="text-muted">
                            Due: {new Date(assignment.dueDate).toLocaleDateString()}
                            <input
                              type="date"
                              className="form-control form-control-sm d-inline-block ms-2"
                              style={{ width: 'auto' }}
                              value={assignment.dueDate ? new Date(assignment.dueDate).toISOString().split('T')[0] : ''}
                              onChange={(e) => updateAssignmentDate(catIndex, assignIndex, e.target.value)}
                            />
                          </small>
                        )}
                      </div>
                      <div className="d-flex gap-2 align-items-center">
                        {assignment.isParticipation && (
                          <button
                            className={`btn btn-sm ${existingGrade?.status === 'graded' ? 'btn-success' : 'btn-outline-secondary'}`}
                            onClick={() => handleQuickStatusUpdate(
                              existingGrade?.assignmentId || `${category.name}-${assignment.name}`,
                              existingGrade?.status === 'graded' ? 'not_started' : 'graded',
                              true
                            )}
                          >
                            {existingGrade?.status === 'graded' ? <Check /> : <X />}
                          </button>
                        )}
                        <select
                          className="form-select form-select-sm"
                          style={{ width: 'auto' }}
                          value={existingGrade?.status || 'not_started'}
                          onChange={(e) => handleQuickStatusUpdate(
                            existingGrade?.assignmentId || `${category.name}-${assignment.name}`,
                            e.target.value,
                            assignment.isParticipation
                          )}
                        >
                          {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="d-flex gap-2 align-items-center">
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          placeholder="Score"
                          defaultValue={existingGrade?.score || ''}
                          onBlur={(e) => {
                            const score = e.target.value;
                            const maxScore = existingGrade?.maxScore || assignment.maxScore || 100;
                            if (score !== '') {
                              handleGradeUpdate(
                                category.name,
                                assignment.name,
                                existingGrade?.assignmentId || `${category.name}-${assignment.name}`,
                                score,
                                maxScore,
                                existingGrade?.status || 'graded'
                              );
                            }
                          }}
                        />
                        <span>/</span>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          placeholder="Max"
                          defaultValue={existingGrade?.maxScore || assignment.maxScore || 100}
                          style={{ width: '80px' }}
                        />
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setEditingGrade(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          {existingGrade ? (
                            <span>
                              Score: {existingGrade.score !== null && existingGrade.score !== undefined
                                ? `${existingGrade.score} / ${existingGrade.maxScore}`
                                : 'Not graded'}
                            </span>
                          ) : (
                            <span className="text-muted">No grade entered</span>
                          )}
                        </div>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => setEditingGrade(gradeKey)}
                        >
                          {existingGrade ? 'Edit' : 'Add'} Grade
                        </button>
                      </div>
                    )}

                    {/* Hypothetical Score Input */}
                    <div className="mt-2">
                      <label className="form-label small">Hypothetical Score (for simulation):</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        placeholder="Enter hypothetical score"
                        value={hypotheticalScores[gradeKey] || ''}
                        onChange={(e) => setHypotheticalScores({
                          ...hypotheticalScores,
                          [gradeKey]: e.target.value
                        })}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

