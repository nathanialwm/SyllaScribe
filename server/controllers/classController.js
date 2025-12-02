const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const { calculateWeightedGrade } = require("../utils/gradeCalc");

const createCourse = async (req, res) => {
    try {
        const { title, categories } = req.body;

        const course = new Course({
            title,
            categories,
            owner: req.user.id
        });

        await course.save();

        res.json(course);
    } 
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Unable to create course" });
    }
};

const updateCourse = async (req, res) => {
    try {
        const { id } = req.params;

        const updated = await Course.findByIdAndUpdate(
            id,
            req.body,
            { new: true }
        );

        res.json(updated);
    } 
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Unable to update course" });
    }
};

const calculateGrade = async (req, res) => {
    try {
        const { id } = req.params;

        const course = await Course.findById(id);
        if (!course) return res.status(404).json({ error: "Course not found" });

        const grade = calculateWeightedGrade(course.categories);

        res.json({ grade });
    } 
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Grade calculation failed" });
    }
};

module.exports = {
    createCourse,
    updateCourse,
    calculateGrade
};
