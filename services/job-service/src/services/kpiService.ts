import dayjs from 'dayjs';
import { UserKpiModel } from '../Models/UserKpiModel.ts';
import { TaskModel } from '../Models/TaskModel.ts';
import knex from '../lib/database.ts';
import CheckScopeService from '../integrations/CheckScopeService.ts';

UserKpiModel.knex(knex);
TaskModel.knex(knex);

/**
 * Interface cho KPI record khi task được approve
 */
export interface TaskKpiRecord {
  user_id: number;
  project_id: number;
  task_id: string;
  month: number;
  year: number;
  completion_status: 'early' | 'on_time' | 'late';
  delay_days: number | null;
  completed_at: string;
  due_date: string | null;
  approved_at: string;
  approved_by: number;
}

/**
 * Interface cho tổng hợp KPI của user theo tháng/năm
 */
export interface UserKpiSummary {
  user_id: number;
  user_name?: string;
  month: number;
  year: number;
  total_tasks: number;
  early_tasks: number;
  on_time_tasks: number;
  late_tasks: number;
  kpi_score: number;
  kpi_grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  avg_delay_days: number | null;
}

/**
 * Interface cho KPI chi tiết theo dự án
 */
export interface UserProjectKpiSummary extends UserKpiSummary {
  project_id: number;
  project_name?: string;
}

/**
 * Lưu KPI record khi task được approve
 * Hàm này sẽ được gọi từ approveTask controller
 */
export async function saveTaskKpiRecord(
  task: TaskModel,
  approvedBy: number
): Promise<UserKpiModel | null> {
  try {
    // Debug: log key task fields to diagnose missing data
    console.log('[KPI] saveTaskKpiRecord input:', JSON.stringify({
      task_id: task?.task_id,
      assignee_id: task?.assignee_id,
      project_id: task?.project_id,
      completed_at: task?.completed_at,
      due_date: task?.due_date,
      status: task?.status
    }));

    // Validate required fields
    if (!task.assignee_id || !task.project_id || !task.task_id) {
      console.warn('[KPI] Task missing required fields for KPI tracking:', {
        task_id: task?.task_id,
        assignee_id: task?.assignee_id,
        project_id: task?.project_id
      });
      return null;
    }

    // Check if already exists (prevent duplicate)
    const existing = await UserKpiModel.query()
      .where('task_id', task.task_id)
      .first();

    if (existing) {
      console.log(`[KPI] Task ${task.task_id} already has KPI record, skipping`);
      return existing;
    }

    const completedAt = task.completed_at ? dayjs(task.completed_at) : dayjs();
    const approvedAt = dayjs();
    const dueDate = task.due_date ? dayjs(task.due_date) : null;

    // Calculate completion status and delay days
    let completionStatus: 'early' | 'on_time' | 'late' = 'on_time';
    let delayDays: number | null = null;

    if (dueDate) {
      // Calculate delay: positive = late, negative = early
      delayDays = Math.round(completedAt.diff(dueDate, 'day', true));
      
      if (delayDays < 0) {
        completionStatus = 'early'; // Hoàn thành sớm
      } else if (delayDays === 0) {
        completionStatus = 'on_time'; // Đúng hạn
      } else {
        completionStatus = 'late'; // Chậm
      }
    } else {
      // No due date => consider on_time
      completionStatus = 'on_time';
      delayDays = 0;
    }

    const month = completedAt.month() + 1; // 1-12
    const year = completedAt.year();

    const kpiRecord: TaskKpiRecord = {
      user_id: task.assignee_id,
      project_id: task.project_id,
      task_id: task.task_id,
      month,
      year,
      completion_status: completionStatus,
      delay_days: delayDays,
      completed_at: completedAt.toISOString(),
      due_date: dueDate ? dueDate.toISOString() : null,
      approved_at: approvedAt.toISOString(),
      approved_by: approvedBy
    };

    console.log('[KPI] Saving task KPI record:', {
      task_id: task.task_id,
      user_id: task.assignee_id,
      project_id: task.project_id,
      completion_status: completionStatus,
      delay_days: delayDays,
      month,
      year
    });

    const saved = await UserKpiModel.query().insertAndFetch(kpiRecord as any);
    console.log(`[KPI] ✅ Saved KPI record ${saved.kpi_id} for task ${task.task_id}`);
    
    return saved;
  } catch (error: any) {
    console.error('[KPI] Error saving task KPI record:', error);
    return null;
  }
}

