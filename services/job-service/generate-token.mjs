/**
 * Generate a valid JWT token for testing
 */
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'c7c5f8d1a7b84e6a6c8b0f95c4b3e9a0f57e9d4a3c8a4b3d7e1f9b2c5d6e4f1';

const payload = {
  sub: 1,
  username: 'test-user',
  permissions: [],
  roleId: 1
};

const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

console.log('Generated Test Token:');
console.log(token);
console.log('\nUse this token in Authorization header as:');
console.log(`Bearer ${token}`);
