const express = require('express');
const databaseRoutes = require('./databaseRoutes');
const authRoutes = require('./authRoutes');
const superAdminRoutes = require('./superAdminRoutes');
const accountRoutes = require('./accountRoutes'); // ✅ Add this

const router = express.Router();

// Prefix individual route modules
router.use('/database', databaseRoutes);
router.use('/auth', authRoutes);
router.use('/super-admin', superAdminRoutes);
router.use('/account', accountRoutes); // ✅ Register under /account

module.exports = router;    
