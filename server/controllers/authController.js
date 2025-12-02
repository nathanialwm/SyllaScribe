const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const register = async (req, res) => {
    try {
        const { email, password } = req.body;

        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ error: "Email already registered" });

        const hashed = await bcrypt.hash(password, 12);

        const user = new User({
            email,
            password: hashed
        });

        await user.save();

        res.json({ message: "Account created" });
    } 
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "Invalid credentials" });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ error: "Invalid credentials" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "24h"
        });

        res.json({
            token,
            user: { id: user._id, email: user.email }
        });
    } 
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
};

module.exports = { register, login };
