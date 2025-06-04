// firebase-admin.js
const admin = require('firebase-admin');
const serviceAccount = require('./database-manager-471f3-b48c455f65fb.json'); // adjust path

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://database-manager-471f3.firebaseio.com',
  });
}

module.exports = admin;
