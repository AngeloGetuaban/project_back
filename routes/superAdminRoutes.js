const express = require('express');
const { getAllUsers, getAllDepartments,addUser } = require('../controllers/superAdminController');

const router = express.Router();

router.get('/users', getAllUsers); // GET /api/admin/users
router.get('/departments', getAllDepartments);
router.post('/user', addUser);
module.exports = router;
