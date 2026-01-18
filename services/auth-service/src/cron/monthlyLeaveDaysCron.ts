import cron from 'node-cron';
import Knex from 'knex';
import knexConfig from '../../knexfile.js';

// Initialize knex with the development config
const config = {
  ...knexConfig.development,
  connection: {
    ...knexConfig.development.connection,
    port: knexConfig.development.connection.port ? parseInt(knexConfig.development.connection.port as string, 10) : undefined
  }
};
const knex = Knex(config);

interface UserLeaveUpdate {
  id: number;
  username: string;
  monthly_leave_balance: number;
}

/**
 * Cron job to automatically add monthly leave days to all active users
 * Runs at 12:00 PM on the 1st day of every month
 * Schedule: "0 12 1 * *" means:
 * - 0: minute (12:00)
 * - 12: hour (12 PM / noon)
 * - 1: day of month (1st day)
 * - *: every month
 * - *: every day of week
 */

const MONTHLY_LEAVE_DAYS_TO_ADD = 1; // Add 1 leave day per month

export function startMonthlyLeaveDaysCron() {
  console.log('📅 [CRON] Monthly leave days cron job initialized');
  console.log(`📅 [CRON] Schedule: Every 1st of month at 12:00 PM (noon)`);
  console.log(`📅 [CRON] Will add ${MONTHLY_LEAVE_DAYS_TO_ADD} leave day(s) to all active users`);

  // Cron expression: "0 12 1 * *"
  // sec min hour day month weekday
  //  0  12   1   *    *
  const cronSchedule = '0 12 1 * *';

  cron.schedule(cronSchedule, async () => {
    console.log('\n🎯 [CRON] ===== MONTHLY LEAVE DAYS UPDATE START =====');
    console.log(`🕐 [CRON] Execution time: ${new Date().toISOString()}`);

    try {
      // Fetch all active users (status != 'resigned' or null means active)
      const users = await knex('users')
        .select('id', 'username', 'monthly_leave_balance', 'status')
        .whereNot('status', 'resigned')
        .orWhereNull('status');

      if (!users || users.length === 0) {
        console.log('⚠️  [CRON] No active users found to update');
        return;
      }

      console.log(`👥 [CRON] Found ${users.length} active users`);

      // Update monthly_leave_balance for all active users
      const updatePromises = users.map(async (user: any) => {
        const currentBalance = user.monthly_leave_balance || 0;
        const newBalance = currentBalance + MONTHLY_LEAVE_DAYS_TO_ADD;

        await knex('users')
          .where('id', user.id)
          .update({
            monthly_leave_balance: newBalance,
            updatedAt: knex.fn.now()
          });

        return {
          id: user.id,
          username: user.username,
          oldBalance: currentBalance,
          newBalance: newBalance
        };
      });

      const results = await Promise.all(updatePromises);

      console.log(`✅ [CRON] Successfully updated ${results.length} users`);
      console.log(`📊 [CRON] Summary:`);
      console.log(`   - Added: +${MONTHLY_LEAVE_DAYS_TO_ADD} leave day(s) per user`);
      console.log(`   - Total users updated: ${results.length}`);
      
      // Log first 5 users as sample
      const sampleUsers = results.slice(0, 5);
      console.log(`   - Sample updates:`);
      sampleUsers.forEach(u => {
        console.log(`     • User ${u.username} (ID: ${u.id}): ${u.oldBalance} → ${u.newBalance} days`);
      });

      if (results.length > 5) {
        console.log(`     ... and ${results.length - 5} more users`);
      }

    } catch (error: any) {
      console.error('❌ [CRON] Error updating monthly leave days:', error);
      console.error('❌ [CRON] Stack:', error.stack);
    } finally {
      console.log('🎯 [CRON] ===== MONTHLY LEAVE DAYS UPDATE END =====\n');
    }
  });

  console.log('✅ [CRON] Monthly leave days cron job started successfully');
}

/**
 * Manual trigger function for testing
 * Call this to test the cron job logic without waiting for scheduled time
 */
export async function triggerMonthlyLeaveDaysManual() {
  console.log('\n🧪 [MANUAL] Manually triggering monthly leave days update...');
  
  try {
    const users = await knex('users')
      .select('id', 'username', 'monthly_leave_balance', 'status')
      .whereNot('status', 'resigned')
      .orWhereNull('status');

    if (!users || users.length === 0) {
      console.log('⚠️  [MANUAL] No active users found');
      return { success: false, message: 'No active users found' };
    }

    console.log(`👥 [MANUAL] Found ${users.length} active users`);

    const updatePromises = users.map(async (user: any) => {
      const currentBalance = user.monthly_leave_balance || 0;
      const newBalance = currentBalance + MONTHLY_LEAVE_DAYS_TO_ADD;

      await knex('users')
        .where('id', user.id)
        .update({
          monthly_leave_balance: newBalance,
          updatedAt: knex.fn.now()
        });

      return {
        id: user.id,
        username: user.username,
        oldBalance: currentBalance,
        newBalance: newBalance
      };
    });

    const results = await Promise.all(updatePromises);

    console.log(`✅ [MANUAL] Successfully updated ${results.length} users`);
    
    return {
      success: true,
      message: `Updated ${results.length} users`,
      results: results
    };

  } catch (error: any) {
    console.error('❌ [MANUAL] Error:', error);
    return {
      success: false,
      message: error.message,
      error: error
    };
  }
}
