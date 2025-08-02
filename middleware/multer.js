const multer = require('multer');
const path = require('path');

// Define storage location and filename
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Use the path to the uploads folder in /var/www/html/
        cb(null, '/var/www/html/uploads'); // Updated absolute path to uploads folder
    },
    filename: (req, file, cb) => {
        // Use original filename or generate a unique name
        cb(null, Date.now() + path.extname(file.originalname)); // Append the file extension to avoid name collision
    }
});

// File filter to allow only image files
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'));
    }
};

// Initialize multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // Limit to 5MB file size
});

module.exports = upload;