/**
 * Tính KPI grade dựa trên số task vượt tiến độ và chậm tiến độ
 * A: 10 early tasks hoặc hơn
 * B: 7-9 early tasks
 * C: 4-6 early tasks hoặc cân bằng
 * D: 1-3 late tasks
 * E: 4-6 late tasks
 * F: 7 late tasks trở lên
 */
function calculateKpiGrade(earlyTasks: number, lateTasks: number): 'A' | 'B' | 'C' | 'D' | 'E' | 'F' {
  const net = earlyTasks - lateTasks;
  
  if (net >= 10) return 'A';
  if (net >= 7) return 'B';
  if (net >= 4) return 'C';
  if (net >= 1) return 'C';
  if (net >= -3) return 'D';
  if (net >= -6) return 'E';
  return 'F';
}

/**
 * Tính KPI score (0-100)
 * Score = (early_tasks * 2 + on_time_tasks) / total_tasks * 100
 */
function calculateKpiScore(earlyTasks: number, onTimeTasks: number, lateTasks: number): number {
  const total = earlyTasks + onTimeTasks + lateTasks;
  if (total === 0) return 0;
  
  // Early tasks worth 2 points, on_time worth 1 point, late worth 0
  const score = ((earlyTasks * 2 + onTimeTasks) / (total * 2)) * 100;
  return Math.round(score * 100) / 100;
}

/**
 * Lấy KPI tổng hợp của user theo tháng/năm (tất cả dự án)
 */
export async function getUserKpiSummary(
  userId: number,
  month: number,
  year: number
): Promise<UserKpiSummary> {
  const records = await UserKpiModel.query()
    .where('user_id', userId)
    .where('month', month)
    .where('year', year);

  const totalTasks = records.length;
  const earlyTasks = records.filter(r => r.completion_status === 'early').length;
  const onTimeTasks = records.filter(r => r.completion_status === 'on_time').length;
  const lateTasks = records.filter(r => r.completion_status === 'late').length;

  const delayDaysArray = records
    .filter(r => r.delay_days !== null)
    .map(r => r.delay_days as number);
  
  const avgDelayDays = delayDaysArray.length > 0
    ? Math.round((delayDaysArray.reduce((sum, d) => sum + d, 0) / delayDaysArray.length) * 100) / 100
    : null;

  const kpiScore = calculateKpiScore(earlyTasks, onTimeTasks, lateTasks);
  const kpiGrade = calculateKpiGrade(earlyTasks, lateTasks);

  return {
    user_id: userId,
    month,
    year,
    total_tasks: totalTasks,
    early_tasks: earlyTasks,
    on_time_tasks: onTimeTasks,
    late_tasks: lateTasks,
    kpi_score: kpiScore,
    kpi_grade: kpiGrade,
    avg_delay_days: avgDelayDays
  };
}

/**
 * Lấy KPI chi tiết của user theo từng dự án trong tháng/năm
 */
