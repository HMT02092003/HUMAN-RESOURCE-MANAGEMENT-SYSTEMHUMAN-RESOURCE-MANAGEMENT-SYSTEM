import axios from 'axios';

/**
 * Notification Service Helper
 * Gửi thông báo qua notification-service
 */

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://127.0.0.1:4009';

/**
 * Gửi thông báo đến các thành viên trong dự án
 */
export async function notifyProjectMembers(
  projectId: number,
  excludeUserId: number | null,
  notification: {
    title: string;
    content: string;
    type: string;
    data?: any;
  },
  // Optional headers from the current request (gateway will have x-user-data, Authorization)
  forwardedHeaders?: Record<string, any>
): Promise<void> {
  try {
    // Import ProjectMemberModel dynamically để tránh circular dependency
    const { ProjectMemberModel } = await import('../Models/ProjectMemberModel.ts');
    const { default: ProjectModel } = await import('../Models/ProjectModel.ts');
    
    // Lấy project info để biết manager_id
    const project = await ProjectModel.query()
      .findById(projectId)
      .select('manager_id');
    
    // Lấy tất cả thành viên trong dự án
    const members = await ProjectMemberModel.query()
      .where('project_id', projectId)
      .select('user_id');

    // Lọc bỏ user hiện tại (người tạo/cập nhật) nếu có
    let userIds = members.map(m => m.user_id);
    
    // ✅ Thêm project manager vào danh sách nhận notification (nếu chưa có trong members)
    if (project?.manager_id && !userIds.includes(project.manager_id)) {
      userIds.push(project.manager_id);
      console.log(`[Notification Helper] Added project manager (${project.manager_id}) to recipients`);
    }
    
    if (excludeUserId) {
      userIds = userIds.filter(id => id !== excludeUserId);
    }

    // Nếu không có thành viên nào để thông báo
    if (userIds.length === 0) {
      console.log('[Notification Helper] No members to notify');
      return;
    }

    console.log(`[Notification Helper] Notifying ${userIds.length} members in project ${projectId}`);
    console.log(`[Notification Helper] User IDs to notify: ${JSON.stringify(userIds)}`);

    // Gọi notification service
    await axios.post(`${NOTIFICATION_SERVICE_URL}/internal/send`, {
      userIds,
      title: notification.title,
      content: notification.content,
      type: notification.type,
      data: {
        project_id: projectId,
        ...notification.data
      }
    }, {
      timeout: 5000, // 5s timeout
      headers: {
        // Forward Authorization and x-user-data/x-user-id when available
        ...(forwardedHeaders?.authorization ? { Authorization: String(forwardedHeaders.authorization) } : {}),
        ...(forwardedHeaders?.['x-user-data'] ? { 'x-user-data': String(forwardedHeaders['x-user-data']) } : {}),
        ...(forwardedHeaders?.['x-user-id'] ? { 'x-user-id': String(forwardedHeaders['x-user-id']) } : {}),
      }
    });

    console.log(`[Notification Helper] Successfully sent notification to ${userIds.length} users`);
  } catch (error: any) {
    // Không throw error để không fail luồng chính
    console.error('[Notification Helper] Failed to send notification:', error.message);
  }
}

/**
 * Gửi thông báo đến 1 user cụ thể
 */
export async function notifyUser(
  userId: number,
  notification: {
    title: string;
    content: string;
    type: string;
    data?: any;
  }
  , forwardedHeaders?: Record<string, any>
): Promise<void> {
  try {
    console.log(`[Notification Helper] Notifying user ${userId}`);

    await axios.post(`${NOTIFICATION_SERVICE_URL}/internal/send`, {
      userIds: [userId],
      title: notification.title,
      content: notification.content,
      type: notification.type,
      data: notification.data
    }, {
      timeout: 5000,
      headers: {
        ...(forwardedHeaders?.authorization ? { Authorization: String(forwardedHeaders.authorization) } : {}),
        ...(forwardedHeaders?.['x-user-data'] ? { 'x-user-data': String(forwardedHeaders['x-user-data']) } : {}),
        ...(forwardedHeaders?.['x-user-id'] ? { 'x-user-id': String(forwardedHeaders['x-user-id']) } : {}),
      }
    });

    console.log(`[Notification Helper] Successfully sent notification to user ${userId}`);
  } catch (error: any) {
    console.error('[Notification Helper] Failed to send notification:', error.message);
  }
}
