// firebase-admin.js
const admin = require('firebase-admin');
const serviceAccount = require('./database-manager-471f3-firebase-adminsdk-fbsvc-1a03bde583.json'); // adjust path

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://database-manager-471f3.firebaseio.com',
  });
}

module.exports = admin;
