const admin = require('../firebase-admin');

// Utility to generate a 20-character ID with special characters
const generateDepartmentId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}<>?';
  return Array.from({ length: 20 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
};

// GET /api/super-admin/users
const getAllUsers = async (req, res) => {
  try {
    const userSnapshot = await admin.firestore().collection('users').get();
    const firestoreUsers = userSnapshot.docs.map(doc => doc.data());

    const list = await admin.auth().listUsers(1000);
    const authUsers = list.users.map(userRecord => ({
      uid: userRecord.uid,
      email: userRecord.email,
    }));

    const mergedUsers = firestoreUsers.map(fUser => {
      const authUser = authUsers.find(aUser => aUser.uid === fUser.uid);
      return {
        ...fUser,
        email: authUser?.email || 'N/A',
      };
    });

    return res.status(200).json({ users: mergedUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
};

// GET /api/super-admin/departments
const getAllDepartments = async (req, res) => {
  try {
    const deptSnapshot = await admin.firestore().collection('departments').get();
    const departments = deptSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({ departments });
  } catch (error) {
    console.error('Error fetching departments:', error);
    return res.status(500).json({ message: 'Failed to fetch departments', error: error.message });
  }
};

// POST /api/super-admin/departments
const addDepartment = async (req, res) => {
  try {
    const { department_name } = req.body;

    if (!department_name || !department_name.trim()) {
      return res.status(400).json({ message: 'Department name is required' });
    }

    const now = new Date();
    const departmentData = {
      department_name: department_name.trim(),
      department_id: generateDepartmentId(),
      created_at: now,
      updated_at: now,
    };

    const docRef = await admin.firestore().collection('departments').add(departmentData);

    return res.status(201).json({
      message: 'Department added successfully',
      id: docRef.id,
      ...departmentData,
    });
  } catch (error) {
    console.error('Error creating department:', error);
    return res.status(500).json({ message: 'Failed to create department', error: error.message });
  }
};

// POST /api/super-admin/user
const addUser = async (req, res) => {
  try {
    const { email, password, first_name, last_name, role, department } = req.body;

    if (!email || !password || !first_name || !last_name || !role || !department) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: `${first_name} ${last_name}`,
    });

    const uid = userRecord.uid;

    await admin.firestore().collection('users').doc(uid).set({
      uid,
      first_name,
      last_name,
      role,
      department,
    });

    return res.status(201).json({ message: 'User created and added to Firestore', uid });
  } catch (error) {
    console.error('Error creating user:', error);

    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ message: 'Email is already in use.' });
    }
    if (error.code === 'auth/invalid-email') {
      return res.status(400).json({ message: 'Invalid email format.' });
    }
    if (error.code === 'auth/invalid-password') {
      return res.status(400).json({
        message: 'Invalid password. Must be at least 6 characters.',
      });
    }

    return res.status(500).json({ message: 'Failed to create user', error: error.message });
  }
};

const deleteDepartment = async (req, res) => {
  const { id } = req.params;

  try {
    await admin.firestore().collection('departments').doc(id).delete();
    return res.status(200).json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department:', error);
    return res.status(500).json({ message: 'Failed to delete department', error: error.message });
  }
};

const editDepartment = async (req, res) => {
  const { id } = req.params;
  const { department_name } = req.body;

  if (!department_name || !department_name.trim()) {
    return res.status(400).json({ message: 'Department name is required' });
  }

  try {
    const db = admin.firestore();
    const departmentRef = db.collection('departments').doc(id);
    const departmentDoc = await departmentRef.get();

    if (!departmentDoc.exists) {
      return res.status(404).json({ message: 'Department not found' });
    }

    const oldName = departmentDoc.data().department_name;
    const newName = department_name.trim();

    // 1. Update the department document
    await departmentRef.update({
      department_name: newName,
      updated_at: new Date(),
    });

    // 2. Query all users with the old department_name
    const userSnapshot = await db
      .collection('users')
      .where('department', '==', oldName)
      .get();

    const batch = db.batch();

    userSnapshot.forEach(doc => {
      batch.update(doc.ref, { department: newName });
    });

    await batch.commit();

    return res.status(200).json({ message: 'Department and associated users updated successfully' });

  } catch (error) {
    console.error('Error updating department:', error);
    return res.status(500).json({ message: 'Failed to update department', error: error.message });
  }
};

// DELETE /api/super-admin/user/:uid
const deleteUser = async (req, res) => {
  const { uid } = req.params;
  try {
    // Delete user from Firebase Auth
    await admin.auth().deleteUser(uid);

    // Delete user document from Firestore
    await admin.firestore().collection('users').doc(uid).delete();

    return res.status(200).json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ message: 'Failed to delete user.', error: error.message });
  }
};

const updateUserPassword = async (req, res) => {
  const { uid } = req.params;
  const { new_password } = req.body;

  if (!uid || !new_password) {
    return res.status(400).json({ message: 'UID and new password are required' });
  }

  try {
    // Validate password strength
    const isValid = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/.test(new_password);
    if (!isValid) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters and include an uppercase letter, number, and special character.',
      });
    }

    // Update password in Firebase Auth
    await admin.auth().updateUser(uid, { password: new_password });

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    return res.status(500).json({ message: 'Failed to update password', error: error.message });
  }
};
const editUser = async (req, res) => {
  const { uid } = req.params;
  const { first_name, last_name, role, department } = req.body;

  if (!first_name || !last_name || !role || !department) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Update Firestore document
    await admin.firestore().collection('users').doc(uid).update({
      first_name,
      last_name,
      role,
      department,
      updated_at: new Date(),
    });

    return res.status(200).json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ message: 'Failed to update user', error: error.message });
  }
};

module.exports = {
  getAllUsers,
  getAllDepartments,
  addDepartment,
  addUser,
  deleteDepartment,
  editDepartment,
  deleteUser,
  updateUserPassword,
  editUser
};
