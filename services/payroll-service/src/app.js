const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Dummy payrolls endpoint
app.get('/api/payrolls', (req, res) => {
  res.json([
    { id: 1, userId: 1, month: '2024-04', salary: 1000 },
    { id: 2, userId: 2, month: '2024-04', salary: 1200 }
  ]);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`Payroll service is running on port ${PORT}`);
}); 