export async function getUserProjectKpiDetails(
  userId: number,
  month: number,
  year: number
): Promise<UserProjectKpiSummary[]> {
  const records = await UserKpiModel.query()
    .where('user_id', userId)
    .where('month', month)
    .where('year', year);

  // Group by project_id
  const projectGroups = records.reduce((acc, record) => {
    const pid = record.project_id;
    if (!acc[pid]) acc[pid] = [];
    acc[pid].push(record);
    return acc;
  }, {} as Record<number, UserKpiModel[]>);

  const results: UserProjectKpiSummary[] = [];

  for (const projectId in projectGroups) {
    const projectRecords = projectGroups[projectId];
    const totalTasks = projectRecords.length;
    const earlyTasks = projectRecords.filter(r => r.completion_status === 'early').length;
    const onTimeTasks = projectRecords.filter(r => r.completion_status === 'on_time').length;
    const lateTasks = projectRecords.filter(r => r.completion_status === 'late').length;

    const delayDaysArray = projectRecords
      .filter(r => r.delay_days !== null)
      .map(r => r.delay_days as number);
    
    const avgDelayDays = delayDaysArray.length > 0
      ? Math.round((delayDaysArray.reduce((sum, d) => sum + d, 0) / delayDaysArray.length) * 100) / 100
      : null;

    const kpiScore = calculateKpiScore(earlyTasks, onTimeTasks, lateTasks);
    const kpiGrade = calculateKpiGrade(earlyTasks, lateTasks);

    results.push({
      user_id: userId,
      project_id: Number(projectId),
      month,
      year,
      total_tasks: totalTasks,
      early_tasks: earlyTasks,
      on_time_tasks: onTimeTasks,
      late_tasks: lateTasks,
      kpi_score: kpiScore,
      kpi_grade: kpiGrade,
      avg_delay_days: avgDelayDays
    });
  }

  return results;
}

/**
 * Lấy KPI của tất cả users trong scope (theo manager/department)
 * Dùng cho màn "Quản lý KPI nhân viên"
 */
