const jwt = require("jsonwebtoken");

const helper = {};

// JWT Auth Middleware
helper.auth = (req, res, next) => {
    try {
        const authHeader = req.headers["authorization"];
        if (!authHeader) return res.status(401).json({ status: 0, message: "Auth token required" });
        const token = authHeader.split(" ")[1];
        if (!token) return res.status(401).json({ status: 0, message: "Invalid token" });
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) return res.status(401).json({ status: 0, message: "Invalid/expired token" });
            req.user = decoded;
            next();
        });
    } catch (err) {
        console.error("Auth middleware error:", err);
        return res.status(401).json({ status: 0, message: "Auth failed" });
    }
}

module.exports = helper;
