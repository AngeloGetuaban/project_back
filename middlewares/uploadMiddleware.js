// middlewares/uploadMiddleware.js
const multer = require('multer');

// In-memory storage so we can stream CSV buffers
const storage = multer.memoryStorage();

const fileFilter = (_, file, cb) => {
  const isCSV = file.mimetype === 'text/csv' || file.originalname.endsWith('.csv');
  cb(null, isCSV ? true : new Error('Only CSV files are allowed.'));
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
