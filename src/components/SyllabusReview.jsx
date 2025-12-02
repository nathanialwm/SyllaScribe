import { useState } from "react";
import "./GradeTracker.css";

export default function SyllabusReview({ parsedData, onSave, onCancel }) {
    const [course, setCourse] = useState(parsedData);

    const updateCategory = (index, key, value) => {
        const updated = { ...course };
        updated.categories[index][key] = value;
        setCourse(updated);
    };

    const addCategory = () => {
        setCourse({
            ...course,
            categories: [
                ...course.categories,
                { name: "New Category", weight: 0, items: [] }
            ]
        });
    };

    return (
        <div className="grade-tracker">
            <h2>Review Extracted Syllabus</h2>

            <label>Course Title</label>
            <input
                value={course.title}
                onChange={(e) => setCourse({ ...course, title: e.target.value })}
            />

            <h3>Grading Breakdown</h3>

            {course.categories.map((cat, i) => (
                <div key={i} className="category-row">
                    <input
                        value={cat.name}
                        onChange={(e) => updateCategory(i, "name", e.target.value)}
                    />
                    <input
                        type="number"
                        value={cat.weight}
                        onChange={(e) =>
                            updateCategory(i, "weight", Number(e.target.value))
                        }
                    />
                    <span>%</span>
                </div>
            ))}

            <button onClick={addCategory}>Add Category</button>

            <div className="button-row">
                <button onClick={() => onSave(course)}>Save Class</button>
                <button onClick={onCancel} className="secondary">Cancel</button>
            </div>
        </div>
    );
}
