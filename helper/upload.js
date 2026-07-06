const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const storageDir = path.join(__dirname, '..', 'storage');
fs.mkdirSync(storageDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, storageDir),
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Wraps a multer middleware so file-size/type errors come back as normal JSON responses
const handleUpload = (multerMiddleware) => (req, res, next) => {
    multerMiddleware(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.json({
                    status: 0,
                    message: 'File size must be less than 5MB'
                });
            }
            return res.json({ status: 0, message: err.message });
        } else if (err) {
            return res.json({
                status: 0,
                message: err.message
            });
        }

        next();
    });
};

module.exports = { upload, handleUpload };
