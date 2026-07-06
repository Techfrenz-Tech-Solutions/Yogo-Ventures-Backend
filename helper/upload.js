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

module.exports = upload;
