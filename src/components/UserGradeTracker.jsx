import React, { useEffect,useState } from "react";
import "./GradeTracker.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { Trash2, Upload, FileText, X } from "lucide-react";
import { aiAPI, coursesAPI, enrollmentsAPI } from '../services/api';
import { set } from "mongoose";
import axios from "axios";


function UserGradeTracker({ selectedCourseData }) {
  const [className, setClassName] = useState("");
  const [gradedAreas, setGradedAreas] = useState([]);
  const [finalGrade, setFinalGrade] = useState(null);
  const [UserFound, setUserFound] = useState(true);
  // Syllabus upload states
  const [syllabusFile, setSyllabusFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [parseError, setParseError] = useState("");
  const [parsedData, setParsedData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [instructor, setInstructor] = useState("");
 useEffect(() => {
  console.log("=== DEBUG ===");
  console.log("selectedCourseData:", selectedCourseData);
  console.log("Has enrolledGrades?", selectedCourseData?.enrolledGrades);
  console.log("enrolledGrades type:", typeof selectedCourseData?.enrolledGrades);
  console.log("enrolledGrades is array?", Array.isArray(selectedCourseData?.enrolledGrades));
  
  if (selectedCourseData) {
    
    
    setClassName(selectedCourseData.title || "");
    
  
    const gradesData = selectedCourseData.enrollmentGrades || selectedCourseData.enrolledGrades || selectedCourseData.grades;
    
    
    if (gradesData && Array.isArray(gradesData)) {
      
      
  
      // Group grades by category (extracted from assignment names)
      // Assignment names are stored as "CategoryName|AssignmentName" to preserve category info
      const groupedByCategory = {};

      gradesData.forEach(gradeItem => {
        const itemName = gradeItem.name || "";
        const weight = gradeItem.weight || 0;

        // Parse category name from assignment name (format: "CategoryName|AssignmentName")
        let categoryName = `Category ${weight}%`; // Default
        let assignmentName = itemName;

        if (itemName.includes('|')) {
          const parts = itemName.split('|');
          categoryName = parts[0];
          assignmentName = parts.slice(1).join('|'); // Handle pipes in assignment names
        }

        // Create unique key combining category name and weight
        const key = `${categoryName}_${weight}`;

        if (!groupedByCategory[key]) {
          groupedByCategory[key] = {
            name: categoryName,
            weight: weight,
            items: []
          };
        }

        groupedByCategory[key].items.push({
          name: assignmentName,
          grade: gradeItem.grade?.toString() || "",
          participation: null,
          date: "",
          status: "not-submitted"
        });
      });

      // Convert groups to areas
      const formattedAreas = Object.values(groupedByCategory).map(group => ({
        name: group.name,
        weight: group.weight.toString(),
        isOpen: true,
        items: group.items
      }));
      

      setGradedAreas(formattedAreas);
    } 
  } else {
    setClassName("");
    setGradedAreas([]);
    setFinalGrade(null);
  }
}, [selectedCourseData]);

  // Auto-calculate grade when gradedAreas change
  useEffect(() => {
    if (gradedAreas.length > 0) {
      calculateFinalGrade();
    }
  }, [gradedAreas]);

  const UpdateAreaName = (index, value) => {
    setGradedAreas(prev =>
      prev.map((area, i) => (i === index ? { ...area, name: value } : area))
    );
  };

const addGradedArea = () => {
  setGradedAreas([
    ...gradedAreas,
    { name: "", weight: "", isOpen: false, items: [{ name: "", grade: "", participation: null, date: "", status: "not-submitted" }] }
  ]);
};
const addGradedAreaPass = (gradedAreas) => {
  setGradedAreas([
    ...gradedAreas,
    { name: gradedAreas.name, weight: gradedAreas.window, isOpen: true, items: [{ name: "", grade: "", participation: null, date: "", status: "not-submitted" }] }
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

      const updatedItems = area.items.map((item, j) => {
        if (j !== itemIndex) return item;

        let updated = { ...item, [field]: value };

        // Auto-fill participation grade
        if (field === "participation") {
          updated.grade = value === "yes" ? "100" : "0";
        }

        return updated;
      });

      return { ...area, items: updatedItems };
    })
  );
};

  const addItemtoArea = (areaIndex) => {
    setGradedAreas(prev =>
      prev.map((area, i) =>
        i === areaIndex
          ? { ...area, items: [...area.items, 
            { name: "", grade: "", participation: null, date: "", status: "not-submitted" }] }
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

 const isParticipationArea = (name) =>
  name.toLowerCase().includes("participation");

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
     setParseError(error.message);
   } finally {
     setUploading(false);
   }
 };

 // Apply parsed data to form
 const applyParsedData = () => {
   if (!parsedData) return;

   setClassName(parsedData.className);
   setInstructor(parsedData.instructor);

   // Convert parsed categories to gradedAreas format
   const newGradedAreas = parsedData.categories.map(category => ({
     name: category.name,
     weight: category.weight.toString(),
     isOpen: false,
     items: category.assignments.map(assignment => ({
       name: assignment.name,
       grade: "0" // Start with 0 as requested
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
 const handleDeleteCourseCall = async () => {
      handleDeleteCourse();
     alert("Course deleted successfully!");
 };


 
 const handleDeleteCourse = async () => {
    try {
    if (!selectedCourseData || !selectedCourseData.enrollmentId) {
      alert("No course selected to delete.");
      return;
    }
     
    const response = await axios.delete(`http://localhost:5000/deleteEnrollment/${selectedCourseData.enrollmentId}`);
     const response2 = await axios.delete(`http://localhost:5000/deleteCourseByCustomId/${selectedCourseData.courseId}`);    
    if (response.data.success&&response2.data.success) {
     
      window.location.reload();
    } else {
      alert("Delete failed: " + response.data.message || response2.data.message);
    }
  } catch (error) {
    alert("Error deleting course: " + error.message);
  }
 
}

 const handleSave = async (event) => {
   event.preventDefault();

   if (className.length === 0) {
     alert("Please enter a class name before saving.");
     return;
   }

   const currentUser = JSON.parse(
     sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser')
   );

   if (!currentUser) {
     alert("Please log in or sign up to save your grade tracker.");
     setUserFound(false);
     return;
   }

   try {
     if (selectedCourseData) {
       // UPDATE MODE: Delete old enrollment and create new one with updated data
       // (Using legacy endpoints since the app doesn't use JWT authentication)

       // First, delete the old enrollment and course
       try {
         await axios.delete(`http://localhost:5000/deleteEnrollment/${selectedCourseData.enrollmentId}`);
         await axios.delete(`http://localhost:5000/deleteCourseByCustomId/${selectedCourseData.courseId}`);
       } catch (err) {
         console.error('Error deleting old course/enrollment:', err);
         throw new Error('Failed to delete old course data');
       }

       // Then create new course with updated title
       const courseResponse = await axios.post('http://localhost:5000/createCourse', {
         title: className
       });

       if (!courseResponse.data.success) {
         throw new Error(courseResponse.data.message || 'Failed to create updated course');
       }

       // Encode category names in assignment names for storage
       const gradedAreasToSave = gradedAreas.map(area => ({
         ...area,
         items: area.items.map(item => ({
           ...item,
           name: `${area.name}|${item.name}` // Store as "CategoryName|AssignmentName"
         }))
       }));

       // Finally, create new enrollment with updated grades
       const enrollResponse = await axios.post('http://localhost:5000/enrollCourse', {
         userId: currentUser._id,
         courseId: courseResponse.data.courseId,
         grades: gradedAreasToSave
       });

       if (enrollResponse.data.success) {
         alert("Course updated successfully!");
         window.location.reload();
       } else {
         throw new Error(enrollResponse.data.message || 'Failed to update enrollment');
       }

     } else {
       // CREATE MODE: Create new course and enrollment
       const response = await axios.post('http://localhost:5000/createCourse', {
         title: className
       });

       if (response.data.success) {
         // Encode category names in assignment names for storage
         const gradedAreasToSave = gradedAreas.map(area => ({
           ...area,
           items: area.items.map(item => ({
             ...item,
             name: `${area.name}|${item.name}` // Store as "CategoryName|AssignmentName"
           }))
         }));

         if (!UserFound) {
           sessionStorage.setItem('courseToSave', JSON.stringify({
             courseId: response.data.courseId,
             grades: gradedAreasToSave
           }));
         } else {
           const response2 = await axios.post(
             'http://localhost:5000/enrollCourse',
             {
               userId: currentUser._id,
               courseId: response.data.courseId,
               grades: gradedAreasToSave
             }
           );

           if (response2.data.success) {
             alert("Course saved successfully!");
             window.location.reload();
           } else {
             alert(response2.data.message || "Course save failed");
           }
         }
       } else {
         alert(response.data.message || "Course save failed");
       }
     }
   } catch (error) {
     console.error('Save error:', error);
     alert("Error saving course: " + (error.response?.data?.message || error.message || error));
   }
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

  return (
    <div className="Grade-tracker">
      {/* Syllabus Upload Section */}
      {!selectedCourseData && (
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
    )}

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

            <div className="d-flex gap-2 mt-4">
              <button className="btn btn-success" onClick={applyParsedData}>
                Apply to Grade Tracker
              </button>
              <button className="btn btn-secondary" onClick={cancelPreview}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <label htmlFor="Classname">Class Name: </label>
      <input
        type="text"
        id="Classname"
        className="classname-input"
        name="Classname"
        placeholder="Enter class name here."
        value={className}
        onChange={(e) => setClassName(e.target.value)}
      />
      <br/>
      
      <button className="btn btn-primary m-1 add-area-btn" onClick={addGradedArea}>Add Area</button>

      {/* Grade Breakdown Summary */}
      {gradedAreas.length > 0 && (
        <div className="card mb-3 mt-3">
          <div className="card-header bg-info text-white">
            <h6 className="mb-0">Grade Breakdown Summary</h6>
          </div>
          <div className="card-body">
            <table className="table table-sm table-striped">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Weight</th>
                  <th>Assignments</th>
                  <th>Average</th>
                  <th>Contribution</th>
                </tr>
              </thead>
              <tbody>
                {gradedAreas.map((area, index) => {
                  const weight = parseFloat(area.weight) || 0;
                  const validGrades = area.items
                    .map(item => parseFloat(item.grade))
                    .filter(g => !isNaN(g) && g > 0);
                  const average = validGrades.length > 0
                    ? validGrades.reduce((a, b) => a + b, 0) / validGrades.length
                    : 0;
                  const contribution = (average * weight) / 100;

                  return (
                    <tr key={index}>
                      <td><strong>{area.name || 'Unnamed Category'}</strong></td>
                      <td>{weight}%</td>
                      <td>{area.items.length} ({validGrades.length} graded)</td>
                      <td>{average.toFixed(2)}%</td>
                      <td className="text-success"><strong>{contribution.toFixed(2)}%</strong></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
              <strong>Total Weight:</strong>
              <span className={
                gradedAreas.reduce((sum, area) => sum + (parseFloat(area.weight) || 0), 0) === 100
                  ? 'text-success'
                  : 'text-warning'
              }>
                {gradedAreas.reduce((sum, area) => sum + (parseFloat(area.weight) || 0), 0).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}

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
                    <div key={itemIndex} className="item-row-container">

                      {/*Row 1: old item row*/}
                      <div className="item-row">
                        <input
                          type="text"
                          placeholder="Item Name (e.g., Homework 1)"
                          value={item.name}
                          onChange={(e) =>
                            updateItemField(index, itemIndex, "name", e.target.value)
                          }
                        />

                        {isParticipationArea(area.name) ? (
                          <div className="participation-toggle">
                            <select
                              className="form-select form-select-sm"
                              value={item.participation || ""}
                              onChange={(e) =>
                                updateItemField(index, itemIndex, "participation", e.target.value)
                              }
                            >
                              <option value="">Did you participate?</option>
                              <option value="yes">Yes</option>
                              <option value="no">No</option>
                            </select>

                            <span className="ms-3">
                              Auto grade: {item.grade === "" ? "-" : `${item.grade}%`}
                            </span>
                          </div>
                        ) : (
                          <input
                            type="number"
                            placeholder="%"
                            value={item.grade}
                            onChange={(e) =>
                              updateItemField(index, itemIndex, "grade", e.target.value)
                            }
                          />
                        )}

                        <button
                          className="btn btn-danger m-1 delete-item-btn"
                          onClick={() => deleteItemFromArea(index, itemIndex)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/*row 2: new row for date and status
                      <div className="item-subrow">
                        <label>Due date: </label>
                        <input
                          type="date"
                          className="item-date-input"
                          value={item.date}
                          onChange={(e) =>
                            updateItemField(index, itemIndex, "date", e.target.value)
                          }
                        />

                        <label>Assignment Status: </label>

                        <select
                          className="item-status-select"
                          value={item.status}
                          onChange={(e) =>
                            updateItemField(index, itemIndex, "status", e.target.value)
                          }
                        >
                          <option value="not-submitted">Not submitted</option>
                          <option value="submitted">Submitted</option>
                          <option value="in-progress">Submitted, no grade yet </option>
                          <option value="late">Late</option>
                          <option value="missedorskipped">missed/skipped</option>
                          <option value="participation">Participated</option>
                        </select>
                      </div>*/}

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
      <button className="btn btn-primary m-1 save-btn" onClick={handleSave}>
  {selectedCourseData ? "Update Course" : "Save Course"}
</button>  {/* Placeholder for future save functionality. If logged in will send to database otherwise prompt login/signup. */}
      {selectedCourseData && (
      <button className="btn btn-danger m-1 calc-btn"
      onClick={handleDeleteCourseCall}
      >
      Delete Course
      </button>
      )}
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


export default UserGradeTracker;