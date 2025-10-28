import React, { useState } from "react";
import "./GradeTracker.css";  
import "bootstrap/dist/css/bootstrap.min.css";
import { Trash2 } from "lucide-react";



function GradeTracker() {
  const [className, setClassName] = useState("");
  const [gradedAreas, setGradedAreas] = useState([]);
  const [finalGrade, setFinalGrade] = useState(null);

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

  return (
    <div className="Grade-tracker">
      <h1>Syllascribe</h1>
      <p>Track and calculate your grades easily!</p>

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
      <button className="btn btn-primary m-1 save-btn">Save</button> {/* Placeholder for future save functionality. If logged in will send to database otherwise prompt login/signup. */}
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
