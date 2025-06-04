const admin = require('../firebase-admin');

const loginController = async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid authorization header' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email; // ✅ Extract email from token

    // 🔍 Query Firestore for user by uid field
    const snapshot = await admin
      .firestore()
      .collection('users')
      .where('uid', '==', uid)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'User document not found' });
    }

    const userDoc = snapshot.docs[0].data();

    // ✅ Combine Firestore data with email from token
    const user = {
      ...userDoc,
      email: email || userDoc.email || null, // fallback if not in Firestore
    };

    return res.status(200).json({
      message: 'Login successful',
      user,
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(401).json({ message: 'Authentication failed', error: error.message });
  }
};

module.exports = loginController;
