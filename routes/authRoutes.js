const express = require('express');
const router = express.Router();
const { loginController, resolveUsername } = require('../controllers/loginController');

// POST /api/auth/login
router.post('/login', loginController);

// GET /api/auth/resolve-username?input=usernameOrEmail
router.get('/resolve-username', resolveUsername);

module.exports = router;
