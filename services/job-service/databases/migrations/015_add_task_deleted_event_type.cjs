/**
 * Migration: Add task_deleted to project_timeline event_type enum
 */

exports.up = async function(knex) {
  // PostgreSQL: Add new value to enum
  await knex.raw(`
    ALTER TABLE project_timeline 
    DROP CONSTRAINT IF EXISTS project_timeline_event_type_check;
    
    ALTER TABLE project_timeline
    ADD CONSTRAINT project_timeline_event_type_check 
    CHECK (event_type IN (
      'created', 
      'updated', 
      'status_changed', 
      'member_added', 
      'member_removed', 
      'task_created',
      'task_assigned',
      'task_updated',
      'task_deleted',
      'task_completed',
      'milestone_reached',
      'budget_updated',
      'comment_added',
      'deleted',
      'manager_changed',
      'progress_updated'
    ));
  `);
  
  console.log('✅ Added task_deleted to event_type enum');
};

exports.down = async function(knex) {
  // Remove task_deleted from enum
  await knex.raw(`
    ALTER TABLE project_timeline 
    DROP CONSTRAINT IF EXISTS project_timeline_event_type_check;
    
    ALTER TABLE project_timeline
    ADD CONSTRAINT project_timeline_event_type_check 
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
