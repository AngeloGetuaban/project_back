const express = require('express');
const router = express.Router();
const { getAllCSVs } = require('../controllers/csvController');

router.get('/contracts', getAllCSVs);

module.exports = router;
