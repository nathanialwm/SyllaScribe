/*
 * Calculate weighted grade for a course with drop-lowest support
 * categories = [{ name, weight, dropLowest, items: [{score, maxScore, weight}] }]
 * enrollmentGrades = [{ categoryName, assignmentName, score, maxScore }]
 */
function calculateWeightedGrade(categories, enrollmentGrades = []) {
    if (!Array.isArray(categories)) return 0;

    let total = 0;
    let totalWeight = 0;

    categories.forEach(cat => {
        const weight = cat.weight || 0;
        const dropLowest = cat.dropLowest || 0;
        const items = cat.items || [];

        if (items.length === 0 || weight === 0) return;

        // Get grades for this category from enrollment
        const categoryGrades = enrollmentGrades
            .filter(g => g.categoryName === cat.name)
            .map(g => ({
                score: g.score || 0,
                maxScore: g.maxScore || 100,
                weight: g.weight || (1 / items.length) // Default equal weight
            }));

        // If no grades yet, skip this category
        if (categoryGrades.length === 0) {
            totalWeight += weight;
            return;
        }

        // Sort by percentage score (ascending) to drop lowest
        const sortedGrades = [...categoryGrades].sort((a, b) => {
            const aPct = a.maxScore > 0 ? (a.score / a.maxScore) : 0;
            const bPct = b.maxScore > 0 ? (b.score / b.maxScore) : 0;
            return aPct - bPct;
        });

        // Drop lowest N grades
        const gradesToUse = sortedGrades.slice(dropLowest);

        if (gradesToUse.length === 0) {
            totalWeight += weight;
            return;
        }

        // Calculate weighted average within category
        let categoryEarned = 0;
        let categoryPossible = 0;

        gradesToUse.forEach(grade => {
            const itemWeight = grade.weight || (1 / gradesToUse.length);
            categoryEarned += (grade.score || 0) * itemWeight;
            categoryPossible += (grade.maxScore || 100) * itemWeight;
        });

        if (categoryPossible === 0) {
            totalWeight += weight;
            return;
        }

        const categoryPct = categoryEarned / categoryPossible;
        total += categoryPct * (weight / 100);
        totalWeight += weight;
    });

    // Normalize if weights don't sum to 100
    if (totalWeight > 0 && totalWeight !== 100) {
        total = (total / totalWeight) * 100;
    }

    return Number(total.toFixed(2));
}

/*
 * Calculate GPA from letter grades or numeric grades
 */
function calculateGPA(pastGrades, currentEnrollments = []) {
    if (!Array.isArray(pastGrades) && !Array.isArray(currentEnrollments)) return 0;

    let totalPoints = 0;
    let totalCredits = 0;

    // Process past grades
    if (Array.isArray(pastGrades)) {
        pastGrades.forEach(grade => {
            const credits = grade.credits || 3;
            let points = 0;

            if (grade.letterGrade) {
                // Convert letter to GPA points
                const letterMap = {
                    'A+': 4.0, 'A': 4.0, 'A-': 3.7,
                    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
                    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
                    'D+': 1.3, 'D': 1.0, 'D-': 0.7,
                    'F': 0.0
                };
                points = letterMap[grade.letterGrade.toUpperCase()] || 0;
            } else if (grade.numericGrade !== undefined) {
                // Convert numeric to GPA scale
                const scale = grade.gpaScale || 4.0;
                if (grade.numericGrade <= 100) {
                    // Assume 0-100 scale, convert to 4.0
                    points = (grade.numericGrade / 100) * scale;
                } else {
                    // Already on GPA scale
                    points = grade.numericGrade / scale;
                }
            }

            totalPoints += points * credits;
            totalCredits += credits;
        });
    }

    // Process current enrollments (if they have final grades)
    if (Array.isArray(currentEnrollments)) {
        currentEnrollments.forEach(enrollment => {
            if (enrollment.finalGrade !== undefined && enrollment.credits) {
                const scale = enrollment.gpaScale || 4.0;
                const points = (enrollment.finalGrade / 100) * scale;
                totalPoints += points * enrollment.credits;
                totalCredits += enrollment.credits;
            }
        });
    }

    if (totalCredits === 0) return 0;
    return Number((totalPoints / totalCredits).toFixed(2));
}

export { calculateWeightedGrade, calculateGPA };
