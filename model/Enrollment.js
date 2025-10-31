import mongoose from "mongoose";

const {Schema, model} = mongoose;

const EnrollmentSchema = new Schema({
    userId: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    courseId: {type: Schema.Types.ObjectId, ref: 'Course', required: true},
    enrolledAt: {type: Date, default: Date.now},
    grades: [{
        assignmentId: {type: String, required: true},
        name: {type: String, required: true},
        grade: {type: Number, required: true},
        weight: {type: Number, required: true},
    }]
});

export default model('Enrollment', EnrollmentSchema);