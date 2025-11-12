/**
 * Migration: Add missing event types to project_timeline table
 * Adds: task_updated, deleted, manager_changed, progress_updated
 */

exports.up = async function(knex) {
  // Drop and recreate the constraint with all event types
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
        'task_updated',
        'task_completed',
        'milestone_reached',
        'budget_updated',
        'comment_added',
        'deleted',
        'manager_changed',
        'progress_updated'
      ));
  `);
};

exports.down = async function(knex) {
  // Restore the previous constraint without the new event types
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
