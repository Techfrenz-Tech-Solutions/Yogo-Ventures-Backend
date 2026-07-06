const { Validator } = require("node-input-validator");
const db = require('../models/db.js');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

/**
 * User Signup
 * POST /auth/signup
 */
exports.signup = async (req, res) => {
    try {
        const reqData = req.body;

        // Validation
        const v = new Validator(reqData, {
            full_name: 'required|string|maxLength:255',
            email_id: 'required|email|maxLength:255',
            password: 'required|string|minLength:6',
            phone_number: 'string|maxLength:20'
        });

        const matched = await v.check();

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");
            return res.json({ 
                status: 0, 
                message: error_message 
            });
        }

        // Check if email already exists
        const checkEmailQuery = "SELECT id FROM users WHERE email_id = ?";
        
        db.mainDb(checkEmailQuery, [reqData.email_id], async (err, result) => {
            if (err) {
                console.error("DB Error:", err);
                return res.json({ 
                    status: 0, 
                    message: "Database error" 
                });
            }

            if (result.length > 0) {
                return res.json({ 
                    status: 0, 
                    message: "Email already exists" 
                });
            }

            // Hash password
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(reqData.password, saltRounds);

            // Insert new user
            const insertQuery = `
                INSERT INTO users 
                (full_name, email_id, phone_number, password) 
                VALUES (?, ?, ?, ?)
            `;

            const values = [
                reqData.full_name,
                reqData.email_id,
                reqData.phone_number || null,
                hashedPassword
            ];

            db.mainDb(insertQuery, values, (insertErr, insertResult) => {
                if (insertErr) {
                    console.error("Insert Error:", insertErr);
                    return res.json({ 
                        status: 0, 
                        message: "Failed to create account" 
                    });
                }

                return res.json({
                    status: 1,
                    message: "Account created successfully",
                    user_id: insertResult.insertId
                });
            });
        });

    } catch (err) {
        console.error("Signup Error:", err);
        return res.json({ 
            status: 0, 
            message: "Something went wrong" 
        });
    }
};

/**
 * User Login
 * POST /auth/login
 */
exports.login = async (req, res) => {
    try {
        const reqData = req.body;

        // Validation
        const v = new Validator(reqData, {
            email_id: 'required|email',
            password: 'required|string'
        });

        const matched = await v.check();

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");
            return res.json({ 
                status: 0, 
                message: error_message 
            });
        }

        // Check if user exists
        const selectQuery = "SELECT * FROM users WHERE email_id = ?";
        
        db.mainDb(selectQuery, [reqData.email_id], async (err, result) => {
            if (err) {
                console.error("DB Error:", err);
                return res.json({ 
                    status: 0, 
                    message: "Database error" 
                });
            }

            if (result.length === 0) {
                return res.json({ 
                    status: 0, 
                    message: "Invalid email or password" 
                });
            }

            const user = result[0];

            // Compare password
            const isPasswordValid = await bcrypt.compare(reqData.password, user.password);

            if (!isPasswordValid) {
                return res.json({ 
                    status: 0, 
                    message: "Invalid email or password" 
                });
            }

            // Generate JWT token
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email_id,
                    full_name: user.full_name
                },
                "SECRET@KEY",
                { expiresIn: "7d" }
            );

            return res.json({
                status: 1,
                message: "Login successful",
                token: `Bearer ${token}`,
                user: {
                    id: user.id,
                    full_name: user.full_name,
                    email_id: user.email_id,
                    phone_number: user.phone_number
                }
            });
        });

    } catch (err) {
        console.error("Login Error:", err);
        return res.json({ 
            status: 0, 
            message: "Something went wrong" 
        });
    }
};
