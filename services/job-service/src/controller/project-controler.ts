import e, { Request, Response, RequestHandler } from 'express';
import dayjs from 'dayjs';
import knex from '../lib/database.ts';
import { SkillModel } from '../Models/SkillModel.ts';
import { validate, ValidationException } from '../ulitis/validation-utility.ts';
import { remove } from 'lodash';
import ProjectModel from '../Models/ProjectModel.ts';
import ProjectMemberModel from '../Models/ProjectMemberModel.ts';
import ProjectTimelineModel from '../Models/ProjectTimelineModel.ts';
import ProjectRequiredSkillModel from '../Models/ProjectRequiredSkillModel.ts';
import ProjectSuggestionModel from '../Models/ProjectSuggestionModel.ts';
import AuthService from '../integrations/AuthService.ts';
import { TaskModel } from '../Models/TaskModel.ts';
import { analyzeJobWithAI, JobAnalysisResult } from '../services/geminiService.ts';
import { findMatchingCandidates, CandidateMatch } from '../services/candidateMatchingService.ts';
import { findOrCreateNormalizedSkill } from '../services/geminiService.ts';
import { generateUniqueTaskId } from '../ulitis/id-generator.ts';
import { transaction } from 'objection';
import { Metadata } from 'pdf-parse';
import { assessWorkload } from '../services/geminiService.ts';
import { analyzeTaskTimeline, validateTaskDependencies } from '../services/geminiService.ts';


SkillModel.knex(knex);
ProjectModel.knex(knex);
ProjectMemberModel.knex(knex);
ProjectTimelineModel.knex(knex);
ProjectRequiredSkillModel.knex(knex);
ProjectSuggestionModel.knex(knex);
TaskModel.knex(knex);



export class ProjectController {
    static createProject: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            let allowFields = {
                budget: 'number',
                customer: 'string',
                description: 'string',
                managerId: 'number',
                name: 'string',
                status: 'string',
                startDate: 'string',
                endDate: 'string',
                members: 'array'
            };

            let params: any = validate(req.body, allowFields);

            const _start = params.dateRange ? params.dateRange[0] : params.startDate;
            const _end = params.dateRange ? params.dateRange[1] : params.endDate;

            const projectData = {
                ...params,
                // project jsonSchema expects dates in 'date' format (YYYY-MM-DD)
                start_date: _start ? dayjs(_start).format('YYYY-MM-DD') : null,
                end_date: _end ? dayjs(_end).format('YYYY-MM-DD') : null,
                spent: (() => {
                    if (!_start || !_end) return null;
                    const start = dayjs(_start);
                    const end = dayjs(_end);
                    if (!start.isValid() || !end.isValid()) return null;
                    const diffDays = end.diff(start, 'day'); // ngày kết thúc trừ ngày bắt đầu
                    return diffDays < 0 ? null : diffDays;
                })(),
                progress: 0,
            };

            // ensure DB column names match jsonSchema: use snake_case keys
            if (projectData.managerId !== undefined) {
                projectData.manager_id = projectData.managerId;
                delete projectData.managerId;
            }

            delete projectData.dateRange;


            const newProject = await knex.transaction(async (trx) => {
                // remove relational data and camelCase date fields before inserting into projects table
                const projectInsert = { ...projectData } as any;

                delete projectInsert.members;
                delete projectInsert.startDate;  // DB uses start_date (snake_case)
                delete projectInsert.endDate;    // DB uses end_date (snake_case)

                // Ensure project_id is numeric; if a non-numeric string (e.g. PRJ...) was provided,
                // remove it so the DB can assign an auto-increment integer primary key.
                if (projectInsert.project_id !== undefined) {
                    const pid = Number(projectInsert.project_id);
                    if (Number.isNaN(pid)) {
                        // invalid non-numeric project_id provided by client -> let DB assign
                        delete projectInsert.project_id;
                    } else {
                        projectInsert.project_id = pid;
                    }
                }

                const createdProject = await ProjectModel.query(trx).insertAndFetch(projectInsert as any);

                if (!createdProject || !createdProject.project_id) {
                    throw new Error('Created project missing project_id after insert');
                }

                if (Array.isArray(projectData.members) && projectData.members.length) {
                    const toInsert: any[] = [];
                    for (const member of projectData.members) {
                        // frontend sends members as { id, role }
                        const user_id = member.id ?? member.user_id;
                        if (!user_id) {
                            console.warn('Skipping invalid member without id:', member);
                            continue;
                        }

                        toInsert.push({
                            project_id: createdProject.project_id,
                            user_id,
                            role: member.role || null,
                            joined_at: dayjs().toISOString()
                        });
                    }

                    if (toInsert.length) {
                        // validate toInsert entries have required keys before inserting
                        const invalid = toInsert.filter(t => !t.project_id || !t.user_id);
                        if (invalid.length) {
                            console.error('Invalid project_members entries, aborting insert:', invalid);
                            throw new Error('Invalid project_members entries: missing project_id or user_id');
                        }

                        await ProjectMemberModel.query(trx).insert(toInsert);

                        // Add timeline events for each member added on project creation
                        try {
                            const memberEvents = toInsert.map(t => ({
                                project_id: t.project_id,
                                event_type: 'member_added',
                                title: 'Thêm thành viên',
                                description: `User ${t.user_id} được thêm vào dự án.`,
                                user_id: projectData.manager_id || null,
                                event_time: dayjs().toISOString(),
                                metadata: { user_id: t.user_id }
                            }));

                            if (memberEvents.length) {
                                await ProjectTimelineModel.query(trx).insert(memberEvents as any);
                            }
                        } catch (e) {
                            // timeline insert should not block project creation; log and continue
                            console.warn('Failed to write member_added timeline events for project creation:', e);
                        }
                    }
                }

                await ProjectTimelineModel.query(trx).insert(
                    {
                        project_id: createdProject.project_id,
                        event_type: 'created',
                        title: 'Dự án được tạo',
                        description: `Dự án "${createdProject.name}" đã được tạo.`,
                        user_id: projectData.manager_id,
                        event_time: dayjs().toISOString()
                    }
                );

                return createdProject;
            });

