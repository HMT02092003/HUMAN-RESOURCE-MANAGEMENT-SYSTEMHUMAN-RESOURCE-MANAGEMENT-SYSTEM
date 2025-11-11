/**
 * Migration: Add 'task_assigned' event type to project_timeline table
 * This allows tracking when tasks are assigned to users
 */

exports.up = async function(knex) {
  // In PostgreSQL, we need to drop and recreate the constraint to add a new enum value
  await knex.raw(`
    ALTER TABLE project_timeline DROP CONSTRAINT IF EXISTS project_timeline_event_type_check;
    ALTER TABLE project_timeline ADD CONSTRAINT project_timeline_event_type_check 
      CHECK (event_type IN (
        'created', 
        'updated', 
        'status_changed', 
        'member_added', 
        'member_removed', 
        'task_created',
        'task_assigned',
        'task_completed',
        'milestone_reached',
        'budget_updated',
        'comment_added'
      ));
  `);
};

exports.down = async function(knex) {
  // Restore the old enum without 'task_assigned'
  await knex.raw(`
    ALTER TABLE project_timeline DROP CONSTRAINT IF EXISTS project_timeline_event_type_check;
    ALTER TABLE project_timeline ADD CONSTRAINT project_timeline_event_type_check 
      CHECK (event_type IN (
        'created', 
        'updated', 
        'status_changed', 
        'member_added', 
        'member_removed', 
        'task_created',
        'task_completed',
        'milestone_reached',
        'budget_updated',
        'comment_added'
      ));
  `);
};
