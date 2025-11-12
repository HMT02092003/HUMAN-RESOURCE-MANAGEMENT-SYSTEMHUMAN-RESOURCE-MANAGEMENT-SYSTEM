/**
 * ES module compatible migration file.
 * Up/Down are exported as ESM named exports so this file can be loaded when package.json has "type": "module".
 */
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
    // remove tags column from tasks if exists
    const hasTags = await knex.schema.hasColumn('tasks', 'tags');
    if (hasTags) {
        await knex.schema.table('tasks', table => {
            table.dropColumn('tags');
        });
    }

    // drop unused tables if they exist
    await knex.schema.dropTableIfExists('project_required_skills');
    await knex.schema.dropTableIfExists('project_suggestions');
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    // re-add tags column to tasks (string). Adjust type if needed.
    const hasTags = await knex.schema.hasColumn('tasks', 'tags');
    if (!hasTags) {
        await knex.schema.table('tasks', table => {
            table.string('tags');
        });
    }
    
    // recreate `project_required_skills` to match the original migration (005_create_job_required_skills_table.cjs)
    const hasReqSkills = await knex.schema.hasTable('project_required_skills');
    if (!hasReqSkills) {
        await knex.schema.createTable('project_required_skills', table => {
            table.integer('project_id').unsigned().notNullable().references('project_id').inTable('projects').onDelete('CASCADE');
            table.integer('skill_id').notNullable().references('skill_id').inTable('skills').onDelete('CASCADE');
            table.string('proficiency_level', 50);
            table.primary(['project_id', 'skill_id']);
        });
    }

    // recreate `project_suggestions` to match the original migration (006_create_job_suggestions_table.cjs)
    const hasSuggestion = await knex.schema.hasTable('project_suggestions');
    if (!hasSuggestion) {
        await knex.schema.createTable('project_suggestions', table => {
            table.uuid('suggestion_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            table.integer('project_id').unsigned().notNullable().references('project_id').inTable('projects').onDelete('CASCADE');
            table.integer('user_id').notNullable();
            table.decimal('match_score', 5, 2);
            table.enu('status', ['pending', 'viewed', 'applied', 'accepted', 'rejected']).defaultTo('pending');
            table.json('matched_skills').nullable();
            table.json('missing_skills').nullable();
            table.integer('skill_match_count').defaultTo(0);
            table.integer('total_required_skills').defaultTo(0);
            table.timestamp('generated_at', { useTz: true }).defaultTo(knex.fn.now());

            table.index('project_id');
            table.index('user_id');
            table.index('status');
            table.index('match_score');
        });
    }
}
