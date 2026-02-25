const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Use absolute path to ensure reliability
        const uploadDir = path.join(__dirname, '../uploads');
        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Unique filename: timestamp + original name (sanitized)
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter (optional, allow docs, video, audio, images)
const fileFilter = (req, file, cb) => {
    // Allow all file types
    cb(null, true);
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: fileFilter
});

// Upload route
router.post('/', (req, res) => {
    upload.single('file')(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading.
            return res.status(400).json({ error: 'Upload Error: ' + err.message });
        } else if (err) {
            // An unknown error occurred when uploading.
            return res.status(400).json({ error: 'Upload Error: ' + err.message });
        }

        // Everything went fine.
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded (req.file is missing)' });
            }

            const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

            res.json({
                message: 'File uploaded successfully',
                url: fileUrl,
                type: req.file.mimetype,
                filename: req.file.filename
            });
        } catch (error) {
            console.error('Upload processing error:', error);
            res.status(500).json({
                error: 'Server error: ' + error.message,
                stack: error.stack
            });
        }
    });
});

module.exports = router;
