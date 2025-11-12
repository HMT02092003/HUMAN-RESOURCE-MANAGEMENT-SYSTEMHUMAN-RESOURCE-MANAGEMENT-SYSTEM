import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'c7c5f8d1a7b84e6a6c8b0f95c4b3e9a0f57e9d4a3c8a4b3d7e1f9b2c5d6e4f1';
const token = jwt.sign({ sub: 1, username: 'tester', permissions: [], roleId: 1 }, JWT_SECRET, { expiresIn: '1h' });

const BASE = process.env.JOB_SERVICE_BASE || 'http://localhost:4008/api';

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch (e) { json = text; }
  return { status: res.status, body: json };
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch (e) { json = text; }
  return { status: res.status, body: json };
}

async function run() {
  console.log('Base URL:', BASE);

  // 1) analyze-task
  console.log('\n1) analyze-task');
  const analyzePayload = { title: 'Implement auth', description: 'Add JWT-based authentication and refresh tokens' };
  console.log(await post('/projects/analyze-task', analyzePayload));

  // 2) find-candidates
  console.log('\n2) find-candidates');
  const findPayload = { required_skills: [], start_date: '2025-11-20', due_date: '2025-11-25' };
  console.log(await post('/projects/find-candidates', findPayload));

  // 3) create a temporary project, then create a task under it
  console.log('\n3) create project (temp)');
  const projResp = await post('/projects', { name: 'Temp Test Project', description: 'Created by test script', managerId: 1, startDate: '2025-11-01', endDate: '2026-11-01' });
  console.log('create project response:', projResp);
  const projectId = projResp.body?.project_id || projResp.body?.data?.project_id || (projResp.body?.project && projResp.body.project.project_id);

  if (!projectId) {
    console.error('Failed to create project; aborting task creation test');
    return;
  }

  console.log('\n4) create-task-with-analysis');
  const createPayload = {
    title: 'Integrate OAuth2',
    description: 'Integrate OAuth2 login flow',
    project_id: projectId,
    status: 'todo',
    assigned_to_user_id: 1,
    difficulty_level: 2,
    estimated_hours: 16,
    ai_analysis_result: JSON.stringify({ difficulty_level: 2, estimated_hours: 16, notes: 'Estimated by AI' }),
    required_skills: [],
    start_date: '2025-11-20',
    due_date: '2025-11-27'
  };

  console.log(await post('/projects/create-task-with-analysis', createPayload));

  // 5) Call other project/task related endpoints
  console.log('\n5) GET project tasks');
  console.log(await get(`/projects/${projectId}/tasks`));

  console.log('\n6) GET project task statistics');
  console.log(await get(`/projects/${projectId}/tasks/statistics`));

  console.log('\n7) GET project members');
  console.log(await get(`/projects/${projectId}/members`));

  console.log('\n8) GET project overview');
  console.log(await get(`/projects/${projectId}/overview`));

  console.log('\n9) GET project timeline');
  console.log(await get(`/projects/${projectId}/timeline`));

  console.log('\n10) GET my tasks');
  console.log(await get(`/tasks/my-tasks`));

  // 11) Update task status
  const createdTaskId = (await post('/projects/create-task-with-analysis', createPayload)).body?.task?.task_id;
  if (createdTaskId) {
    console.log('\n11) Update task status to in_progress');
    const upd = await post(`/projects/${projectId}/tasks/${createdTaskId}/status`, { status: 'in_progress' });
    console.log(upd);
  }

}

run().catch(e => { console.error('Test script error:', e); process.exit(1); });
