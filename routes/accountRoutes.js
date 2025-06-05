// routes/accountRoutes.js
const express = require('express');
const {
  updateProfile,
  updatePassword,
} = require('../controllers/accountController');

const router = express.Router();

router.patch('/user/:uid', updateProfile);
router.patch('/user/:uid/password', updatePassword);

module.exports = router;
