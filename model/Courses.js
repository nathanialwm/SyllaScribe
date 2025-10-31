import mongoose from "mongoose";

const {Schema, model} = mongoose;

const courseSchema = new Schema({
    courseId: {type: String, required: true, unique: true},
    title: {type: String, required: true},
});

export default model('Course', courseSchema);