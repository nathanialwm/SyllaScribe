import React, { useState } from "react";
import "./GradeTracker.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { Trash2, Upload, FileText, X } from "lucide-react";
import { aiAPI, coursesAPI, enrollmentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';



function GradeTracker({ onSave }) {
  const { user } = useAuth();
  const [className, setClassName] = useState("");
  const [gradedAreas, setGradedAreas] = useState([]);
  const [finalGrade, setFinalGrade] = useState(null);
  const [saving, setSaving] = useState(false);
  const [instructor, setInstructor] = useState("");
  const [semester, setSemester] = useState("");

  // Syllabus upload states
  const [syllabusFile, setSyllabusFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [parseError, setParseError] = useState("");
  const [parsedData, setParsedData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const UpdateAreaName = (index, value) => {
    setGradedAreas(prev =>
      prev.map((area, i) => (i === index ? { ...area, name: value } : area))
    );
  };

const addGradedArea = () => {
  setGradedAreas([
    ...gradedAreas,
    { name: "", weight: "", isOpen: false, items: [{ name: "", grade: "" }] }
  ]);
};

  const toggleDropdown = (index) => {
    setGradedAreas(prev =>
      prev.map((area, i) =>
        i === index ? { ...area, isOpen: !area.isOpen } : area
      )
    );
  };

  const updateItemField = (areaIndex, itemIndex, field, value) => {
    setGradedAreas(prev =>
      prev.map((area, i) => {
        if (i !== areaIndex) return area;
        const updatedItems = area.items.map((item, j) =>
          j === itemIndex ? { ...item, [field]: value } : item
        );
        return { ...area, items: updatedItems };
      })
    );
  };

  const addItemtoArea = (areaIndex) => {
    setGradedAreas(prev =>
      prev.map((area, i) =>
        i === areaIndex
          ? { ...area, items: [...area.items, { name: "", grade: "" }] }
          : area
      )
    );
  };

  const deleteGradedArea = (indexToDelete) => {
    setGradedAreas(prev => prev.filter((_, i) => i !== indexToDelete));
  };

  const deleteItemFromArea = (areaIndex, itemIndex) => {
    setGradedAreas(prev =>
      prev.map((area, i) => {
        if (i !== areaIndex) return area;
        return {
          ...area,
          items: area.items.filter((_, j) => j !== itemIndex)
        };
      })
    );
  };

  const UpdateAreaWeight = (index, value) => {
  setGradedAreas(prev =>
    prev.map((area, i) =>
      i === index ? { ...area, weight: value } : area
    )
  );
 };

 const calculateFinalGrade = () => {
  if (gradedAreas.length === 0) {
    setFinalGrade(null);
    return;
  }

  let totalWeightedScore = 0;
  let totalWeights = 0;

  gradedAreas.forEach(area => {
    const weight = parseFloat(area.weight);
    if (!weight || weight <= 0) return; // Skip unweighted areas

    const validGrades = area.items
      .map(item => parseFloat(item.grade))
      .filter(g => !isNaN(g)); // Ignore blanks or invalid entries

    if (validGrades.length === 0) return; // Skip areas with no valid grades

    const average =
      validGrades.reduce((a, b) => a + b, 0) / validGrades.length;

    totalWeightedScore += average * (weight / 100);
    totalWeights += weight;
  });

  if (totalWeights === 0) {
    setFinalGrade(null);
  } else {
    setFinalGrade(totalWeightedScore);
  }
 };

 // Handle syllabus file selection
 const handleFileSelect = (e) => {
   const file = e.target.files[0];
   if (file) {
     setSyllabusFile(file);
     setParseError("");
   }
 };

 // Upload and parse syllabus
 const handleSyllabusUpload = async () => {
   if (!syllabusFile) {
     setParseError("Please select a file first");
     return;
   }

   setUploading(true);
   setParseError("");

   try {
     const result = await aiAPI.parseSyllabus(syllabusFile);

     if (result.success) {
       setParsedData(result.data);
       setShowPreview(true);

       // Show warnings if any
       if (result.data.warnings && result.data.warnings.length > 0) {
         setParseError(`Parsed successfully with warnings: ${result.data.warnings.join(', ')}`);
       }
     }
   } catch (error) {
     console.error('Syllabus parsing error:', error);
     const errorMessage = error.message || 'Failed to parse syllabus. Please check your file and try again.';
     setParseError(errorMessage);
     
     // Show more helpful error messages
     if (errorMessage.includes('AI_KEY') || errorMessage.includes('AI service')) {
       setParseError('AI service is not configured. Please add AI_KEY to your server .env file to use syllabus parsing.');
     } else if (errorMessage.includes('PDF') || errorMessage.includes('pdf-parse')) {
       setParseError('PDF parsing failed. Try converting your PDF to an image file (JPG/PNG) or ensure the PDF contains readable text.');
     } else if (errorMessage.includes('empty') || errorMessage.includes('extract')) {
       setParseError('Could not extract text from the file. Please ensure the file contains readable text.');
     }
   } finally {
     setUploading(false);
   }
 };

  // Apply parsed data to form
 const applyParsedData = () => {
   if (!parsedData) return;

   setClassName(parsedData.className || parsedData.title || '');
   setInstructor(parsedData.instructor || '');

   // Convert parsed categories to gradedAreas format
   const newGradedAreas = parsedData.categories.map(category => ({
     name: category.name,
     weight: category.weight.toString(),
     isOpen: false,
     items: category.assignments.map(assignment => ({
       name: assignment.name,
       grade: "" // Start empty
     }))
   }));

   setGradedAreas(newGradedAreas);
   setShowPreview(false);
   setParsedData(null);
   setSyllabusFile(null);
 };

 // Cancel preview
 const cancelPreview = () => {
   setShowPreview(false);
   setParsedData(null);
   setSyllabusFile(null);
   setParseError("");
 };

 // Update parsed data in preview
 const updateParsedCategory = (catIndex, field, value) => {
   setParsedData(prev => ({
     ...prev,
     categories: prev.categories.map((cat, i) =>
       i === catIndex ? { ...cat, [field]: value } : cat
     )
   }));
 };

 const updateParsedAssignment = (catIndex, assignIndex, field, value) => {
   setParsedData(prev => ({
     ...prev,
     categories: prev.categories.map((cat, i) => {
       if (i !== catIndex) return cat;
       return {
         ...cat,
         assignments: cat.assignments.map((assign, j) =>
           j === assignIndex ? { ...assign, [field]: value } : assign
         )
       };
     })
   }));
 };

 const deleteParsedCategory = (catIndex) => {
   setParsedData(prev => ({
     ...prev,
     categories: prev.categories.filter((_, i) => i !== catIndex)
   }));
 };

  const deleteParsedAssignment = (catIndex, assignIndex) => {
    setParsedData(prev => ({
      ...prev,
      categories: prev.categories.map((cat, i) => {
        if (i !== catIndex) return cat;
        return {
          ...cat,
          assignments: cat.assignments.filter((_, j) => j !== assignIndex)
        };
      })
    }));
  };

  const handleSave = async () => {
    if (!user) {
      alert('Please log in to save classes');
      return;
    }

    if (!className || gradedAreas.length === 0) {
      alert('Please enter a class name and at least one graded area');
      return;
    }

    // Validate weights sum to 100
    const totalWeight = gradedAreas.reduce((sum, area) => sum + (parseFloat(area.weight) || 0), 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      if (!confirm(`Total weight is ${totalWeight}%, not 100%. Continue anyway?`)) {
        return;
      }
    }

    setSaving(true);
    try {
      // Convert gradedAreas to categories format
      const categories = gradedAreas.map(area => ({
        name: area.name,
        weight: parseFloat(area.weight) || 0,
        dropLowest: 0, // Can be set later
        assignments: area.items.map(item => ({
          name: item.name,
          weight: 0, // Equal weight within category
          maxScore: 100,
          isParticipation: false
        }))
      }));

      const courseData = {
        title: className,
        instructor: instructor || '',
        semester: semester || '',
        categories: categories,
        latePolicy: {
          type: 'none',
          value: 0
        }
      };

      const result = await coursesAPI.create(courseData);
      const courseId = result.course?._id || result._id;
      
      // Create calendar events from parsed syllabus if available
      if (parsedData?.calendarEvents && parsedData.calendarEvents.length > 0 && courseId) {
        try {
          const { calendarAPI } = await import('../services/api');
          await calendarAPI.bulkCreate(parsedData.calendarEvents, courseId);
          console.log(`Created ${parsedData.calendarEvents.length} calendar events from syllabus`);
        } catch (calendarError) {
          console.error('Failed to create calendar events:', calendarError);
          // Don't fail the whole save if calendar creation fails
        }
      }
      
      alert('Class saved successfully!');
      if (onSave) {
        onSave();
      }
      
      // Reset form
      setClassName('');
      setInstructor('');
      setSemester('');
      setGradedAreas([]);
      setFinalGrade(null);
      setParsedData(null);
    } catch (error) {
      console.error('Failed to save class:', error);
      alert('Failed to save class: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="Grade-tracker">
      <h1>Syllascribe</h1>
      <p>Track and calculate your grades easily!</p>

      {/* Syllabus Upload Section */}
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">Add Syllabus Here for AI Parsing</h5>
        </div>
        <div className="card-body">
          <div className="mb-3">
            <label className="btn btn-outline-primary d-inline-flex align-items-center mb-2" style={{ cursor: uploading || showPreview ? 'not-allowed' : 'pointer' }}>
              Choose File <Upload size={16} className="ms-2" />
              <input
                type="file"
                className="d-none"
                accept=".pdf,image/*"
                onChange={handleFileSelect}
                disabled={uploading || showPreview}
              />
            </label>
            <small className="text-muted d-block">Upload a PDF or image of your syllabus</small>
          </div>

          {syllabusFile && !showPreview && (
            <div className="d-flex align-items-center mb-3">
              <FileText size={16} className="me-1" />
              <small className="text-truncate">{syllabusFile.name}</small>
            </div>
          )}

          {parseError && (
            <div className={`alert ${parseError.includes('warnings') ? 'alert-warning' : 'alert-danger'}`}>
              {parseError}
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleSyllabusUpload}
            disabled={!syllabusFile || uploading || showPreview}
          >
            {uploading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Parsing Syllabus...
              </>
            ) : (
              'Parse Syllabus'
            )}
          </button>
        </div>
      </div>

      {/* Preview Modal/Section */}
      {showPreview && parsedData && (
        <div className="card mb-4 border-success">
          <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Preview Parsed Data</h5>
            <button className="btn btn-sm btn-light" onClick={cancelPreview}>
              <X size={16} />
            </button>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label fw-bold">Class Name:</label>
              <input
                type="text"
                className="form-control"
                value={parsedData.className}
                onChange={(e) => setParsedData({ ...parsedData, className: e.target.value })}
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">Instructor:</label>
              <input
                type="text"
                className="form-control"
                value={parsedData.instructor}
                onChange={(e) => setParsedData({ ...parsedData, instructor: e.target.value })}
              />
            </div>

            <h6 className="fw-bold mt-4">Grade Categories:</h6>
            {parsedData.categories.map((category, catIndex) => (
              <div key={catIndex} className="card mb-3">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div className="flex-grow-1 me-2">
                      <input
                        type="text"
                        className="form-control form-control-sm mb-2"
                        placeholder="Category Name"
                        value={category.name}
                        onChange={(e) => updateParsedCategory(catIndex, 'name', e.target.value)}
                      />
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        placeholder="Weight %"
                        value={category.weight}
                        onChange={(e) => updateParsedCategory(catIndex, 'weight', e.target.value)}
                        min="0"
                        max="100"
                      />
                    </div>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => deleteParsedCategory(catIndex)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="ms-3">
                    <small className="fw-bold text-muted">Assignments:</small>
                    {category.assignments.map((assignment, assignIndex) => (
                      <div key={assignIndex} className="d-flex align-items-center mt-2">
                        <input
                          type="text"
                          className="form-control form-control-sm me-2"
                          placeholder="Assignment Name"
                          value={assignment.name}
                          onChange={(e) => updateParsedAssignment(catIndex, assignIndex, 'name', e.target.value)}
                        />
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => deleteParsedAssignment(catIndex, assignIndex)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {parsedData.warnings && parsedData.warnings.length > 0 && (
              <div className="alert alert-warning mt-3">
                <strong>Warnings:</strong>
                <ul className="mb-0 mt-2">
                  {parsedData.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Weight validation */}
            {(() => {
              const totalWeight = parsedData.categories.reduce((sum, cat) => sum + (parseFloat(cat.weight) || 0), 0);
              const isValid = Math.abs(totalWeight - 100) < 0.01;
              return (
                <div className={`alert ${isValid ? 'alert-success' : 'alert-warning'} mt-3`}>
                  Total Weight: {totalWeight.toFixed(2)}% {!isValid && '(Should be 100%)'}
                </div>
              );
            })()}

            <div className="d-flex gap-2 mt-4">
              <button 
                className="btn btn-success" 
                onClick={applyParsedData}
                disabled={(() => {
                  const totalWeight = parsedData.categories.reduce((sum, cat) => sum + (parseFloat(cat.weight) || 0), 0);
                  return Math.abs(totalWeight - 100) > 0.01;
                })()}
              >
                Apply to Grade Tracker
              </button>
              <button className="btn btn-secondary" onClick={cancelPreview}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-3">
        <label htmlFor="Classname" className="form-label">Class Name: </label>
        <input
          type="text"
          id="Classname"
          className="form-control"
          name="Classname"
          placeholder="Enter class name here."
          value={className}
          onChange={(e) => setClassName(e.target.value)}
        />
      </div>
      
      {user && (
        <>
          <div className="mb-3">
            <label htmlFor="Instructor" className="form-label">Instructor: </label>
            <input
              type="text"
              id="Instructor"
              className="form-control"
              name="Instructor"
              placeholder="Enter instructor name (optional)"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="Semester" className="form-label">Semester: </label>
            <input
              type="text"
              id="Semester"
              className="form-control"
              name="Semester"
              placeholder="e.g., Fall 2024 (optional)"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
            />
          </div>
        </>
      )}
      <br/>
      
      <button className="btn btn-primary m-1 add-area-btn" onClick={addGradedArea}>Add Area</button>

      <div className="graded-areas">
        {gradedAreas.length > 0 ? (
          gradedAreas.map((area, index) => (
            <div key={index} className="graded-area">
              <div className="graded-area-header">
                <input
                  type="text"
                  placeholder="Graded Area Name (e.g., Homework)"
                  className="area-name"
                  value={area.name}
                  onChange={(e) => UpdateAreaName(index, e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Weight (%)"
                  className="area-weight"
                  value={area.weight}
                  onChange={(e) => UpdateAreaWeight(index, e.target.value)}
                  min="0"
                  max="100"
                />
                <span
                  className="dropdown-arrow"
                  onClick={() => toggleDropdown(index)}
                >
                  {area.isOpen ? "▲" : "▼"}
                </span>
                <button
                  className="delete-area-btn"
                  onClick={() => deleteGradedArea(index)}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {area.isOpen && (
                <div className="graded-area-content">
                  {area.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="item-row">
                      <input
                        type="text"
                        placeholder="Item Name (e.g., Homework 1)"
                        value={item.name}
                        onChange={(e) =>
                          updateItemField(index, itemIndex, "name", e.target.value)
                        }
                      />
                      <input
                        type="number"
                        placeholder="%"
                        value={item.grade}
                        onChange={(e) =>
                          updateItemField(index, itemIndex, "grade", e.target.value)
                        }
                      />
                      <button
                        className="btn btn-danger m-1 delete-item-btn"
                        onClick={() => deleteItemFromArea(index, itemIndex)}
                      >
                        <Trash2 size={16} />
                    </button>
                    </div>
                  ))}
                  <button 
                  onClick={() => addItemtoArea(index)}
                  className="btn btn-primary m-1 add-item-btn">Add Item</button>
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="d-flex justify-content-center align-items-center">No graded areas added yet.</p>
        )}
      </div>
      <button 
        className="btn btn-primary m-1 save-btn"
        onClick={handleSave}
        disabled={saving || !className || gradedAreas.length === 0}
      >
        {saving ? 'Saving...' : 'Save Class'}
      </button>
      <button className="btn btn-success m-1 calc-btn"
      onClick={calculateFinalGrade}
      >
      Calculate Current Grade
      </button>
      {finalGrade !== null && (
    <div className="final-grade-display">
      <h3>Final Grade: {finalGrade.toFixed(2)}%</h3>
    </div>
        )}
    </div>
  );
}

export default GradeTracker;
