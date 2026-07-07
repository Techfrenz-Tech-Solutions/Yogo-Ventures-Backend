const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const storageDir = path.join(__dirname, '..', 'storage');
fs.mkdirSync(storageDir, { recursive: true });

// ── Allowed image types ──────────────────────────────────────────────────
// Explicit allowlist — anything else (.html, .svg, .js, .php, .exe, etc.)
// is rejected, both by declared MIME type/extension (fileFilter, below,
// before the file is written) and by the file's actual magic bytes
// (validateMagicBytes, after it's written — catches a renamed/mislabeled
// file that lies about its own type).
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

const MAGIC_BYTE_SIGNATURES = [
    { bytes: [0xFF, 0xD8, 0xFF] },                                              // JPEG
    { bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },                 // PNG
    { bytes: [0x47, 0x49, 0x46, 0x38] },                                        // GIF (GIF87a / GIF89a)
];

function isValidImageBuffer(buffer) {
    const matchesKnownSignature = MAGIC_BYTE_SIGNATURES.some(({ bytes }) =>
        bytes.every((byte, i) => buffer[i] === byte)
    );
    if (matchesKnownSignature) return true;

    // WEBP: "RIFF" .... "WEBP" (bytes 0-3 and 8-11)
    if (
        buffer.length >= 12 &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
        return true;
    }

    return false;
}

// Deletes every file referenced by a multer file object / array / fields-map,
// ignoring individual failures (best-effort cleanup).
const deleteUploadedFiles = (files) => {
    if (!files) return;
    const list = Array.isArray(files)
        ? files
        : (typeof files === 'object' && !files.path)
            ? Object.values(files).flat()
            : [files];

    for (const f of list) {
        if (!f || !f.path) continue;
        fs.unlink(f.path, (err) => {
            if (err) console.error('Failed to remove rejected upload:', f.path, err.message);
        });
    }
};

// Reads the first 12 bytes of a file on disk (synchronous — files here are
// capped at 5MB and this only reads a handful of bytes, not the whole file).
function readHeaderBytes(filePath) {
    const fd = fs.openSync(filePath, 'r');
    try {
        const buffer = Buffer.alloc(12);
        fs.readSync(fd, buffer, 0, 12, 0);
        return buffer;
    } finally {
        fs.closeSync(fd);
    }
}

// Validates every uploaded file's actual content against known image magic
// bytes. Returns { valid: true } or { valid: false } — on failure, callers
// are responsible for cleaning up the files (see deleteUploadedFiles).
function validateMagicBytes(files) {
    if (!files) return { valid: true };
    const list = Array.isArray(files)
        ? files
        : (typeof files === 'object' && !files.path)
            ? Object.values(files).flat()
            : [files];

    for (const f of list) {
        if (!f || !f.path) continue;
        try {
            const header = readHeaderBytes(f.path);
            if (!isValidImageBuffer(header)) return { valid: false };
        } catch (err) {
            console.error('Failed to read uploaded file for validation:', f.path, err.message);
            return { valid: false };
        }
    }
    return { valid: true };
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, storageDir),
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname).toLowerCase()}`;
        cb(null, uniqueName);
    }
});

// Rejects anything outside the allowed image MIME types/extensions before a
// single byte is written to disk. Content-Type and filename are both
// client-supplied and spoofable, hence the second layer (magic bytes) below.
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype) || !ALLOWED_EXTENSIONS.includes(ext)) {
        return cb(new Error('Only JPEG, PNG, WEBP, and GIF images are allowed'));
    }
    cb(null, true);
};

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter
});

// Wraps a multer middleware so file-size/type errors come back as normal
// JSON responses, and adds a post-write magic-byte check so a renamed
// non-image file (e.g. evil.html saved as image/png) can't slip through.
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

        const uploadedFiles = req.files || req.file;
        if (uploadedFiles) {
            const { valid } = validateMagicBytes(uploadedFiles);
            if (!valid) {
                deleteUploadedFiles(uploadedFiles);
                return res.json({ status: 0, message: 'Uploaded file is not a valid image' });
            }
        }

        next();
    });
};

module.exports = { upload, handleUpload, deleteUploadedFiles, storageDir };
