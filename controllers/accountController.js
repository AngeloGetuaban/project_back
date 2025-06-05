// controllers/accountController.js
const admin = require('../firebase-admin');

// PATCH /api/user/:uid
const updateProfile = async (req, res) => {
  const { uid } = req.params;
  const updates = req.body;

  try {
    const userRef = admin.firestore().collection('users').where('uid', '==', uid);
    const snapshot = await userRef.get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'User not found' });
    }

    const docRef = snapshot.docs[0].ref;
    await docRef.update(updates);

    const updatedUser = (await docRef.get()).data();
    return res.status(200).json({ message: 'Profile updated successfully', updatedUser });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
};

// PATCH /api/user/:uid/password
const updatePassword = async (req, res) => {
  const { uid } = req.params;
  const { current_password, new_password } = req.body;

  try {
    const userRecord = await admin.auth().getUser(uid);

    // ⚠️ Firebase Admin SDK cannot verify password, so this should be done on frontend securely via reauthentication
    // Here we directly update the password for admin-level access
    await admin.auth().updateUser(uid, { password: new_password });

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password update error:', error);
    return res.status(500).json({ message: 'Failed to update password', error: error.message });
  }
};

module.exports = {
  updateProfile,
  updatePassword,
};
