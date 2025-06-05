const express = require('express');
const {
  deleteDepartment,
  getAllUsers,
  getAllDepartments,
  addDepartment,
  addUser,
  editDepartment,
  deleteUser,
  updateUserPassword,
  editUser,
} = require('../controllers/superAdminController');
const router = express.Router();

router.get('/users', getAllUsers); // GET /api/admin/users
router.get('/departments', getAllDepartments);
router.post('/user', addUser);
router.post('/department', addDepartment); 
router.delete('/department/:id', deleteDepartment);
router.put('/department/:id', editDepartment);
router.delete('/user/:uid', deleteUser);
router.patch('/user/:uid/password', updateUserPassword);
router.patch('/user/:uid', editUser);

module.exports = router;
