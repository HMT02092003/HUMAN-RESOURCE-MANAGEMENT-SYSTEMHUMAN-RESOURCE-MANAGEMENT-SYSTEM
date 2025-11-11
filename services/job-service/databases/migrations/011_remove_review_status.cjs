/**
 * Migration: Remove 'review' status from tasks table
 * Only keep: todo, in_progress, done
 */

exports.up = async function(knex) {
  // First, update any tasks with 'review' status to 'in_progress'
  await knex('tasks')
    .where('status', 'review')
    .update({ status: 'in_progress' });

  // Drop the old enum constraint and recreate without 'review'
  await knex.raw(`
    ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
    ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
      CHECK (status IN ('todo', 'in_progress', 'done'));
  `);
};

exports.down = async function(knex) {
  // Restore the old enum with 'review'
  await knex.raw(`
    ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
    ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
      CHECK (status IN ('todo', 'in_progress', 'review', 'done'));
  `);
};