export async function getAllUsersKpiInScope(
  currentUserId: number,
  month: number,
  year: number,
  token: string,
  userData?: any
): Promise<UserKpiSummary[]> {
  try {
    console.log(`\n[KPI] ==================== GET ALL USERS KPI IN SCOPE ====================`);
    console.log(`[KPI] Input params - currentUserId: ${currentUserId}, month: ${month}, year: ${year}`);
    console.log(`[KPI] Token (first 50 chars):`, token ? token.substring(0, 50) : '<no-token>');
    
    // Step 1: Check scope through auth service
    console.log(`[KPI] Step 1: Checking scope with permissionKey='kpiManagement'...`);
    const scopeResult = await CheckScopeService.checkUserScope('kpiManagement', token, userData);
    
    console.log(`[KPI] Scope check result:`, JSON.stringify({
      hasAccess: scopeResult.hasAccess,
      scope: scopeResult.scope,
      userIdsCount: scopeResult.userIds?.length || 0,
      userIds: scopeResult.userIds
    }, null, 2));

    if (!scopeResult.hasAccess) {
      console.warn('[KPI] ⚠️ User does not have access to KPI data');
      return [];
    }

    const userIds = scopeResult.userIds || [];
    
    if (userIds.length === 0) {
      console.log('[KPI] ⚠️ No users in scope, returning empty array');
      return [];
    }

    // Step 2: Get all KPI records for the month/year  
    console.log(`[KPI] Step 2: Fetching KPI records for ${userIds.length} users in month ${month}, year ${year}`);
    console.log(`[KPI] SQL Query: SELECT * FROM user_kpi WHERE user_id IN (${userIds.join(',')}) AND month=${month} AND year=${year}`);
    
    const allKpiRecords = await UserKpiModel.query()
      .whereIn('user_id', userIds)
      .where('month', month)
      .where('year', year);

    console.log(`[KPI] ✅ Found ${allKpiRecords.length} KPI records in database`);
    
    // Log sample records
    if (allKpiRecords.length > 0) {
      console.log(`[KPI] Sample KPI records (first 3):`, allKpiRecords.slice(0, 3).map(r => ({
        kpi_id: r.kpi_id,
        user_id: r.user_id,
        task_id: r.task_id,
        completion_status: r.completion_status,
        delay_days: r.delay_days
      })));
    }

    // Step 3: Group by user_id and calculate summary
    const userKpiMap = new Map<number, UserKpiModel[]>();
    allKpiRecords.forEach(record => {
      if (!userKpiMap.has(record.user_id)) {
        userKpiMap.set(record.user_id, []);
      }
      userKpiMap.get(record.user_id)!.push(record);
    });

    console.log(`[KPI] Step 3: KPI records grouped by ${userKpiMap.size} users`);
    console.log(`[KPI] Users with KPI data:`, Array.from(userKpiMap.keys()));

    // Step 4: Get user info for users that have KPI data
    const userIdsWithData = Array.from(userKpiMap.keys());
    
    if (userIdsWithData.length === 0) {
      console.log('[KPI] ⚠️ No users have KPI data for this period');
      return [];
    }

    console.log(`[KPI] Step 4: Fetching user details for ${userIdsWithData.length} users with KPI data`);
    const users = await CheckScopeService.getUsersByIds(userIdsWithData);
    
    console.log(`[KPI] ✅ Fetched ${users.length} user details from auth service`);
    if (users.length > 0) {
      console.log(`[KPI] Sample users (first 2):`, users.slice(0, 2).map((u: any) => ({
        id: u.id,
        fullName: u.fullName || u.full_name,
        email: u.email
      })));
    }

    // Step 5: Calculate KPI summary for each user
    console.log(`[KPI] Step 5: Calculating KPI summaries...`);
    const kpiResults: UserKpiSummary[] = [];
    
    for (const userId of userIdsWithData) {
      const records = userKpiMap.get(userId) || [];
      const user = users.find((u: any) => u.id === userId);
      
      const totalTasks = records.length;
      const earlyTasks = records.filter(r => r.completion_status === 'early').length;
      const onTimeTasks = records.filter(r => r.completion_status === 'on_time').length;
      const lateTasks = records.filter(r => r.completion_status === 'late').length;

      const delayDaysArray = records
        .filter(r => r.delay_days !== null)
        .map(r => r.delay_days as number);
      
      const avgDelayDays = delayDaysArray.length > 0
        ? Math.round((delayDaysArray.reduce((sum, d) => sum + d, 0) / delayDaysArray.length) * 100) / 100
        : null;

      const kpiScore = calculateKpiScore(earlyTasks, onTimeTasks, lateTasks);
      const kpiGrade = calculateKpiGrade(earlyTasks, lateTasks);

      console.log(`[KPI] User ${userId} (${user?.fullName || user?.full_name}):`, {
        total: totalTasks,
        early: earlyTasks,
        on_time: onTimeTasks,
        late: lateTasks,
        score: kpiScore,
        grade: kpiGrade
      });

      kpiResults.push({
        user_id: userId,
        user_name: user?.fullName || user?.full_name || user?.name || `User ${userId}`,
        month,
        year,
        total_tasks: totalTasks,
        early_tasks: earlyTasks,
        on_time_tasks: onTimeTasks,
        late_tasks: lateTasks,
        kpi_score: kpiScore,
        kpi_grade: kpiGrade,
        avg_delay_days: avgDelayDays
      });
    }
    
    // Sort by KPI score descending
    kpiResults.sort((a: UserKpiSummary, b: UserKpiSummary) => b.kpi_score - a.kpi_score);

    console.log(`[KPI] ✅ Returning ${kpiResults.length} KPI summaries`);
    console.log(`[KPI] ====================================================================\n`);
    return kpiResults;
  } catch (error: any) {
    console.error('[KPI] Error getting users KPI in scope:', error);
    throw error;
  }
}

/**
 * Xóa KPI record khi task bị reject hoặc xóa (optional)
 */
export async function deleteTaskKpiRecord(taskId: string): Promise<boolean> {
  try {
    const deleted = await UserKpiModel.query()
      .where('task_id', taskId)
      .delete();
    
    if (deleted > 0) {
      console.log(`[KPI] Deleted KPI record for task ${taskId}`);
      return true;
    }
    
    return false;
  } catch (error: any) {
    console.error('[KPI] Error deleting task KPI record:', error);
    return false;
  }
}

export default {
  saveTaskKpiRecord,
  getUserKpiSummary,
  getUserProjectKpiDetails,
  getAllUsersKpiInScope,
  deleteTaskKpiRecord
};
