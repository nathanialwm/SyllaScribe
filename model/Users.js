import mongoose from "mongoose";

const {Schema, model} = mongoose;

const userSchema = new Schema({
    userId: {type: Number, required: true, unique: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    name: {type: String, required: true},
    createdAt: {type: Date, default: Date.now},
    settings: [{
        darkMode: {type: Boolean, default: false},
        notifications: {type: Boolean, default: true}, 
        admin: {type: Boolean, default: false}
    }]
});

export default model('User', userSchema);