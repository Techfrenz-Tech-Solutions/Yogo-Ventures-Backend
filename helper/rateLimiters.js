const rateLimit = require('express-rate-limit');

// Matches this API's convention of always responding 200 with a
// {status:0, message} body rather than a bare HTTP error.
const jsonRateLimitHandler = (req, res) => {
    res.status(429).json({ status: 0, message: 'Too many requests. Please try again later.' });
};

// Strict — protects the single admin account against credential stuffing /
// brute force. Keyed by IP; 10 attempts per 15 minutes is enough for a
// legitimate user who mistypes a password a few times.
exports.loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: jsonRateLimitHandler,
});

// Looser — protects the public, unauthenticated form-submission endpoints
// (contact us, enquiry, quote enquiry) from automated spam/flood without
// getting in the way of a real visitor submitting a form.
exports.publicFormLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: jsonRateLimitHandler,
});