            res.status(201).json({ success: true, data: newProject });
        } catch (error) {
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    };

    static getAllProjectsByScope: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            // 1. Parse page/pageSize (giữ nguyên)
            const page = Number(req.query.page) || 0;
            const pageSize = Number(req.query.pageSize) || 10;

            // 2. Auth (giữ nguyên)
            const headerAuth = (req.headers.authorization as string) || null;
            const cookieToken = (req as any).cookies?.token;
            const authHeader = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : null);

            if (!authHeader) {
                res.status(401).json({ success: false, message: 'No token provided' });
                return;
            }

            // 3. Check scope (giữ nguyên)
            const scopeResult = await AuthService.checkUserScope('projects', authHeader);
            console.log("checkScope result:", scopeResult);

            // 4. Normalize userIds (giữ nguyên)
            const allowedUserIds: number[] = (scopeResult?.userIds || [])
                .map((id: any) => Number(id))
                .filter((n: number) => !Number.isNaN(n));

            // 5. Error/Empty checks (giữ nguyên)
            if (!scopeResult?.hasAccess) {
                res.status(403).json({ success: false, message: 'Forbidden' });
                return;
            }

            // 6. Sửa lỗi Logic dùng đúng 'project_id'

            // 6a. Xây dựng truy vấn CƠ SỞ (Base Query)
            const baseQuery = ProjectModel.query()
                .where(builder => {
                    builder.whereIn('manager_id', allowedUserIds)
                        .orWhereExists(
                            ProjectMemberModel.query()
                                .whereIn('user_id', allowedUserIds)
                                .whereRaw('project_members.project_id = projects.project_id')
                        );
                });

            // 6b. Truy vấn 1: Lấy tổng số lượng (total) VÀ ID của trang hiện tại
            const pagedData = await baseQuery.clone()
                // SỬA LỖI 5: Thêm 'created_at' vào select và distinct
                .select('projects.project_id', 'projects.created_at')
                .distinct('projects.project_id', 'projects.created_at')
                .orderBy('projects.created_at', 'desc') // Giờ đã hợp lệ
                .page(page, pageSize);

            if (pagedData.results.length === 0) {
                res.status(200).json({
                    success: true,
                    data: {
                        results: [],
                        total: pagedData.total
                    },
                    scope: scopeResult.scope
                });
                return;
            }

            // Lấy mảng các ID (vẫn map 'project_id' như cũ)
            const projectIds = pagedData.results.map(p => p.project_id);

            // 6c. Truy vấn 2: Lấy đầy đủ dữ liệu
            const projects = await ProjectModel.query()
                .whereIn('project_id', projectIds)
                .withGraphFetched('[members, timeline]')
                // Sắp xếp lại ở đây để đảm bảo thứ tự
                .orderBy('created_at', 'desc');

            let users: any[] = [];
            try {
                users = await AuthService.getUsersByIds(allowedUserIds, authHeader);
            } catch (err: any) {
                console.error('Error calling auth service user-bulk:', err?.message || err);
                // return an upstream error to the client so the request doesn't hang silently
                res.status(502).json({ success: false, message: 'Failed to fetch users from auth service', error: err?.message || err });
                return;
            }


            // Build map by numeric id
            const userMap = new Map<number, any>(users.map(u => [Number(u.id ?? u.userId ?? u.user_id), u]));
            console.log("userMap", userMap);

            // Ensure we mutate plain JS objects (Objection instances -> toJSON)
            const plainProjects = projects.map(p => (typeof (p as any).toJSON === 'function' ? (p as any).toJSON() : { ...p }));

            for (const p of plainProjects) {
                // replace manager_id with user object (or null if missing)
                p.manager_id = userMap.get(Number(p.manager_id)) ?? null;

                // replace member user_ids with user objects
                if (Array.isArray(p.members)) {
                    for (const member of p.members) {
                        member.user_id = userMap.get(Number(member.user_id)) ?? null;
                    }
                }

                // replace timeline user_ids as well (if present)
                if (Array.isArray(p.timeline)) {
                    for (const ev of p.timeline) {
                        ev.user_id = userMap.get(Number(ev.user_id)) ?? null;
                    }
                }
            }

            const responseData = {
                results: plainProjects,
                total: pagedData.total
            };

            res.status(200).json({ success: true, data: responseData, scope: scopeResult.scope });

        } catch (error) {
            console.error("Error in getAllProjectsByScope:", error);
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    };

    static deleteProject: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            // Support both single-delete (/:id) and bulk delete (body.ids)
            let ids: number[] = [];
            if (Array.isArray(req.body?.ids) && req.body.ids.length) {
                ids = req.body.ids.map((v: any) => Number(v)).filter((n: number) => !Number.isNaN(n));
            }

            if (!ids.length) {
                res.status(400).json({ success: false, message: 'No project IDs provided for deletion' });
                return;
            }

            await knex.transaction(async (trx) => {
                // Insert a 'deleted' timeline event for each project id (best-effort)
                try {
                    const actorId = (req as any).user?.id || null;
                    const delEvents = ids.map((pid: number) => ({
                        project_id: pid,
                        event_type: 'deleted',
                        title: 'Dự án bị xóa',
                        description: `Dự án ${pid} đã bị xóa.`,
                        user_id: actorId,
                        event_time: dayjs().toISOString()
                    }));

                    if (delEvents.length) {
                        await ProjectTimelineModel.query(trx).insert(delEvents as any);
                    }
                } catch (e) {
                    console.warn('Failed to write deleted timeline events before project deletion:', e);
                }
                // Delete child rows first to avoid FK constraint issues, then delete projects
                await ProjectMemberModel.query(trx).delete().whereIn('project_id', ids as any);
                await ProjectTimelineModel.query(trx).delete().whereIn('project_id', ids as any);
                await ProjectModel.query(trx).delete().whereIn('project_id', ids as any);
            });

            res.status(200).json({ success: true, message: 'Project(s) deleted successfully' });
        } catch (error) {
            console.error("Error in deleteProject:", error);
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    };

    static getProjectById: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const idNum = Number(id);
            if (Number.isNaN(idNum)) {
                res.status(400).json({ success: false, message: 'Invalid project id' });
                return;
            }

            // Fetch project with members and timeline (use numeric id)
            const project = await ProjectModel.query()
                .findById(idNum)
                .withGraphFetched('[members, timeline]');

            if (!project) {
                res.status(404).json({ success: false, message: 'Project not found' });
                return;
            }

            // Collect user IDs to fetch from auth service
            const userIdsSet = new Set<number>();
            if (project.manager_id) userIdsSet.add(Number(project.manager_id));

            if (Array.isArray((project as any).members)) {
                (project as any).members.forEach((m: any) => {
                    if (m.user_id) userIdsSet.add(Number(m.user_id));
                });
            }

            if (Array.isArray((project as any).timeline)) {
                (project as any).timeline.forEach((ev: any) => {
                    if (ev.user_id) userIdsSet.add(Number(ev.user_id));
                });
            }

            const userIds = Array.from(userIdsSet).filter(Boolean);

            // Fetch users from auth service
            const headerAuth = (req.headers.authorization as string) || null;
            const cookieToken = (req as any).cookies?.token;
            const authHeader = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : null);

            let userBulkData: any[] = [];
            if (userIds.length && authHeader) {
                try {
                    userBulkData = await AuthService.getUsersByIds(userIds, authHeader);
                } catch (err: any) {
                    console.error('Error fetching users from auth service for project.getById:', err?.message || err);
                }
            }

            const userMap = new Map<number, any>(
                userBulkData.map((u: any) => [Number(u.id ?? u.user_id ?? u.userId), u])
            );

            // Enrich project with user objects
            const projectJson: any = typeof (project as any).toJSON === 'function'
                ? (project as any).toJSON()
                : { ...project };

            projectJson.manager_id = userMap.get(Number(projectJson.manager_id)) ?? null;

            if (Array.isArray(projectJson.members)) {
                projectJson.members.forEach((m: any) => {
                    m.user_id = userMap.get(Number(m.user_id)) ?? null;
                });
            }

            if (Array.isArray(projectJson.timeline)) {
                projectJson.timeline.forEach((ev: any) => {
                    ev.user_id = userMap.get(Number(ev.user_id)) ?? null;
                });
            }

            res.status(200).json({ success: true, data: projectJson });
        } catch (error) {
            console.error("Error in getProjectById:", error);
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    };

    static updateProject: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const idNum = Number(id);
            if (Number.isNaN(idNum)) {
                res.status(400).json({ success: false, message: 'Invalid project id' });
                return;
            }

            const allowFields = {
                name: 'string',
                description: 'string',
                status: 'string',
                budget: 'number',
                customer: 'string',
                managerId: 'number',
                startDate: 'string',
                endDate: 'string',
                progress: 'number',
                // members should be an array of member objects
                members: [
                    {
                        user_id: 'number',
                        id: 'number',
                        role: 'string'
                    }
                ]
            };

            let params: any = validate(req.body, allowFields);

            const trx = await knex.transaction();

            try {
                // Build update data
                const updateData: any = {};
                if (params.name !== undefined) updateData.name = params.name;
                if (params.description !== undefined) updateData.description = params.description;
                if (params.status !== undefined) updateData.status = params.status;
                if (params.budget !== undefined) updateData.budget = params.budget;
                if (params.customer !== undefined) updateData.customer = params.customer;
                if (params.progress !== undefined) updateData.progress = params.progress;

                if (params.managerId !== undefined) {
                    updateData.manager_id = params.managerId;
                }

                // Handle dates
                const _start = params.dateRange ? params.dateRange[0] : params.startDate;
                const _end = params.dateRange ? params.dateRange[1] : params.endDate;

                if (_start) updateData.start_date = dayjs(_start).format('YYYY-MM-DD');
                if (_end) updateData.end_date = dayjs(_end).format('YYYY-MM-DD');

                // Fetch current project state so we can record diffs in timeline
                const projectBefore = await ProjectModel.query(trx).findById(idNum).select('manager_id', 'progress', 'status', 'name');

                // Update project
                const updatedProject = await ProjectModel.query(trx)
                    .patchAndFetchById(idNum, updateData);

                if (!updatedProject) {
                    await trx.rollback();
                    res.status(404).json({ success: false, message: 'Project not found' });
                    return;
                }

                // Update members if provided
                if (Array.isArray(params.members)) {
                    // Read existing members first so we can record additions/removals
                    const existingMembers = await ProjectMemberModel.query(trx)
                        .where('project_id', idNum)
                        .select('user_id');

                    const existingIds = existingMembers.map((m: any) => Number(m.user_id));
                    const newIds = params.members
                        .map((member: any) => Number(member.id ?? member.user_id))
                        .filter((n: number) => !Number.isNaN(n));

                    const removedIds = existingIds.filter((id: number) => !newIds.includes(id));
                    const addedIds = newIds.filter((id: number) => !existingIds.includes(id));

                    // Delete existing members
                    await ProjectMemberModel.query(trx).delete().where('project_id', idNum);

                    // Insert new members
                    const toInsert: any[] = [];
                    for (const member of params.members) {
                        const user_id = member.id ?? member.user_id;
                        if (!user_id) continue;

                        toInsert.push({
                            project_id: idNum,
                            user_id: Number(user_id),
                            role: member.role || null,
                            joined_at: dayjs().toISOString()
                        });
                    }

                    if (toInsert.length) {
                        await ProjectMemberModel.query(trx).insert(toInsert);
                    }

                    // Write timeline events for added/removed members
                    try {
                        const actorId = params.managerId !== undefined ? Number(params.managerId) : ((req as any).user?.id || null);
                        const events: any[] = [];

                        for (const uid of addedIds) {
                            events.push({
                                project_id: idNum,
                                event_type: 'member_added',
                                title: 'Thêm thành viên',
                                description: `User ${uid} được thêm vào dự án.`,
                                user_id: actorId,
                                event_time: dayjs().toISOString(),
                                metadata: { user_id: uid }
                            });
                        }

                        for (const uid of removedIds) {
                            events.push({
                                project_id: idNum,
                                event_type: 'member_removed',
                                title: 'Xóa thành viên',
                                description: `User ${uid} đã bị xóa khỏi dự án.`,
                                user_id: actorId,
                                event_time: dayjs().toISOString(),
                                metadata: { user_id: uid }
                            });
                        }

                        if (events.length) {
                            await ProjectTimelineModel.query(trx).insert(events as any);
                        }
                    } catch (e) {
                        console.warn('Failed to write member change timeline events:', e);
                    }
                }

                // Add specific timeline events for manager/progress/status changes
                try {
                    const actorId = params.managerId !== undefined ? Number(params.managerId) : ((req as any).user?.id || null);
                    const specificEvents: any[] = [];

                    // manager changed
                    if (projectBefore && updateData.manager_id !== undefined && Number(projectBefore.manager_id) !== Number(updateData.manager_id)) {
                        specificEvents.push({
                            project_id: idNum,
                            event_type: 'manager_changed',
                            title: 'Thay đổi quản lý dự án',
                            description: `Quản lý dự án thay đổi từ ${projectBefore.manager_id} sang ${updateData.manager_id}.`,
                            user_id: actorId,
                            event_time: dayjs().toISOString(),
                            metadata: { old_manager: projectBefore.manager_id, new_manager: updateData.manager_id }
                        });
                    }

                    // progress changed
                    if (projectBefore && updateData.progress !== undefined && Number(projectBefore.progress) !== Number(updateData.progress)) {
                        specificEvents.push({
                            project_id: idNum,
                            event_type: 'progress_updated',
                            title: 'Cập nhật tiến độ',
                            description: `Tiến độ thay đổi từ ${projectBefore.progress} -> ${updateData.progress}.`,
                            user_id: actorId,
                            event_time: dayjs().toISOString(),
                            metadata: { old_progress: projectBefore.progress, new_progress: updateData.progress }
                        });
                    }

                    // status changed
                    if (projectBefore && updateData.status !== undefined && String(projectBefore.status) !== String(updateData.status)) {
                        specificEvents.push({
                            project_id: idNum,
                            event_type: 'status_changed',
                            title: 'Thay đổi trạng thái dự án',
                            description: `Trạng thái thay đổi từ ${projectBefore.status} sang ${updateData.status}.`,
                            user_id: actorId,
                            event_time: dayjs().toISOString(),
                            metadata: { old_status: projectBefore.status, new_status: updateData.status }
                        });
                    }

                    if (specificEvents.length) {
                        await ProjectTimelineModel.query(trx).insert(specificEvents as any);
                    }
                } catch (e) {
                    console.warn('Failed to write specific timeline events for project update:', e);
                }

                // Add generic timeline event
                await ProjectTimelineModel.query(trx).insert({
                    project_id: idNum,
                    event_type: 'updated',
                    title: 'Dự án được cập nhật',
                    description: `Dự án "${updatedProject.name}" đã được cập nhật.`,
                    user_id: params.managerId !== undefined
                        ? Number(params.managerId)
                        : (updatedProject && (updatedProject as any).manager_id !== undefined
                            ? Number((updatedProject as any).manager_id)
                            : null),
                    event_time: dayjs().toISOString()
                } as any);

                await trx.commit();

                // Fetch updated project with relations
                const project = await ProjectModel.query()
                    .findById(idNum)
                    .withGraphFetched('[members, timeline]');

                // Enrich with user data (same as getById)
                const userIdsSet = new Set<number>();
                if (project!.manager_id) userIdsSet.add(Number(project!.manager_id));

                if (Array.isArray((project as any).members)) {
                    (project as any).members.forEach((m: any) => {
                        if (m.user_id) userIdsSet.add(Number(m.user_id));
                    });
                }

                const userIds = Array.from(userIdsSet).filter(Boolean);

                const headerAuth = (req.headers.authorization as string) || null;
                const cookieToken = (req as any).cookies?.token;
                const authHeader = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : null);

                let userBulkData: any[] = [];
                if (userIds.length && authHeader) {
                    try {
                        userBulkData = await AuthService.getUsersByIds(userIds, authHeader);
                    } catch (err: any) {
                        console.error('Error fetching users from auth service for project.update:', err?.message || err);
                    }
                }

                const userMap = new Map<number, any>(
                    userBulkData.map((u: any) => [Number(u.id ?? u.user_id ?? u.userId), u])
                );

                const projectJson: any = typeof (project as any).toJSON === 'function'
                    ? (project as any).toJSON()
                    : { ...project };

                projectJson.manager_id = userMap.get(Number(projectJson.manager_id)) ?? null;

                if (Array.isArray(projectJson.members)) {
                    projectJson.members.forEach((m: any) => {
                        m.user_id = userMap.get(Number(m.user_id)) ?? null;
                    });
                }

                res.status(200).json({ success: true, data: projectJson });
            } catch (err) {
                await trx.rollback();
                throw err;
            }
        } catch (error) {
            console.error("Error in updateProject:", error);
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    };

    /**
     * POST /projects/analyze-task - Phân tích công việc bằng AI
     */
    static analyzeTask: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const allowFields = {
                title: 'string!',
                description: 'string!',
                project_id: 'number',
                start_date: 'string', // NEW: Ngày bắt đầu
                due_date: 'string'    // NEW: Ngày kết thúc
            };

            let payload: any;
            try {
                payload = validate(req.body, allowFields);
            } catch (error) {
                if (error instanceof ValidationException) {
                    res.status(error.status).json({ error: error.message });
                    return;
                }
                throw error;
            }

            console.log('[Project Controller] Analyzing task:', payload.title);

            // Lấy thông tin dự án nếu có project_id
            let projectContext = null;
            if (payload.project_id) {
                const project = await ProjectModel.query().findById(payload.project_id);
                if (project) {
                    const today = dayjs();
                    const endDate = dayjs(project.end_date);
                    const daysRemaining = endDate.diff(today, 'day');

                    projectContext = {
                        name: project.name,
                        start_date: project.start_date,
                        end_date: project.end_date,
                        days_remaining: daysRemaining,
                        status: project.status
                    };

                    console.log(`[Project Controller] Project context: ${project.name}, ${daysRemaining} days remaining`);
                }
            }

            // Chuẩn bị taskTimeline nếu có start_date và due_date
            let taskTimeline = null;
            if (payload.start_date && payload.due_date) {
                taskTimeline = {
                    start_date: payload.start_date,
                    due_date: payload.due_date
                };
                console.log(`[Project Controller] Task timeline: ${payload.start_date} → ${payload.due_date}`);
            }

            // Phân tích với AI (với context dự án và timeline)
            const analysis: JobAnalysisResult = await analyzeJobWithAI(
                payload.title,
                payload.description,
                projectContext,
                taskTimeline // TRUYỀN TIMELINE VÀO ĐÂY
            );

            // Tìm hoặc tạo skills trong database với normalization
            const skillsWithIds: Array<{
                skill_id: number;
                skill_name: string;
                required_level: string;
                importance: string;
            }> = [];

            for (const reqSkill of analysis.required_skills) {
                const skill = await findOrCreateNormalizedSkill(reqSkill.name);

                if (!skill) {
                    continue; // Skill bị loại trừ
                }

                skillsWithIds.push({
                    skill_id: skill.skill_id,
                    skill_name: skill.skill_name,
                    required_level: reqSkill.level,
                    importance: reqSkill.importance
                });
            }

            // Compute estimated hours (backend/clients expect hours). Gemini now returns days.
            const analysisEstimatedHours = (analysis as any).estimated_hours ?? (typeof (analysis as any).estimated_days === 'number' ? (analysis as any).estimated_days * 8 : null);

            // Return analysis result with skill IDs
            res.status(200).json({
                success: true,
                analysis: {
                    difficulty_level: analysis.difficulty_level,
                    estimated_hours: analysisEstimatedHours,
                    summary: analysis.summary,
                    recommendations: analysis.recommendations,
                    required_skills: skillsWithIds
                }
            });
        } catch (error: any) {
            console.error('[Project Controller] Error analyzing task:', error);
            res.status(500).json({
                error: 'Failed to analyze task',
                details: error.message
            });
        }
    };

    /**
     * POST /projects/find-candidates - Tìm ứng viên phù hợp VÀ kiểm tra workload
     */
    static findCandidates: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            // Normalize required_skills: convert object to array if needed (before validation)
            if (req.body.required_skills && !Array.isArray(req.body.required_skills)) {
                req.body.required_skills = Object.values(req.body.required_skills);
            }

            const allowFields = {
                job_id: 'string',
                job_title: 'string',
                job_estimated_hours: 'number',
                job_estimated_days: 'number', // prefer days as canonical unit (1 day = 8 hours)
                required_skills: 'array!',
                // Optional timeframe for the new task - used to count overlapping tasks per candidate
                start_date: 'string',
                due_date: 'string',
                min_match_score: 'number',
                max_results: 'number',
                check_workload: 'boolean',
                project_id: 'number'
            };

            let payload: any;
            try {
                payload = validate(req.body, allowFields);
            } catch (error) {
                if (error instanceof ValidationException) {
                    console.error('[ProjectController] Validation error:', error.message);
                    res.status(error.status).json({ error: error.message });
                    return;
                }
                throw error;
            }

            const {
                job_id,
                job_title = 'Công việc mới',
                job_estimated_hours = undefined,
                job_estimated_days = undefined,
                start_date: newTaskStart = null,
                due_date: newTaskDue = null,
                required_skills,
                min_match_score = 0,
                max_results = 1000,
                check_workload = true,
                project_id = null
            } = payload;

            // Prefer estimated days (canonical) and convert to hours for internal checks
            const jobEstimatedHours = (job_estimated_hours !== undefined && job_estimated_hours !== null)
                ? Number(job_estimated_hours)
                : (job_estimated_days !== undefined && job_estimated_days !== null) ? Number(job_estimated_days) * 8 : 0;

            console.log(`[Project Controller] Finding candidates for ${required_skills.length} required skills${project_id ? ` in project ${project_id}` : ''}`);

            // Tìm ứng viên phù hợp theo kỹ năng (chỉ trong project members)
            const candidates: CandidateMatch[] = await findMatchingCandidates(
                job_id || 'temp-job',
                required_skills,
                {
                    minMatchScore: min_match_score,
                    maxResults: max_results,
                    includePartialMatches: true,
                    project_id: project_id
                }
            );

            console.log(`[Project Controller] Found ${candidates.length} candidates by skills`);

            // Fetch user info for all candidates from Auth Service
            console.log('[Project Controller] Fetching user info from auth-service...');
            const userInfoMap = new Map<number, { fullName: string; email: string }>();

            try {
                // Batch fetch all user IDs at once using auth-service /api/users/bulk
                const userIds = candidates.map(c => c.user_id);
                const users = await AuthService.getUsersByIds(userIds);

                users.forEach((user: any) => {
                    userInfoMap.set(user.id, {
                        fullName: user.fullName || user.username || `User ${user.id}`,
                        email: user.email || ''
                    });
                });
            } catch (error) {
                console.warn('[Project Controller] Batch fetch failed, using fallback names:', error);
                // Fallback: use User ID as name
                candidates.forEach(c => {
                    userInfoMap.set(c.user_id, {
                        fullName: `User ${c.user_id}`,
                        email: ''
                    });
                });
            }

            // Kiểm tra workload VÀ timeline conflict cho từng candidate
            const candidatesWithWorkload = await Promise.all(
                candidates.map(async (candidate) => {
                    const userInfo = userInfoMap.get(candidate.user_id) || {
                        fullName: `User ${candidate.user_id}`,
                        email: ''
                    };

                    if (!check_workload) {
                        return {
                            ...candidate,
                            fullName: userInfo.fullName,
                            email: userInfo.email,
                            current_workload_hours: null,
                            can_take_more_work: true,
                            workload_assessment: 'Không kiểm tra workload',
                            risk_level: 'low' as const
                        };
                    }

                    try {
                        // Get current INCOMPLETE tasks for this user
                        const tasks = await TaskModel.query()
                            .where('assignee_id', candidate.user_id)
                            .where(function () {
                                this.where('status', 'todo')
                                    .orWhere('status', 'in-progress')
                                    .orWhere('status', 'in_progress');
                            });

                        const totalEstimatedHours = tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);

                        // Count how many of this user's current tasks overlap with the new task timeframe (if provided)
                        let overlapTaskCount = 0;
                        if (newTaskStart && newTaskDue) {
                            try {
                                const newStart = dayjs(newTaskStart);
                                const newEnd = dayjs(newTaskDue);
                                if (newStart.isValid() && newEnd.isValid()) {
                                    for (const t of tasks) {
                                        // If task has both start_date and due_date, use them
                                        if (t.start_date && t.due_date) {
                                            const tStart = dayjs(t.start_date);
                                            const tEnd = dayjs(t.due_date);
                                            if (tStart.isValid() && tEnd.isValid()) {
                                                // Overlap when intervals intersect
                                                if (!(tEnd.isBefore(newStart) || tStart.isAfter(newEnd))) {
                                                    overlapTaskCount++;
                                                }
                                                continue;
                                            }
                                        }

                                        // If dates missing but task is in-progress, count conservatively as overlapping
                                        const status = (t.status || '').toLowerCase();
                                        if (status === 'in-progress' || status === 'in_progress') {
                                            overlapTaskCount++;
                                        }
                                    }
                                }
                            } catch (e) {
                                // If any date parsing fails, default to 0 overlapping (safe)
                                overlapTaskCount = 0;
                            }
                        }

                        // Gemini workload assessment (với fallback nếu overload)
                        try {
                            const aiAssessment = await assessWorkload({
                                candidateName: userInfo.fullName,
                                totalTasks: tasks.length,
                                totalEstimatedHours: totalEstimatedHours,
                                currentTasks: tasks.map(t => ({
                                    title: t.title,
                                    status: t.status || 'unknown',
                                    estimated_hours: t.estimated_hours || 0
                                })),
                                newTaskTitle: job_title,
                                newTaskEstimatedHours: jobEstimatedHours
                            });

                            return {
                                ...candidate,
                                fullName: userInfo.fullName,
                                email: userInfo.email,
                                current_workload_hours: totalEstimatedHours,
                                can_take_more_work: aiAssessment.can_take_more_work,
                                workload_assessment: aiAssessment.workload_assessment,
                                risk_level: aiAssessment.risk_level,
                                overlap_task_count: overlapTaskCount
                            };
                        } catch (aiError) {
                            // Fallback - không log chi tiết, chỉ dùng rule-based
                            const newTotal = totalEstimatedHours + jobEstimatedHours;
                            const totalDays = Math.ceil(newTotal / 8);

                            let can_take_more_work = true;
                            let risk_level: 'low' | 'medium' | 'high' = 'low';

                            if (totalDays > 15) {
                                can_take_more_work = false;
                                risk_level = 'high';
                            } else if (totalDays > 10) {
                                risk_level = 'medium';
                            }

                            return {
                                ...candidate,
                                fullName: userInfo.fullName,
                                email: userInfo.email,
                                current_workload_hours: totalEstimatedHours,
                                can_take_more_work,
                                workload_assessment: `Tổng: ${totalDays} ngày (AI unavailable)`,
                                risk_level,
                                overlap_task_count: overlapTaskCount
                            };
                        }
                    } catch (error) {
                        console.error(`[Project Controller] Error checking workload for user ${candidate.user_id}:`, error);
                        return {
                            ...candidate,
                            fullName: userInfo.fullName,
                            email: userInfo.email,
                            current_workload_hours: null,
                            can_take_more_work: true,
                            workload_assessment: 'Lỗi khi kiểm tra workload',
                            risk_level: 'medium' as const,
                            overlap_task_count: 0
                        };
                    }
                })
            );

            const suggestedCandidates = candidatesWithWorkload.filter(c => c.match_score > 0);

            console.log(`[Project Controller] ${suggestedCandidates.length} candidates with matching skills, ${candidatesWithWorkload.length} total project members`);

            // Format candidate data
            const formatCandidate = (c: any) => ({
                user_id: c.user_id,
                fullName: c.fullName,
                email: c.email,
                match_score: c.match_score,
                overall_assessment: c.overall_assessment,
                matched_skills: c.matched_skills,
                missing_skills: c.missing_skills,
                skill_match_count: c.skill_match_count,
                total_required_skills: c.total_required_skills,
                current_workload_hours: c.current_workload_hours,
                can_take_more_work: c.can_take_more_work,
                workload_assessment: c.workload_assessment,
                risk_level: c.risk_level,
                overlap_task_count: c.overlap_task_count ?? 0
            });

            res.status(200).json({
                success: true,
                suggested_candidates: suggestedCandidates.map(formatCandidate),
                all_project_members: candidatesWithWorkload.map(formatCandidate),
                total_suggested: suggestedCandidates.length,
                total_members: candidatesWithWorkload.length
            });
        } catch (error: any) {
            console.error('[Project Controller] Error finding candidates:', error);
            res.status(500).json({
                error: 'Failed to find candidates',
                details: error.message
            });
        }
    };

    /**
     * POST /projects/create-task-with-analysis - Tạo task sau khi AI analysis
     */
    static createTaskWithAnalysis: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            // Token already verified by authenticateToken middleware
            const decodedToken = (req as any).auth || (req as any).user;
            const userId = decodedToken?.user_id || decodedToken?.id;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized - User ID not found in token' });
                return;
            }

            // Normalize required_skills: convert object to array if needed (before validation)
            if (req.body.required_skills && !Array.isArray(req.body.required_skills)) {
                req.body.required_skills = Object.values(req.body.required_skills);
            }

            const allowFields = {
                title: 'string!',
                description: 'string!',
                project_id: 'number',
                status: 'string',
                assigned_to_user_id: 'number',
                difficulty_level: 'number',
                estimated_hours: 'number',
                estimated_days: 'number', // NEW: canonical unit is days (1 day = 8 hours)
                ai_analysis_result: 'string',
                required_skills: 'array!',
                tags: 'array',
                priority: 'string',
                start_date: 'string', // NEW
                due_date: 'string',
                depends_on: 'array' // NEW: array of task_ids
            };

            let payload: any;
            try {
                payload = validate(req.body, allowFields);
            } catch (error) {
                if (error instanceof ValidationException) {
                    res.status(error.status).json({ error: error.message });
                    return;
                }
                throw error;
            }

            const trx = await transaction.start(knex);

            try {
                // ============ STEP 1: VALIDATE DEPENDENCIES ============
                if (payload.depends_on && Array.isArray(payload.depends_on) && payload.depends_on.length > 0 && payload.project_id) {
                    const allProjectTasks = await TaskModel.query().where('project_id', payload.project_id);

                    const depValidation = await validateTaskDependencies({
                        depends_on: payload.depends_on,
                        allProjectTasks: allProjectTasks.map(t => ({
                            task_id: t.task_id,
                            title: t.title,
                            status: t.status || 'unknown',
                            due_date: t.due_date
                        }))
                    });

                    if (!depValidation.valid) {
                        await trx.rollback();
                        res.status(400).json({
                            error: 'DEPENDENCY_NOT_MET',
                            message: 'Không thể tạo task - các task phụ thuộc chưa hoàn thành',
                            blocking_tasks: depValidation.blocking_tasks,
                            recommendations: depValidation.recommendations
                        });
                        return;
                    }
                }

                // ============ STEP 2: VALIDATE TIMELINE (nếu có start_date + due_date + assignee) ============
                // Normalize estimated hours from estimated_days if needed (days are canonical)
                const normalizedEstimatedHours = payload.estimated_hours ?? (payload.estimated_days !== undefined && payload.estimated_days !== null ? Number(payload.estimated_days) * 8 : undefined);

                let timelineAnalysis = null;
                if (payload.start_date && payload.due_date && payload.assigned_to_user_id && (normalizedEstimatedHours !== undefined)) {
                    try {
                        // Get assigned user's current tasks
                        const userTasks = await TaskModel.query()
                            .where('assignee_id', payload.assigned_to_user_id)
                            .whereNot('status', 'done')
                            .whereNot('status', 'cancelled');

                        // Get project info for context
                        let projectContext = null;
                        if (payload.project_id) {
                            const project = await ProjectModel.query().findById(payload.project_id);
                            if (project) {
                                projectContext = {
                                    name: project.name,
                                    deadline: project.end_date,
                                    status: project.status
                                };
                            }
                        }

                        // Call Gemini to analyze timeline (real-time, no cache)
                        console.log(`[Project Controller] Analyzing timeline for task "${payload.title}" (${payload.start_date} → ${payload.due_date})`);

                        timelineAnalysis = await analyzeTaskTimeline({
                            newTask: {
                                title: payload.title,
                                start_date: payload.start_date,
                                due_date: payload.due_date,
                                estimated_hours: normalizedEstimatedHours
                            },
                            userTasks: userTasks.map(t => ({
                                task_id: t.task_id,
                                title: t.title,
                                start_date: t.start_date,
                                due_date: t.due_date,
                                estimated_hours: t.estimated_hours || 0,
                                status: t.status || 'unknown',
                                priority: t.priority || 'medium'
                            })),
                            userName: `User ${payload.assigned_to_user_id}`, // TODO: fetch real name
                            projectContext: projectContext || undefined
                        });

                        // If risk is CRITICAL, block task creation
                        if (timelineAnalysis.risk_level === 'critical' || !timelineAnalysis.can_schedule) {
                            await trx.rollback();
                            res.status(400).json({
                                error: 'TIMELINE_CONFLICT',
                                message: 'Không thể giao task - quá tải nghiêm trọng hoặc xung đột thời gian',
                                timeline_analysis: timelineAnalysis
                            });
                            return;
                        }

                        // If HIGH risk, include warning in response (but still allow creation)
                        if (timelineAnalysis.risk_level === 'high') {
                            console.warn(`[Project Controller] Creating task with HIGH risk: ${timelineAnalysis.ai_reasoning}`);
                        }

                    } catch (timelineError: any) {
                        console.error('[Project Controller] Timeline analysis failed:', timelineError);

                        // If Gemini failed and there's a fallback, use it
                        if (timelineError.code === 'AI_ANALYSIS_FAILED' && timelineError.fallback) {
                            timelineAnalysis = timelineError.fallback;

                            if (timelineAnalysis.risk_level === 'critical') {
                                await trx.rollback();
                                res.status(503).json({
                                    error: 'AI_SERVICE_UNAVAILABLE',
                                    message: 'Dịch vụ AI không khả dụng và task có rủi ro cao',
                                    details: timelineError.message,
                                    fallback_analysis: timelineAnalysis
                                });
                                return;
                            }
                        } else {
                            // Unknown error - log but continue (optimistic approach)
                            console.warn('[Project Controller] Timeline analysis failed completely, continuing without validation');
                        }
                    }
                }

                // ============ STEP 3: CREATE TASK ============
                // Parse ai_analysis_result if it's a string
                let aiAnalysis = null;
                if (payload.ai_analysis_result) {
                    try {
                        aiAnalysis = typeof payload.ai_analysis_result === 'string'
                            ? JSON.parse(payload.ai_analysis_result)
                            : payload.ai_analysis_result;
                    } catch (e) {
                        console.warn('[Project Controller] Failed to parse ai_analysis_result:', e);
                    }
                }

                // Prepare tags field - must be array or null per DB schema
                let tagsArray = null;
                if (payload.tags && Array.isArray(payload.tags)) {
                    tagsArray = payload.tags;
                } else if (payload.tags) {
                    tagsArray = [payload.tags];
                }

                // Prepare depends_on field
                let dependsOnArray = null;
                if (payload.depends_on && Array.isArray(payload.depends_on) && payload.depends_on.length > 0) {
                    dependsOnArray = payload.depends_on;
                }

                // Generate unique task_id
                const taskId = generateUniqueTaskId();

                // Calculate due_date if not provided: prefer estimated_days (canonical) then estimated_hours
                let computedDueDate: string | null = null;
                if (payload.due_date) {
                    computedDueDate = payload.due_date;
                } else if (payload.estimated_days && !isNaN(Number(payload.estimated_days))) {
                    try {
                        computedDueDate = dayjs().add(Number(payload.estimated_days), 'day').format('YYYY-MM-DD');
                    } catch (e) {
                        console.warn('[Project Controller] Failed to compute due_date from estimated_days:', e);
                        computedDueDate = null;
                    }
                } else if (payload.estimated_hours && !isNaN(Number(payload.estimated_hours))) {
                    try {
                        computedDueDate = dayjs().add(Number(payload.estimated_hours), 'hour').format('YYYY-MM-DD');
                    } catch (e) {
                        console.warn('[Project Controller] Failed to compute due_date from estimated_hours:', e);
                        computedDueDate = null;
                    }
                }

                // Use start_date from payload if provided, otherwise default to today
                // IMPORTANT: Frontend should always provide start_date - no auto-default
                const computedStartDate = payload.start_date || null;

                // Create task
                // Build insert object and only include optional keys when present to avoid DB errors
                // Check whether optional DB columns exist (some deployments may not have 'tags')
                const hasTagsColumn = await trx.schema.hasColumn('tasks', 'tags');

                const insertData: any = {
                    task_id: taskId,
                    title: payload.title,
                    description: payload.description,
                    project_id: payload.project_id || null,
                    status: payload.status || 'todo',
                    priority: payload.priority || 'medium',
                    assignee_id: payload.assigned_to_user_id || null,
                    // Store both estimated_days (canonical) and estimated_hours (compat)
                    estimated_days: payload.estimated_days !== undefined ? payload.estimated_days : (payload.estimated_hours ? Math.ceil(Number(payload.estimated_hours) / 8) : null),
                    estimated_hours: normalizedEstimatedHours ?? null,
                    start_date: computedStartDate,
                    due_date: computedDueDate
                };
                if (tagsArray !== null && tagsArray !== undefined && hasTagsColumn) insertData.tags = tagsArray;
                if (dependsOnArray !== null && dependsOnArray !== undefined) insertData.depends_on = dependsOnArray;
                if (aiAnalysis !== null && aiAnalysis !== undefined) insertData.ai_metadata = aiAnalysis;

                const task = await TaskModel.query(trx).insert(insertData);

                // Add timeline event: task created
                await ProjectTimelineModel.query(trx).insert({
                    project_id: task.project_id,
                    event_type: 'task_created',
                    title: 'Tạo mới task',
                    description: `Task "${task.title}" đã được tạo thành công`,
                    // actor = creator (from token)
                    user_id: userId || null,
                    event_time: dayjs().toISOString(),
                    // jsonSchema for ProjectTimelineModel requires metadata to be object or null
                    metadata: { task_id: task.task_id, assignee_id: payload.assigned_to_user_id || null }
                } as any);

                // If task was assigned at creation, add a separate assignment event
                if (payload.assigned_to_user_id) {
                    await ProjectTimelineModel.query(trx).insert({
                        project_id: task.project_id,
                        event_type: 'task_assigned',
                        title: 'Phân công task',
                        description: `Task "${task.title}" được phân công cho user ${payload.assigned_to_user_id}`,
                        user_id: userId || null,
                        event_time: dayjs().toISOString(),
                        metadata: { task_id: task.task_id, assignee_id: payload.assigned_to_user_id }
                    } as any);
                }

                await trx.commit();

                console.log(`[Project Controller] Task created successfully: ${task.task_id}`);

                res.status(201).json({
                    success: true,
                    task: {
                        task_id: task.task_id,
                        title: task.title,
                        status: task.status,
                        created_at: task.created_at
                    }
                });
            } catch (error) {
                await trx.rollback();
                throw error;
            }
        } catch (error: any) {
            console.error('[Project Controller] Error creating task:', error);
            res.status(500).json({
                error: 'Failed to create task',
                details: error.message
            });
        }
    };

    /**
     * GET /projects/:project_id/users/:user_id/tasks - Lấy tất cả tasks của user trong dự án
     */
    static getUserTasks: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { user_id } = req.params;

            if (!user_id) {
                res.status(400).json({ error: 'user_id is required' });
                return;
            }

            console.log(`[Project Controller] Getting tasks for user ${user_id}`);

            // Get all non-completed tasks assigned to this user
            const tasks = await TaskModel.query()
                .where('assignee_id', Number(user_id))
                .whereNot('status', 'done')
                .orderBy('created_at', 'desc');

            // Calculate total workload
            const totalEstimatedHours = tasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0);
            const totalActualHours = tasks.reduce((sum, task) => sum + (task.actual_hours || 0), 0);

            res.status(200).json({
                success: true,
                user_id: Number(user_id),
                total_tasks: tasks.length,
                total_estimated_hours: totalEstimatedHours,
                total_actual_hours: totalActualHours,
                tasks: tasks.map(t => ({
                    task_id: t.task_id,
                    title: t.title,
                    status: t.status,
                    priority: t.priority,
                    estimated_hours: t.estimated_hours,
                    actual_hours: t.actual_hours,
                    due_date: t.due_date,
                    project_id: t.project_id
                }))
            });
        } catch (error: any) {
            console.error('[Project Controller] Error getting user tasks:', error);
            res.status(500).json({
                error: 'Failed to get user tasks',
                details: error.message
            });
        }
    };

    /**
     * GET /projects/:project_id/tasks - Lấy tất cả tasks của dự án
     * Query params:
     *   - status: filter theo trạng thái
     *   - assignee_id: filter theo người thực hiện
     *     + Nếu assignee_id = "me" thì lấy task của user hiện tại (từ token)
     *     + Nếu assignee_id là số thì lấy task của user đó
     */
    static getProjectTasks: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { project_id } = req.params;
            const { status, assignee_id } = req.query;

            if (!project_id) {
                res.status(400).json({ error: 'project_id is required' });
                return;
            }

            // Get current user from token
            const currentUserId = (req as any).user?.id;

            console.log(`[Project Controller] Getting tasks for project ${project_id}, assignee_id=${assignee_id}, currentUserId=${currentUserId}`);

            // Build query
            let query = TaskModel.query()
                .where('project_id', Number(project_id))
                .orderBy('created_at', 'desc');

            // Filter by status if provided
            if (status && typeof status === 'string') {
                query = query.where('status', status);
            }

            // Filter by assignee if provided
            if (assignee_id) {
                // Nếu assignee_id = "me" thì lấy task của user hiện tại
                if (assignee_id === 'me') {
                    if (!currentUserId) {
                        res.status(401).json({ error: 'User not authenticated' });
                        return;
                    }
                    query = query.where('assignee_id', Number(currentUserId));
                } else {
                    // Nếu là số thì lấy task của user đó
                    query = query.where('assignee_id', Number(assignee_id));
                }
            }

            const tasks = await query;

            // Fetch assignee info from auth-service
            const assigneeIds = [...new Set(tasks.map(t => t.assignee_id).filter((id): id is number => typeof id === 'number'))];
            const assigneeMap = new Map<number, { fullName: string; email: string }>();

            if (assigneeIds.length > 0) {
                try {
                    const users = await AuthService.getUsersByIds(assigneeIds);
                    users.forEach((user: any) => {
                        assigneeMap.set(user.id, {
                            fullName: user.fullName || user.username || `User ${user.id}`,
                            email: user.email || ''
                        });
                    });
                } catch (error) {
                    console.warn('[Project Controller] Failed to fetch assignee info:', error);
                }
            }

            res.status(200).json({
                success: true,
                project_id: Number(project_id),
                total_tasks: tasks.length,
                tasks: tasks.map(t => {
                    const assignee = t.assignee_id ? assigneeMap.get(t.assignee_id) : null;
                    return {
                        task_id: t.task_id,
                        title: t.title,
                        description: t.description,
                        status: t.status,
                        priority: t.priority,
                        assignee_id: t.assignee_id,
                        assignee_name: assignee?.fullName || null,
                        assignee_email: assignee?.email || null,
                        estimated_hours: t.estimated_hours,
                        start_date: t.start_date,
                        actual_hours: t.actual_hours,
                        due_date: t.due_date,
                        tags: t.tags,
                        created_at: t.created_at,
                        updated_at: t.updated_at
                    };
                })
            });
        } catch (error: any) {
            console.error('[Project Controller] Error getting project tasks:', error);
            res.status(500).json({
                error: 'Failed to get project tasks',
                details: error.message
            });
        }
    };

    /**
     * PUT /projects/:project_id/tasks/:task_id/status - Cập nhật trạng thái task
     */
    static updateTaskStatus: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { project_id, task_id } = req.params;
            const { status } = req.body;

            if (!project_id || !task_id) {
                res.status(400).json({ error: 'project_id and task_id are required' });
                return;
            }

            if (!status) {
                res.status(400).json({ error: 'status is required' });
                return;
            }

            // Validate status
            const validStatuses = ['todo', 'in_progress', 'done'];
            if (!validStatuses.includes(status)) {
                res.status(400).json({
                    error: 'Invalid status',
                    message: `Status must be one of: ${validStatuses.join(', ')}`
                });
                return;
            }

            console.log(`[Project Controller] Updating task ${task_id} status to ${status}`);

            // Check if task exists and belongs to the project
            const task = await TaskModel.query()
                .findOne({
                    task_id: task_id,
                    project_id: Number(project_id)
                });

            if (!task) {
                res.status(404).json({ error: 'Task not found in this project' });
                return;
            }

            // Update task status
            const updatedTask = await TaskModel.query()
                .patchAndFetchById(task_id, {
                    status: status,
                    updated_at: new Date().toISOString()
                });

            // Add timeline event: task created
            await ProjectTimelineModel.query().insert({
                project_id: task.project_id,
                event_type: 'task_updated',
                title: 'Cập nhật trạng thái task',
                description: `Task "${task.title}" đã được cập nhật trạng thái thành ${status} bởi user ${task.assignee_id || 'unknown'}`,
                user_id: task.assignee_id || null,
                event_time: dayjs().toISOString(),
                metadata: { task_id: updatedTask.task_id, new_status: status }
            } as any);


            // Fetch assignee info if exists
            let assigneeInfo = null;
            if (updatedTask.assignee_id) {
                try {
                    const users = await AuthService.getUsersByIds([updatedTask.assignee_id]);
                    if (users.length > 0) {
                        const user = users[0];
                        assigneeInfo = {
                            id: user.id,
                            fullName: user.fullName || user.username || `User ${user.id}`,
                            email: user.email || ''
                        };
                    }
                } catch (error) {
                    console.warn('[Project Controller] Failed to fetch assignee info:', error);
                }
            }

            res.status(200).json({
                success: true,
                message: 'Task status updated successfully',
                task: {
                    task_id: updatedTask.task_id,
                    title: updatedTask.title,
                    description: updatedTask.description,
                    status: updatedTask.status,
                    priority: updatedTask.priority,
                    assignee_id: updatedTask.assignee_id,
                    assignee: assigneeInfo,
                    estimated_hours: updatedTask.estimated_hours,
                    actual_hours: updatedTask.actual_hours,
                    due_date: updatedTask.due_date,
                    tags: updatedTask.tags,
                    created_at: updatedTask.created_at,
                    updated_at: updatedTask.updated_at
                }
            });
        } catch (error: any) {
            console.error('[Project Controller] Error updating task status:', error);
            res.status(500).json({
                error: 'Failed to update task status',
                details: error.message
            });
        }
    };

    /**
     * GET /tasks/my-tasks - Lấy các task của user hiện tại (từ token)
     * Query params: 
     *   - status: 'todo' | 'in_progress' | 'done' (optional, có thể truyền nhiều giá trị cách nhau bởi dấu phẩy)
     *   - priority: 'low' | 'medium' | 'high' | 'urgent' (optional)
     *   - project_id: number (optional, filter theo dự án cụ thể)
     */
    static getMyTasks: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            // Get user_id from authenticated token
            const userId = (req as any).user?.id;

            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            const { status, priority, project_id } = req.query;

            console.log(`[Project Controller] Getting tasks for current user ${userId}`);

            // Build query
            let query = TaskModel.query()
                .where('assignee_id', Number(userId))
                .orderBy('created_at', 'desc');

            // Filter by status - có thể truyền nhiều status
            if (status && typeof status === 'string') {
                const statuses = status.split(',').map(s => s.trim());
                query = query.whereIn('status', statuses);
            }

            // Filter by priority
            if (priority && typeof priority === 'string') {
                query = query.where('priority', priority);
            }

            // Filter by project
            if (project_id) {
                query = query.where('project_id', Number(project_id));
            }

            const tasks = await query;

            // Fetch project info for each task
            const projectIds = [...new Set(tasks.map(t => t.project_id))];
            const projectMap = new Map<number, any>();

            if (projectIds.length > 0) {
                const projects = await ProjectModel.query()
                    .whereIn('project_id', projectIds)
                    .select('project_id', 'name', 'status');

                projects.forEach(project => {
                    projectMap.set(project.project_id, project);
                });
            }

            // Calculate statistics
            const stats = {
                total_tasks: tasks.length,
                by_status: {
                    todo: tasks.filter(t => t.status === 'todo').length,
                    in_progress: tasks.filter(t => t.status === 'in_progress').length,
                    done: tasks.filter(t => t.status === 'done').length
                },
                by_priority: {
                    low: tasks.filter(t => t.priority === 'low').length,
                    medium: tasks.filter(t => t.priority === 'medium').length,
                    high: tasks.filter(t => t.priority === 'high').length,
                    urgent: tasks.filter(t => t.priority === 'urgent').length
                },
                workload: {
                    total_estimated_hours: tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0),
                    total_actual_hours: tasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0),
                    in_progress_hours: tasks
                        .filter(t => t.status === 'in_progress')
                        .reduce((sum, t) => sum + (t.estimated_hours || 0), 0)
                }
            };

            res.status(200).json({
                success: true,
                user_id: Number(userId),
                filters_applied: {
                    status: status || 'all',
                    priority: priority || 'all',
                    project_id: project_id || 'all'
                },
                statistics: stats,
                tasks: tasks.map(t => {
                    const project = projectMap.get(t.project_id);
                    return {
                        task_id: t.task_id,
                        title: t.title,
                        description: t.description,
                        status: t.status,
                        priority: t.priority,
                        estimated_hours: t.estimated_hours,
                        start_date: t.start_date,
                        actual_hours: t.actual_hours,
                        due_date: t.due_date,
                        tags: t.tags,
                        project: project ? {
                            project_id: project.project_id,
                            name: project.name,
                            status: project.status
                        } : null,
                        created_at: t.created_at,
                        updated_at: t.updated_at
                    };
                })
            });
        } catch (error: any) {
            console.error('[Project Controller] Error getting my tasks:', error);
            res.status(500).json({
                error: 'Failed to get my tasks',
                details: error.message
            });
        }
    };

    /**
     * GET /projects/:project_id/tasks/statistics - Thống kê tasks của dự án
     */
    static getProjectTaskStatistics: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { project_id } = req.params;

            if (!project_id) {
                res.status(400).json({ error: 'project_id is required' });
                return;
            }

            console.log(`[Project Controller] Getting task statistics for project ${project_id}`);

            const tasks = await TaskModel.query()
                .where('project_id', Number(project_id));

            // Tính toán thống kê
            const stats = {
                total_tasks: tasks.length,

                by_status: {
                    todo: tasks.filter(t => t.status === 'todo').length,
                    in_progress: tasks.filter(t => t.status === 'in_progress').length,
                    done: tasks.filter(t => t.status === 'done').length
                },

                by_priority: {
                    low: tasks.filter(t => t.priority === 'low').length,
                    medium: tasks.filter(t => t.priority === 'medium').length,
                    high: tasks.filter(t => t.priority === 'high').length,
                    urgent: tasks.filter(t => t.priority === 'urgent').length
                },

                hours: {
                    total_estimated: tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0),
                    total_actual: tasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0),
                    completed_estimated: tasks.filter(t => t.status === 'done')
                        .reduce((sum, t) => sum + (t.estimated_hours || 0), 0),
                    completed_actual: tasks.filter(t => t.status === 'done')
                        .reduce((sum, t) => sum + (t.actual_hours || 0), 0)
                },

                completion_rate: tasks.length > 0
                    ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100)
                    : 0,

                by_assignee: {} as { [key: number]: number }
            };

            // Đếm tasks theo assignee
            tasks.forEach(task => {
                if (task.assignee_id) {
                    stats.by_assignee[task.assignee_id] = (stats.by_assignee[task.assignee_id] || 0) + 1;
                }
            });

            // Data cho biểu đồ
            const chartData = {
                status_chart: [
                    { name: 'Chưa bắt đầu', value: stats.by_status.todo, status: 'todo' },
                    { name: 'Đang thực hiện', value: stats.by_status.in_progress, status: 'in_progress' },
                    { name: 'Hoàn thành', value: stats.by_status.done, status: 'done' }
                ],

                priority_chart: [
                    { name: 'Thấp', value: stats.by_priority.low, priority: 'low' },
                    { name: 'Trung bình', value: stats.by_priority.medium, priority: 'medium' },
                    { name: 'Cao', value: stats.by_priority.high, priority: 'high' },
                    { name: 'Khẩn cấp', value: stats.by_priority.urgent, priority: 'urgent' }
                ],

                hours_chart: [
                    { name: 'Ước tính', value: stats.hours.total_estimated, type: 'estimated' },
                    { name: 'Thực tế', value: stats.hours.total_actual, type: 'actual' }
                ],

                timeline: await ProjectController.getTaskTimeline(Number(project_id))
            };

            res.status(200).json({
                success: true,
                project_id: Number(project_id),
                statistics: stats,
                charts: chartData
            });
        } catch (error: any) {
            console.error('[Project Controller] Error getting task statistics:', error);
            res.status(500).json({
                error: 'Failed to get task statistics',
                details: error.message
            });
        }
    };

    /**
     * Helper: Get task creation timeline for chart
     */
    private static async getTaskTimeline(projectId: number): Promise<any[]> {
        try {
            const tasks = await TaskModel.query()
                .where('project_id', projectId)
                .select('created_at', 'status')
                .orderBy('created_at', 'asc');

            // Group by date
            const dateMap = new Map<string, { todo: number; in_progress: number; done: number }>();

            tasks.forEach(task => {
                if (task.created_at) {
                    const date = dayjs(task.created_at).format('YYYY-MM-DD');
                    if (!dateMap.has(date)) {
                        dateMap.set(date, { todo: 0, in_progress: 0, done: 0 });
                    }
                    const stats = dateMap.get(date)!;
                    if (task.status === 'todo') stats.todo++;
                    else if (task.status === 'in_progress') stats.in_progress++;
                    else if (task.status === 'done') stats.done++;
                }
            });

            // Convert to array for chart
            return Array.from(dateMap.entries()).map(([date, stats]) => ({
                date,
                todo: stats.todo,
                in_progress: stats.in_progress,
                done: stats.done
            }));
        } catch (error) {
            console.error('[Project Controller] Error getting timeline:', error);
            return [];
        }
    }

    /**
     * GET /projects/:project_id/members - Lấy danh sách thành viên dự án
     */
    static getProjectMembers: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { project_id } = req.params;

            if (!project_id) {
                res.status(400).json({ error: 'project_id is required' });
                return;
            }

            console.log(`[Project Controller] Getting members for project ${project_id}`);

            // Get project members from project_members table
            const projectMembers = await ProjectMemberModel.query()
                .where('project_id', Number(project_id))
                .select('user_id', 'role');

            if (projectMembers.length === 0) {
                res.status(200).json({
                    success: true,
                    project_id: Number(project_id),
                    total_members: 0,
                    members: []
                });
                return;
            }

            // Fetch user info from auth-service
            const userIds = projectMembers.map(pm => pm.user_id);
            const userMap = new Map<number, any>();

            try {
                const users = await AuthService.getUsersByIds(userIds);
                users.forEach((user: any) => {
                    userMap.set(user.id, user);
                });
            } catch (error) {
                console.warn('[Project Controller] Failed to fetch user info:', error);
            }

            // Combine member data with user info
            const members = projectMembers.map(pm => {
                const user = userMap.get(pm.user_id);
                return {
                    user_id: pm.user_id,
                    role: pm.role,
                    fullName: user?.fullName || user?.username || `User ${pm.user_id}`,
                    email: user?.email || '',
                    avatar: user?.avatar || null
                };
            });

            res.status(200).json({
                success: true,
                project_id: Number(project_id),
                total_members: members.length,
                members
            });
        } catch (error: any) {
            console.error('[Project Controller] Error getting project members:', error);
            res.status(500).json({
                error: 'Failed to get project members',
                details: error.message
            });
        }
    };

    /**
     * GET /projects/:project_id/timeline - Lấy timeline events của dự án
     */
    static getProjectTimeline: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { project_id } = req.params;

            if (!project_id) {
                res.status(400).json({ error: 'project_id is required' });
                return;
            }

            console.log(`[Project Controller] Getting timeline for project ${project_id}`);

            // Get timeline events from project_timeline table
            const events = await knex('project_timeline')
                .where('project_id', Number(project_id))
                .orderBy('event_time', 'desc')
                .select('*');

            // Fetch user info for event creators
            const userIds = [...new Set(events.map(e => e.user_id).filter(Boolean))];
            const userMap = new Map<number, any>();

            if (userIds.length > 0) {
                try {
                    const users = await AuthService.getUsersByIds(userIds);
                    users.forEach((user: any) => {
                        userMap.set(user.id, {
                            id: user.id,
                            fullName: user.fullName || user.username || `User ${user.id}`,
                            email: user.email || '',
                            avatar: user.avatar || null
                        });
                    });
                } catch (error) {
                    console.warn('[Project Controller] Failed to fetch user info for timeline:', error);
                }
            }

            // Format timeline events
            const formattedEvents = events.map(event => ({
                id: event.id,
                type: event.event_type,
                title: event.title,
                description: event.description,
                timestamp: event.timestamp,
                user: userMap.get(event.user_id) || null,
                metadata: event.metadata
            }));

            res.status(200).json({
                success: true,
                project_id: Number(project_id),
                total_events: formattedEvents.length,
                events: formattedEvents
            });
        } catch (error: any) {
            console.error('[Project Controller] Error getting project timeline:', error);
            res.status(500).json({
                error: 'Failed to get project timeline',
                details: error.message
            });
        }
    };

    /**
     * PUT /projects/:project_id/tasks/:task_id - Cập nhật thông tin task đầy đủ
     */
    static updateTask: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { project_id, task_id } = req.params;
            const payload = req.body;
            const userId = (req as any).user?.id;

            console.log(`[Project Controller] Updating task ${task_id} in project ${project_id}`);

            // Validate project exists
            const project = await ProjectModel.query().findById(Number(project_id));
            if (!project) {
                res.status(404).json({ error: 'Project not found' });
                return;
            }

            // Validate task exists
            const existingTask = await TaskModel.query().findOne({ task_id });
            if (!existingTask) {
                res.status(404).json({ error: 'Task not found' });
                return;
            }

            // Auto-calculate estimated_days from dates if provided
            let estimatedDays = payload.estimated_days;
            if (payload.start_date && payload.due_date && !estimatedDays) {
                const start = dayjs(payload.start_date);
                const due = dayjs(payload.due_date);
                estimatedDays = Math.max(1, due.diff(start, 'day'));
                console.log(`[Project Controller] Auto-calculated estimated_days: ${estimatedDays} (${payload.start_date} → ${payload.due_date})`);
            }

            // Build update object - only include fields that are provided
            const updateData: any = {};
            if (payload.title !== undefined) updateData.title = payload.title;
            if (payload.description !== undefined) updateData.description = payload.description;
            if (payload.status !== undefined) updateData.status = payload.status;
            if (payload.priority !== undefined) updateData.priority = payload.priority;
            if (payload.assignee_id !== undefined) updateData.assignee_id = payload.assignee_id;
            if (payload.start_date !== undefined) updateData.start_date = payload.start_date;
            if (payload.due_date !== undefined) updateData.due_date = payload.due_date;
            if (estimatedDays !== undefined) updateData.estimated_days = estimatedDays;
            if (payload.estimated_hours !== undefined) updateData.estimated_hours = payload.estimated_hours;
            if (payload.actual_hours !== undefined) updateData.actual_hours = payload.actual_hours;

            // Check if tags column exists before updating
            if (payload.tags !== undefined) {
                const hasTagsColumn = await knex.schema.hasColumn('tasks', 'tags');
                if (hasTagsColumn) updateData.tags = payload.tags;
            }

            // Update task
            const updatedTask = await TaskModel.query()
                .where('task_id', task_id)
                .patch(updateData)
                .returning('*')
                .first();

            if (!updatedTask) {
                res.status(500).json({ error: 'Failed to update task' });
                return;
            }

            // Add timeline event
            await ProjectTimelineModel.query().insert({
                project_id: Number(project_id),
                event_type: 'task_updated',
                title: 'Cập nhật task',
                description: `Task "${updatedTask.title}" đã được cập nhật`,
                user_id: userId || null,
                event_time: dayjs().toISOString(),
                metadata: { task_id: updatedTask.task_id }
            } as any);

            res.status(200).json({
                success: true,
                message: 'Task updated successfully',
                task: {
                    task_id: updatedTask.task_id,
                    title: updatedTask.title,
                    description: updatedTask.description,
                    status: updatedTask.status,
                    priority: updatedTask.priority,
                    assignee_id: updatedTask.assignee_id,
                    estimated_days: updatedTask.estimated_days,
                    estimated_hours: updatedTask.estimated_hours,
                    actual_hours: updatedTask.actual_hours,
                    start_date: updatedTask.start_date,
                    due_date: updatedTask.due_date,
                    updated_at: updatedTask.updated_at
                }
            });
        } catch (error: any) {
            console.error('[Project Controller] Error updating task:', error);
            res.status(500).json({
                error: 'Failed to update task',
                details: error.message
            });
        }
    };

    /**
     * DELETE /projects/:project_id/tasks/:task_id - Xóa task
     */
    static deleteTask: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { project_id, task_id } = req.params;
            const userId = (req as any).user?.id;

            console.log(`[Project Controller] Deleting task ${task_id} from project ${project_id}`);

            // Validate project exists
            const project = await ProjectModel.query().findById(Number(project_id));
            if (!project) {
                res.status(404).json({ error: 'Project not found' });
                return;
            }

            // Validate task exists
            const existingTask = await TaskModel.query().findOne({ task_id });
            if (!existingTask) {
                res.status(404).json({ error: 'Task not found' });
                return;
            }

            const taskTitle = existingTask.title;

            // Delete task
            await TaskModel.query().where('task_id', task_id).delete();

            // Add timeline event
            await ProjectTimelineModel.query().insert({
                project_id: Number(project_id),
                event_type: 'task_deleted',
                title: 'Xóa task',
                description: `Task "${taskTitle}" đã được xóa`,
                user_id: userId || null,
                event_time: dayjs().toISOString(),
                metadata: { task_id }
            } as any);

            res.status(200).json({
                success: true,
                message: 'Task deleted successfully',
                task_id
            });
        } catch (error: any) {
            console.error('[Project Controller] Error deleting task:', error);
            res.status(500).json({
                error: 'Failed to delete task',
                details: error.message
            });
        }
    };

    /**
     * GET /projects/:project_id/overview - Lấy tổng quan dự án
     */
    static getProjectOverview: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { project_id } = req.params;

            if (!project_id) {
                res.status(400).json({ error: 'project_id is required' });
                return;
            }

            console.log(`[Project Controller] Getting overview for project ${project_id}`);

            // Get project details
            const project = await ProjectModel.query().findById(Number(project_id));

            if (!project) {
                res.status(404).json({ error: 'Project not found' });
                return;
            }

            // Get member count
            const memberCountResult: any = await ProjectMemberModel.query()
                .where('project_id', Number(project_id))
                .count('* as count')
                .first();

            // Get task statistics
            const tasks = await TaskModel.query().where('project_id', Number(project_id));
            const taskStats = {
                total: tasks.length,
                todo: tasks.filter(t => t.status === 'todo').length,
                in_progress: tasks.filter(t => t.status === 'in_progress').length,
                done: tasks.filter(t => t.status === 'done').length
            };

            // Calculate progress based on completed tasks
            const progress = tasks.length > 0
                ? Math.round((taskStats.done / tasks.length) * 100)
                : 0;

            res.status(200).json({
                success: true,
                project: {
                    ...project,
                    progress,
                    member_count: Number(memberCountResult?.count || 0),
                    task_statistics: taskStats
                }
            });
        } catch (error: any) {
            console.error('[Project Controller] Error getting project overview:', error);
            res.status(500).json({
                error: 'Failed to get project overview',
                details: error.message
            });
        }
    };

}

export default ProjectController;
