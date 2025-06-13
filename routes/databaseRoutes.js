const express = require('express');
const router = express.Router();
const databaseController = require('../controllers/databaseController');
const upload = require('../middlewares/uploadMiddleware');

router.get('/databases', databaseController.getAllDatabases);
router.post('/databases', databaseController.createDatabase);

router.post('/append-rows', databaseController.appendRowsToSheet);
router.post('/upload-csv', upload.single('file'), databaseController.uploadCsvToSheet);

router.post('/confirm-password', databaseController.confirmPassword);
router.get('/:sheet_id', databaseController.getSheetData);

module.exports = router;
