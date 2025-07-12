const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Dummy attendances endpoint
app.get('/api/attendances', (req, res) => {
  res.json([
    { id: 1, userId: 1, date: '2024-04-27', status: 'present' },
    { id: 2, userId: 2, date: '2024-04-27', status: 'absent' }
  ]);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Attendance service is running on port ${PORT}`);
}); 