const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Dummy notifications endpoint
app.get('/api/notifications', (req, res) => {
  res.json([
    { id: 1, userId: 1, message: 'Welcome!', read: false },
    { id: 2, userId: 2, message: 'Your payroll is ready.', read: true }
  ]);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`Notification service is running on port ${PORT}`);
}); 