const express = require('express');
const csvRoutes = require('./csvRoutes');
const authRoutes = require('./authRoutes');
const router = express.Router();
const superAdminRoutes = require('./superAdminRoutes');

// Prefix individual route modules
router.use('/csv', csvRoutes);
router.use('/auth', authRoutes);
router.use('/super-admin', superAdminRoutes);
module.exports = router;