const admin = require('../firebase-admin');

// --------------------------------------
// Login Controller
// --------------------------------------
const loginController = async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid authorization header' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    const uid = decodedToken.uid;
    const emailFromToken = decodedToken.email;

    if (!uid) {
      return res.status(400).json({ message: 'Invalid token: missing UID' });
    }

    const snapshot = await admin
      .firestore()
      .collection('users')
      .where('uid', '==', uid)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'User document not found in Firestore' });
    }

    const userDoc = snapshot.docs[0].data();

    const user = {
      ...userDoc,
      email: emailFromToken || userDoc.email || null,
      uid,
    };

    return res.status(200).json({
      message: 'Login successful',
      user,
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(401).json({
      message: 'Authentication failed',
      error: error.message,
    });
  }
};

// --------------------------------------
// Username-to-Email Resolver
// --------------------------------------
const resolveUsername = async (req, res) => {
  const { input } = req.query;

  if (!input) {
    return res.status(400).json({ message: 'Missing input parameter' });
  }

  // If input is an email, return directly
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
  if (isEmail) return res.json({ email: input });

  try {
    // Look up Firestore by username
    const usersRef = admin.firestore().collection('users');
    const snapshot = await usersRef.where('username', '==', input).limit(1).get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'Username not found in Firestore' });
    }

    const userDoc = snapshot.docs[0].data();

    if (!userDoc.uid) {
      return res.status(400).json({ message: 'User document does not have a UID field' });
    }

    // Look up Firebase Auth user by UID
    const authUser = await admin.auth().getUser(userDoc.uid);

    if (!authUser.email) {
      return res.status(500).json({ message: 'UID found but no email in Firebase Auth' });
    }

    return res.json({ email: authUser.email });
  } catch (error) {
    console.error('Resolve username error:', error.message);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};

module.exports = {
  loginController,
  resolveUsername,
};
