const { Validator } = require("node-input-validator");
const db = require('../models/db.js');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

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
            return res.json({ status: 0, message: error_message });
        }

        // Check if user exists
        const selectQuery = "SELECT * FROM users WHERE email_id = ?";

        db.mainDb(selectQuery, [reqData.email_id], async (err, result) => {
            if (err) {
                console.error("DB Error:", err);
                return res.json({ status: 0, message: "Database error" });
            }

            if (result.length === 0) {
                return res.json({ status: 0, message: "Invalid email or password" });
            }

            const user = result[0];

            // Account disabled — treat a missing `status` column/value as
            // active so this doesn't break against a database created
            // before that column existed.
            if (user.status && user.status !== 'active') {
                return res.json({ status: 0, message: "This account is disabled" });
            }

            // Compare password
            const isPasswordValid = await bcrypt.compare(reqData.password, user.password);

            if (!isPasswordValid) {
                return res.json({ status: 0, message: "Invalid email or password" });
            }

            const role = user.role || 'admin';

            // Generate JWT token
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email_id,
                    full_name: user.full_name,
                    role
                },
                process.env.JWT_SECRET,
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
                    phone_number: user.phone_number,
                    role
                }
            });
        });

    } catch (err) {
        console.error("Login Error:", err);
        return res.json({ status: 0, message: "Something went wrong" });
    }
};
