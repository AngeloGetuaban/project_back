const admin = require('../firebase-admin');

// GET /api/super-admin/users
const getAllUsers = async (req, res) => {
  try {
    // 1. Get all Firestore users
    const userSnapshot = await admin.firestore().collection('users').get();
    const firestoreUsers = userSnapshot.docs.map(doc => doc.data());

    // 2. Get all Firebase Auth users (up to 1000)
    const list = await admin.auth().listUsers(1000);
    const authUsers = list.users.map(userRecord => ({
      uid: userRecord.uid,
      email: userRecord.email,
    }));

    // 3. Merge both sources by UID
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

// ✅ GET /api/super-admin/departments
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

// POST /api/super-admin/user
const addUser = async (req, res) => {
  try {
    const { email, password, first_name, last_name, role, department } = req.body;

    if (!email || !password || !first_name || !last_name || !role || !department) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // 1. Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: `${first_name} ${last_name}`,
    });

    const uid = userRecord.uid;

    // 2. Insert the user document in Firestore
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

    // Firebase Auth error handling
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

    // Generic fallback
    return res.status(500).json({ message: 'Failed to create user', error: error.message });
  }
};




module.exports = {
  getAllUsers,
  getAllDepartments,
  addUser,
};
