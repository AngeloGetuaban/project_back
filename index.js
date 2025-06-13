const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'https://project-front-c81k5yhrb-angelos-projects-17db4d4b.vercel.app',
  'https://project-front-zeta.vercel.app',
  'https://bic-1.com/database/',
  'https://bic-1.com/database',
  'https://bic-1.com',
  'http://localhost:5173']
// ✅ CORS config
app.use(cors({
  origin: allowedOrigins,
  credentials: true, // important if you're sending tokens or cookies
}));

app.use(express.json());

// ✅ Routes
const indexRoutes = require('./routes/indexRoutes');
app.use('/api', indexRoutes);

// Test route
app.get('/api', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
