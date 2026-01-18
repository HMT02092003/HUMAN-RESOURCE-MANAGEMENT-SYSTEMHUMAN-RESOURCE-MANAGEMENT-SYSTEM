/**
 * ====================================================================
 * STANDALONE SALARY CALCULATION WORKER
 * ====================================================================
 * 
 * Chạy worker độc lập để xử lý salary calculation từ RabbitMQ queue
 * 
 * Cách chạy:
 *   yarn worker        (chạy 1 worker)
 *   yarn worker:multi  (chạy 3 workers song song)
 * 
 * Hoặc mở 3 terminal và chạy:
 *   Terminal 1: yarn worker
 *   Terminal 2: yarn worker
 *   Terminal 3: yarn worker
 */

import dotenv from 'dotenv';
dotenv.config();

import SalaryCalculationWorker from './src/workers/salary-calculation-worker.js';

console.log('');
console.log('╔════════════════════════════════════════════════════════╗');
console.log('║  🚀 STARTING SALARY CALCULATION WORKER                ║');
console.log('║  Process ID:', process.pid.toString().padEnd(39), '║');
console.log('╚════════════════════════════════════════════════════════╝');
console.log('');

// Start worker
(async () => {
  try {
    const worker = new SalaryCalculationWorker();
    await worker.start();
    
    console.log('');
    console.log('✅ Salary Calculation Worker is running');
    console.log('⏸️  Press Ctrl+C to stop');
    console.log('');
    
  } catch (error) {
    console.error('❌ Failed to start worker:', error);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏸️  Shutting down worker...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⏸️  Shutting down worker...');
  process.exit(0);
});
