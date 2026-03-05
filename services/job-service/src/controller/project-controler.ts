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
import ProjectExpenseModel from '../Models/ProjectExpenseModel.ts';
import AuthService from '../integrations/AuthService.ts';
import CheckScopeService from '../integrations/CheckScopeService.ts';
import { TaskModel } from '../Models/TaskModel.ts';
import { analyzeJobWithAI, JobAnalysisResult } from '../services/geminiService.ts';
import { findMatchingCandidates, CandidateMatch } from '../services/candidateMatchingService.ts';
import { findOrCreateNormalizedSkill } from '../services/geminiService.ts';
import { generateUniqueTaskId } from '../ulitis/id-generator.ts';
import { transaction } from 'objection';
import { Metadata } from 'pdf-parse';
import { assessWorkload } from '../services/geminiService.ts';
import { analyzeTaskTimeline, validateTaskDependencies } from '../services/geminiService.ts';
import * as kpiService from '../services/kpiService.ts';
import { getUserData, getUserId } from '../utils/getUserData.js';
import { notifyProjectMembers } from '../integrations/NotificationService.ts';


SkillModel.knex(knex);
ProjectModel.knex(knex);
ProjectMemberModel.knex(knex);
ProjectTimelineModel.knex(knex);
ProjectRequiredSkillModel.knex(knex);
ProjectSuggestionModel.knex(knex);
ProjectExpenseModel.knex(knex);
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
            const scopeResult = await AuthService.checkUserScope('projects', authHeader, getUserData(req));
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

            // Parse incoming filter/sort params from query
            const qName = typeof req.query.name === 'string' ? req.query.name.trim() : undefined;
            const qStatus = typeof req.query.status === 'string' ? req.query.status.trim() : undefined;
            const qManager = typeof req.query.manager === 'string' ? req.query.manager.trim() : undefined;
            const qBudgetFrom = req.query.budgetFrom ? Number(req.query.budgetFrom) : undefined;
            const qBudgetTo = req.query.budgetTo ? Number(req.query.budgetTo) : undefined;
            const qSpentFrom = req.query.spentFrom ? Number(req.query.spentFrom) : undefined;
            const qSpentTo = req.query.spentTo ? Number(req.query.spentTo) : undefined;
            const qStartFrom = typeof req.query.startDateFrom === 'string' ? req.query.startDateFrom : undefined;
            const qStartTo = typeof req.query.startDateTo === 'string' ? req.query.startDateTo : undefined;
            const qEndFrom = typeof req.query.endDateFrom === 'string' ? req.query.endDateFrom : undefined;
            const qEndTo = typeof req.query.endDateTo === 'string' ? req.query.endDateTo : undefined;

            // Sorting params
            const rawSortField = typeof req.query.sortField === 'string' ? req.query.sortField : (typeof req.query.sort === 'string' ? req.query.sort : undefined);
            const rawSortOrder = typeof req.query.sortOrder === 'string' ? req.query.sortOrder : (typeof req.query.order === 'string' ? req.query.order : 'desc');

            // Fetch user objects for allowedUserIds early if we need to filter by manager name
            let allowedUsersData: any[] = [];
            if (qManager) {
                try {
                    allowedUsersData = await AuthService.getUsersByIds(allowedUserIds, authHeader, getUserData(req));
                } catch (err) {
                    console.warn('Failed to fetch users for manager filter', err);
                    allowedUsersData = [];
                }
            }

            // Build base query and apply filters
            const baseQuery = ProjectModel.query()
                .where(builder => {
                    builder.whereIn('manager_id', allowedUserIds)
                        .orWhereExists(
                            ProjectMemberModel.query()
                                .whereIn('user_id', allowedUserIds)
                                .whereRaw('project_members.project_id = projects.project_id')
                        );
                });

            // If scope is 'personal' (Employee role), only show 'active' (In Progress) and 'completed' projects
            if (scopeResult.scope === 'personal') {
                baseQuery.whereIn('projects.status', ['active', 'completed']);
            }

            // Apply text/name filter
            if (qName) {
                baseQuery.whereILike('projects.name', `%${qName}%`);
            }

            // Status filter (allow comma-separated)
            if (qStatus) {
                const parts = qStatus.split(',').map(s => s.trim()).filter(Boolean);
                if (parts.length === 1) baseQuery.where('projects.status', parts[0]);
                else if (parts.length > 1) baseQuery.whereIn('projects.status', parts);
            }

            // Budget / spent numeric ranges
            if (!Number.isNaN(qBudgetFrom) && qBudgetFrom !== undefined) baseQuery.where('projects.budget', '>=', qBudgetFrom);
            if (!Number.isNaN(qBudgetTo) && qBudgetTo !== undefined) baseQuery.where('projects.budget', '<=', qBudgetTo);
            if (!Number.isNaN(qSpentFrom) && qSpentFrom !== undefined) baseQuery.where('projects.spent', '>=', qSpentFrom);
            if (!Number.isNaN(qSpentTo) && qSpentTo !== undefined) baseQuery.where('projects.spent', '<=', qSpentTo);

            // Start / End date ranges
            if (qStartFrom) baseQuery.where('projects.start_date', '>=', dayjs(qStartFrom).format('YYYY-MM-DD'));
            if (qStartTo) baseQuery.where('projects.start_date', '<=', dayjs(qStartTo).format('YYYY-MM-DD'));
            if (qEndFrom) baseQuery.where('projects.end_date', '>=', dayjs(qEndFrom).format('YYYY-MM-DD'));
            if (qEndTo) baseQuery.where('projects.end_date', '<=', dayjs(qEndTo).format('YYYY-MM-DD'));

            // Manager name filter: find user IDs among allowedUsersData that match the qManager string
            if (qManager) {
                const matched = (allowedUsersData || []).filter(u => {
                    const name = (u.fullName || u.full_name || u.name || u.username || u.email || '').toString().toLowerCase();
                    return name.includes(qManager.toLowerCase());
                }).map(u => Number(u.id ?? u.user_id ?? u.userId)).filter(n => !Number.isNaN(n));

                if (matched.length === 0) {
                    // No manager matches -> return empty page quickly
                    res.status(200).json({ success: true, data: { results: [], total: 0 }, scope: scopeResult.scope });
                    return;
                }

                // Narrow baseQuery to only projects with manager in matched OR members containing matched user
                baseQuery.andWhere(builder => {
                    builder.whereIn('manager_id', matched)
                        .orWhereExists(
                            ProjectMemberModel.query().whereIn('user_id', matched).whereRaw('project_members.project_id = projects.project_id')
                        );
                });
            }

            // Determine sorting column and direction (safe whitelist)
            const sortFieldMap: Record<string, string> = {
                name: 'projects.name',
                created_at: 'projects.created_at',
                createdAt: 'projects.created_at',
                startDate: 'projects.start_date',
                start_date: 'projects.start_date',
                endDate: 'projects.end_date',
                end_date: 'projects.end_date',
                budget: 'projects.budget',
                spent: 'projects.spent',
                progress: 'projects.progress',
                id: 'projects.project_id',
                project_id: 'projects.project_id'
            };

            const mappedSortCol = rawSortField && sortFieldMap[rawSortField] ? sortFieldMap[rawSortField] : 'projects.created_at';
            const mappedSortOrder = (rawSortOrder === 'asc' || rawSortOrder === 'desc') ? rawSortOrder : 'desc';

            // Development debug: log incoming sort params and mapping
            if (process.env.NODE_ENV !== 'production') {
                console.debug('[projects] Received sort params:', { rawSortField, rawSortOrder });
                console.debug('[projects] Mapped to DB column:', { mappedSortCol, mappedSortOrder });
            }

            // 6b. Truy vấn 1: Lấy tổng số lượng (total) VÀ ID của trang hiện tại
            // When ordering by a column that is not part of the DISTINCT select list,
            // Postgres requires the ORDER BY expression to appear in the select list.
            // Add the mappedSortCol to the select/distinct columns when necessary.
            const selectCols: any[] = ['projects.project_id', 'projects.created_at'];
            const distinctCols: any[] = ['projects.project_id', 'projects.created_at'];
            if (mappedSortCol && !distinctCols.includes(mappedSortCol)) {
                // include the ordering column in both select and distinct to satisfy Postgres
                selectCols.push(mappedSortCol);
                distinctCols.push(mappedSortCol);
            }

            const pagedData = await baseQuery.clone()
                .select(...selectCols)
                .distinct(...distinctCols)
                .orderBy(mappedSortCol, mappedSortOrder)
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
                // Sắp xếp lại ở đây để đảm bảo thứ tự (use column without table prefix)
                .orderBy(mappedSortCol.replace(/^projects\./, ''), mappedSortOrder);

            let users: any[] = [];
            try {
                users = await AuthService.getUsersByIds(allowedUserIds, authHeader, getUserData(req));
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

            // Check scope
            const headerAuth = (req.headers.authorization as string) || null;
            const cookieToken = (req as any).cookies?.token;
            const authHeader = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : null);
            if (!authHeader) {
                res.status(401).json({ success: false, message: 'No token provided' });
                return;
            }

            const scopeResult = await AuthService.checkUserScope('projects', authHeader, getUserData(req));
            if (!scopeResult?.hasAccess || scopeResult.scope === 'personal') {
                res.status(403).json({ success: false, message: 'Forbidden: Employees cannot delete projects' });
                return;
            }

            await knex.transaction(async (trx) => {
                // Insert a 'deleted' timeline event for each project id (best-effort)
                try {
                    const actorId = getUserId(req) || null;
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

            // Check scope for Employees (personal scope)
            const headerAuth = (req.headers.authorization as string) || null;
            const cookieToken = (req as any).cookies?.token;
            const authHeader = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : null);
            if (authHeader) {
                try {
                    const scopeResult = await AuthService.checkUserScope('projects', authHeader, getUserData(req));
                    if (scopeResult.scope === 'personal') {
                        // Employees can only view 'active' (In Progress) and 'completed' projects
                        if (project.status !== 'active' && project.status !== 'completed') {
                            res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to view this project' });
                            return;
                        }
                    }
                } catch (e) {
                    console.warn('[Project Controller] Failed to check scope for getProjectById:', e);
                }
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
            // (variables headerAuth, cookieToken, authHeader are already declared above)

            let userBulkData: any[] = [];
            if (userIds.length && authHeader) {
                try {
                    userBulkData = await AuthService.getUsersByIds(userIds, authHeader, getUserData(req));
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

            // Check scope
            const headerAuth = (req.headers.authorization as string) || null;
            const cookieToken = (req as any).cookies?.token;
            const authHeader = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : null);
            if (!authHeader) {
                res.status(401).json({ success: false, message: 'No token provided' });
                return;
            }

            const scopeResult = await AuthService.checkUserScope('projects', authHeader, getUserData(req));
            if (!scopeResult?.hasAccess || scopeResult.scope === 'personal') {
                res.status(403).json({ success: false, message: 'Forbidden: Employees cannot update projects' });
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
                        const actorId = params.managerId !== undefined ? Number(params.managerId) : (getUserId(req) || null);
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
                    const actorId = params.managerId !== undefined ? Number(params.managerId) : (getUserId(req) || null);
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
                        userBulkData = await AuthService.getUsersByIds(userIds, authHeader, getUserData(req));
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

            const headerAuth = (req.headers.authorization as string) || null;
            const cookieToken = (req as any).cookies?.token;
            const authHeader = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : null);

            try {
                // Batch fetch all user IDs at once using auth-service /api/users/bulk
                const userIds = candidates.map(c => c.user_id);
                const users = await AuthService.getUsersByIds(userIds, authHeader || undefined, getUserData(req));

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
            // Token already verified by authenticateToken middleware OR gateway
            const userId = getUserId(req);

            if (!userId || isNaN(userId)) {
                console.error('[createTaskWithAnalysis] Failed to extract userId. userId:', userId);
                console.error('[createTaskWithAnalysis] getUserData result:', getUserData(req));
                console.error('[createTaskWithAnalysis] Headers x-user-data:', req.headers['x-user-data'] ? 'present' : 'missing');
                console.error('[createTaskWithAnalysis] Headers x-user-id:', req.headers['x-user-id']);
                res.status(401).json({ error: 'Unauthorized - User ID not found or invalid in request' });
                return;
            }

            console.log(`[createTaskWithAnalysis] userId=${userId}`);

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

            // Note: Removed restriction that only project managers can assign tasks.
            // Assignment by creators to other users is now allowed.

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
                            .whereNot('status', 'done').skipUndefined()
                            .whereNot('status', 'cancelled').skipUndefined();

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

                        // If risk is CRITICAL or can't schedule, log warning but still allow (don't block)
                        if (timelineAnalysis.risk_level === 'critical' || !timelineAnalysis.can_schedule) {
                            console.warn(`[Project Controller] ⚠️ Task has CRITICAL timeline risk but allowing creation: ${timelineAnalysis.ai_reasoning}`);
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

                // 🔔 Gửi thông báo cho tất cả thành viên trong dự án
                if (task.project_id) {
                    // Get creator name
                    let creatorName = 'Một thành viên';
                    try {
                        const headerAuth = (req.headers.authorization as string) || null;
                        const cookieToken = (req as any).cookies?.token;
                        const authHeader = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : null);
                        if (authHeader && userId) {
                            const creatorUsers = await AuthService.getUsersByIds([userId], authHeader, getUserData(req));
                            if (creatorUsers && creatorUsers.length > 0) {
                                creatorName = creatorUsers[0].fullName || creatorUsers[0].full_name || creatorName;
                            }
                        }
                    } catch (err) {
                        console.error('[Task Create] Failed to fetch creator name:', err);
                    }

                    // Get assignee name if assigned
                    let assigneeText = '';
                    if (payload.assigned_to_user_id) {
                        try {
                            const headerAuth = (req.headers.authorization as string) || null;
                            const cookieToken = (req as any).cookies?.token;
                            const authHeader = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : null);
                            if (authHeader) {
                                const assigneeUsers = await AuthService.getUsersByIds([payload.assigned_to_user_id], authHeader, getUserData(req));
                                if (assigneeUsers && assigneeUsers.length > 0) {
                                    assigneeText = ` và giao cho ${assigneeUsers[0].fullName || assigneeUsers[0].full_name || `User ${payload.assigned_to_user_id}`}`;
                                }
                            }
                        } catch (err) {
                            console.error('[Task Create] Failed to fetch assignee name:', err);
                            assigneeText = ` và giao cho User ${payload.assigned_to_user_id}`;
                        }
                    }

                    const priorityText: Record<string, string> = {
                        'low': 'Độ ưu tiên thấp',
                        'medium': 'Độ ưu tiên trung bình',
                        'high': 'Độ ưu tiên cao',
                        'urgent': 'Khẩn cấp'
                    };
                    const priority = priorityText[task.priority || 'medium'] || task.priority;
                    const dueDate = task.due_date ? `Deadline: ${dayjs(task.due_date).format('DD/MM/YYYY')}` : '';

                    notifyProjectMembers(
                        task.project_id,
                        userId ?? null, // Exclude người tạo task
                        {
                            title: `🆕 Task mới: ${task.title}`,
                            content: `Task "​${task.title}"​ đã được tạo bởi ${creatorName}${assigneeText}. ${priority}${dueDate ? '. ' + dueDate : ''}`,
                            type: 'TASK_CREATED',
                            data: {
                                task_id: task.task_id,
                                task_title: task.title,
                                assignee_id: payload.assigned_to_user_id,
                                priority: task.priority,
                                due_date: task.due_date,
                                creator_name: creatorName
                            }
                        },
                        // Forward incoming headers so notification-service can associate user context if needed
                        req.headers as any
                    ).catch(err => console.error('[Task Create] Notification failed:', err));
                }

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
                .whereNot('status', 'done').skipUndefined()
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
            const currentUserId = getUserId(req);

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

            const headerAuth = (req.headers.authorization as string) || null;
            const cookieToken = (req as any).cookies?.token;
            const authHeader = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : null);

            if (assigneeIds.length > 0) {
                try {
                    const users = await AuthService.getUsersByIds(assigneeIds, authHeader || undefined, getUserData(req));
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
            const validStatuses = ['todo', 'in_progress', 'pending_approval', 'done'];
            if (!validStatuses.includes(status)) {
                res.status(400).json({
                    error: 'Invalid status',
                    message: `Status must be one of: ${validStatuses.join(', ')}`
                });
                return;
            }

            const userId = getUserId(req);

            if (!userId || isNaN(userId)) {
                console.error('[updateTaskStatus] Invalid userId:', { userId, userData: getUserData(req) });
                res.status(401).json({
                    error: 'Unauthorized',
                    message: 'User ID not found or invalid in request'
                });
                return;
            }

            console.log(`[Project Controller] Updating task ${task_id} status to ${status}, userId=${userId}`);

            // Check if task exists and belongs to the project
            const task = await TaskModel.query()
                .findOne({
                    task_id: task_id,
                    project_id: Number(project_id)
                });

            if (!task) {
                res.status(404).json({ error: 'Không tìm thấy công việc trong dự án này' });
                return;
            }

            // Authorization: only assignee or project manager can update task status
            const isAssignee = task.assignee_id && Number(task.assignee_id) === Number(userId);

            // Check if user is project manager (2 ways: by manager_id OR by role in members)
            // Way 1: Check project.manager_id
            const project = await ProjectModel.query().findById(Number(project_id));
            const isProjectOwner = project && Number(project.manager_id) === Number(userId);

            // Way 2: Check role in project_members
            const pmRecord = await ProjectMemberModel.query()
                .where('project_id', Number(project_id))
                .andWhere('user_id', Number(userId))
                .first();

            const hasManagerRole = !!pmRecord && typeof pmRecord.role === 'string' && /manager|project|quản|ql|trưởng|admin|administrator|pm/i.test(pmRecord.role);

            const isManager = !!(isProjectOwner || hasManagerRole);

            console.log(`[Project Controller] Authorization check for task ${task_id}:`, {
                userId: userId,
                assignee_id: task.assignee_id,
                isAssignee: isAssignee,
                project_manager_id: project?.manager_id,
                isProjectOwner: isProjectOwner,
                pmRecord_role: pmRecord?.role,
                hasManagerRole: hasManagerRole,
                isManager: isManager,
                allowed: isAssignee || isManager
            });

            if (!isAssignee && !isManager) {
                res.status(403).json({
                    error: 'Không có quyền',
                    message: 'Chỉ người được giao hoặc quản lý dự án mới có thể cập nhật trạng thái công việc',
                    details: {
                        userId: userId,
                        assignee_id: task.assignee_id,
                        isAssignee: isAssignee,
                        isManager: isManager,
                        project_manager_id: project?.manager_id,
                        isProjectOwner: isProjectOwner,
                        hasManagerRole: hasManagerRole
                    }
                });
                return;
            }

            // Validate status transition
            const currentStatus = task.status;

            // Logic: todo -> in_progress -> pending_approval -> done
            // Không được phép skip status
            if (currentStatus === 'todo' && status === 'done') {
                res.status(400).json({
                    error: 'Invalid status transition',
                    message: 'Task must go through in_progress before done'
                });
                return;
            }

            if (currentStatus === 'todo' && status === 'pending_approval') {
                res.status(400).json({
                    error: 'Invalid status transition',
                    message: 'Task must go through in_progress before pending_approval'
                });
                return;
            }

            if (currentStatus === 'in_progress' && status === 'done') {
                res.status(400).json({
                    error: 'Invalid status transition',
                    message: 'Task must go through pending_approval before done. User should click "Complete" button.'
                });
                return;
            }

            // Khi user bấm hoàn thành -> chuyển sang pending_approval, không phải done
            let updatePayload: any = {
                status: status,
                updated_at: new Date().toISOString()
            };

            // Nếu status là pending_approval, lưu thời gian completed_at
            if (status === 'pending_approval') {
                updatePayload.completed_at = new Date().toISOString();
                console.log(`[Update Task Status] Setting completed_at for task ${task_id}: ${updatePayload.completed_at}`);
            }

            // If manager directly sets status to done from pending_approval, ensure completed_at exists
            if (status === 'done' && currentStatus === 'pending_approval') {
                // Normalize completed_at to ISO string (DB drivers may return Date objects)
                const ensuredCompletedAt = task.completed_at
                    ? (typeof task.completed_at === 'string' ? task.completed_at : dayjs(task.completed_at).toISOString())
                    : new Date().toISOString();

                updatePayload.completed_at = ensuredCompletedAt;
                // Also set approved fields if the updater is a manager
                if (userId) {
                    updatePayload.approved_by = userId;
                    updatePayload.approved_at = new Date().toISOString();
                }
                console.log(`[Update Task Status] Manager approving task ${task_id}, ensured completed_at: ${updatePayload.completed_at}`);
            }

            console.log(`[Update Task Status] Updating task ${task_id} from ${currentStatus} to ${status}`);

            // Update task status
            const updatedTask = await TaskModel.query()
                .patchAndFetchById(task_id, updatePayload);

            console.log(`[Update Task Status] ✅ Task ${task_id} updated successfully. New status: ${updatedTask.status}, completed_at: ${updatedTask.completed_at}`);

            // Add timeline event
            await ProjectTimelineModel.query().insert({
                project_id: task.project_id,
                event_type: 'task_updated',
                title: 'Cập nhật trạng thái task',
                description: `Task "${task.title}" đã được cập nhật trạng thái từ ${currentStatus} thành ${status}`,
                user_id: task.assignee_id || null,
                event_time: dayjs().toISOString(),
                metadata: {
                    task_id: updatedTask.task_id,
                    old_status: currentStatus,
                    new_status: status
                }
            } as any);

            // 🔔 Gửi thông báo cho tất cả thành viên trong dự án
            const statusText: Record<string, string> = {
                'todo': '⚪ Chưa bắt đầu',
                'in_progress': '🔵 Đang thực hiện',
                'pending_approval': '🟡 Chờ duyệt',
                'done': '✅ Hoàn thành'
            };

            const statusEmoji: Record<string, string> = {
                'todo': '⚪',
                'in_progress': '🔵',
                'pending_approval': '🟡',
                'done': '✅'
            };

            const oldStatusText = currentStatus ? (statusText[currentStatus] || currentStatus) : 'Không xác định';
            const newStatusText = status ? (statusText[status] || status) : 'Không xác định';

            // Get updater name
            let updaterName = 'Một thành viên';
            try {
                const headerAuth = (req.headers.authorization as string) || null;
                const cookieToken = (req as any).cookies?.token;
                const authHeader = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : null);
                if (authHeader && userId) {
                    const updaterUsers = await AuthService.getUsersByIds([userId], authHeader, getUserData(req));
                    if (updaterUsers && updaterUsers.length > 0) {
                        updaterName = updaterUsers[0].fullName || updaterUsers[0].full_name || updaterName;
                    }
                }
            } catch (err) {
                console.error('[Task Status Update] Failed to fetch updater name:', err);
            }

            notifyProjectMembers(
                Number(project_id),
                userId ?? null, // Exclude người cập nhật
                {
                    title: `${(status && statusEmoji[status]) || '🔄'} Cập nhật trạng thái: ${task.title}`,
                    content: `Task "​${task.title}"​ chuyển từ ${oldStatusText} → ${newStatusText} bởi ${updaterName}`,
                    type: 'TASK_STATUS_UPDATED',
                    data: {
                        task_id: task.task_id,
                        task_title: task.title,
                        old_status: currentStatus,
                        new_status: status,
                        updated_by: userId,
                        updater_name: updaterName
                    }
                },
                req.headers as any
            ).catch(err => console.error('[Task Status Update] Notification failed:', err));

            // If status is done (approved), save KPI record
            if (status === 'done') {
                try {
                    if (updatedTask.assignee_id && userId !== undefined) {
                        console.log(`[Update Task Status] Saving KPI record for task ${updatedTask.task_id}`);
                        console.log('[Update Task Status] Updated task payload before KPI save:', JSON.stringify(updatedTask));
                        const kpiRecord = await kpiService.saveTaskKpiRecord(updatedTask, userId);
                        if (kpiRecord) {
                            console.log(`[Update Task Status] ✅ KPI record saved:`, { kpi_id: kpiRecord.kpi_id, completion_status: kpiRecord.completion_status, delay_days: kpiRecord.delay_days });
                        } else {
                            console.warn('[Update Task Status] ⚠️ KPI service returned null — KPI not saved');
                        }
                    } else {
                        console.warn('[Update Task Status] ⚠️ updatedTask has no assignee_id, skipping KPI save');
                    }
                } catch (err) {
                    console.error('[Update Task Status] ❌ Failed to save KPI record:', err);
                }
            }

            // Fetch assignee info if exists
            let assigneeInfo = null;
            if (updatedTask.assignee_id) {
                try {
                    const headerAuth = (req.headers.authorization as string) || null;
                    const cookieToken = (req as any).cookies?.token;
                    const authHeader = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : null);

                    const users = await AuthService.getUsersByIds([updatedTask.assignee_id], authHeader || undefined, getUserData(req));
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
                    completed_at: updatedTask.completed_at,
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
            const userId = getUserId(req);

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

            const headerAuth = (req.headers.authorization as string) || null;
            const cookieToken = (req as any).cookies?.token;
            const authHeader = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : null);

            try {
                const users = await AuthService.getUsersByIds(userIds, authHeader || undefined, getUserData(req));
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

            const headerAuth = (req.headers.authorization as string) || null;
            const cookieToken = (req as any).cookies?.token;
            const authHeader = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : null);

            if (userIds.length > 0) {
                try {
                    const users = await AuthService.getUsersByIds(userIds, authHeader || undefined, getUserData(req));
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
            const userId = getUserId(req);

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

            // Note: Removed restriction that only project managers may update task details.
            // Any authenticated creator/member can update fields (including assignee).

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

            // 🔔 Gửi thông báo cho tất cả thành viên trong dự án
            const changedFields: string[] = [];
            if (payload.title !== undefined) changedFields.push('tiêu đề');
            if (payload.description !== undefined) changedFields.push('mô tả');
            if (payload.assignee_id !== undefined) changedFields.push('người thực hiện');
            if (payload.priority !== undefined) changedFields.push('độ ưu tiên');
            if (payload.due_date !== undefined) changedFields.push('deadline');

            const changedText = changedFields.length > 0
                ? `: ${changedFields.join(', ')}`
                : '';

            // Get updater name
            let updaterName = 'Một thành viên';
            try {
                const headerAuth = (req.headers.authorization as string) || null;
                const cookieToken = (req as any).cookies?.token;
                const authHeader = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : null);
                if (authHeader && userId) {
                    const updaterUsers = await AuthService.getUsersByIds([userId], authHeader, getUserData(req));
                    if (updaterUsers && updaterUsers.length > 0) {
                        updaterName = updaterUsers[0].fullName || updaterUsers[0].full_name || updaterName;
                    }
                }
            } catch (err) {
                console.error('[Task Update] Failed to fetch updater name:', err);
            }

            notifyProjectMembers(
                Number(project_id),
                userId ?? null, // Exclude người cập nhật
                {
                    title: `✏️ Cập nhật task: ${updatedTask.title}`,
                    content: `Task "​${updatedTask.title}"​ đã cập nhật${changedText} bởi ${updaterName}`,
                    type: 'TASK_UPDATED',
                    data: {
                        task_id: updatedTask.task_id,
                        task_title: updatedTask.title,
                        changed_fields: changedFields,
                        updated_by: userId,
                        updater_name: updaterName
                    }
                },
                req.headers as any
            ).catch(err => console.error('[Task Update] Notification failed:', err));

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
            const userId = getUserId(req);

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

            // Check scope
            const headerAuth = (req.headers.authorization as string) || null;
            const cookieToken = (req as any).cookies?.token;
            const authHeader = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : null);
            let userScope = 'personal';
            if (authHeader) {
                try {
                    const scopeResult = await AuthService.checkUserScope('projects', authHeader, getUserData(req));
                    userScope = scopeResult.scope;
                } catch (e) {
                    console.warn('[Project Controller] Failed to check scope for overview:', e);
                }
            }

            console.log(`[Project Controller] Getting overview for project ${project_id}, scope=${userScope}`);

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
                    task_statistics: taskStats,
                    scope: userScope
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

    // ==================== PROJECT EXPENSES ENDPOINTS ====================

    /**
     * Get all expenses for a project with pagination, filter, sort, search
     */
    static getProjectExpenses: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { project_id } = req.params;
            const {
                status,
                category,
                page = '1',
                pageSize = '10',
                sortField = 'expense_date',
                sortOrder = 'descend',
                search
            } = req.query;

            // Verify project exists
            const project = await ProjectModel.query().findById(Number(project_id));
            if (!project) {
                res.status(404).json({ error: 'Project not found' });
                return;
            }

            // Pagination
            const pageNum = Math.max(1, parseInt(page as string, 10));
            const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize as string, 10)));
            const offset = (pageNum - 1) * pageSizeNum;

            // Build query
            let query = ProjectExpenseModel.query()
                .where('project_id', Number(project_id));

            // Apply filters
            if (status && typeof status === 'string') {
                query = query.where('status', status);
            }
            if (category && typeof category === 'string') {
                query = query.where('category', category);
            }

            // Apply search (title or description)
            if (search && typeof search === 'string' && search.trim()) {
                query = query.where(function () {
                    this.where('title', 'ilike', `%${search}%`)
                        .orWhere('description', 'ilike', `%${search}%`);
                });
            }

            // Count total before pagination
            const countQuery = query.clone();
            const totalCount = await countQuery.resultSize();

            // Apply sorting
            const validSortFields = ['expense_date', 'title', 'amount', 'category', 'status', 'created_at'];
            const safeSortField = validSortFields.includes(sortField as string) ? (sortField as string) : 'expense_date';
            const safeSortOrder = sortOrder === 'ascend' ? 'asc' : 'desc';
            query = query.orderBy(safeSortField, safeSortOrder);

            // Apply pagination
            const expenses = await query.limit(pageSizeNum).offset(offset);

            // Get user info for created_by and approved_by
            const authHeader = req.headers.authorization;
            const userIds = new Set<number>();
            expenses.forEach(exp => {
                if (exp.created_by) userIds.add(exp.created_by);
                if (exp.approved_by) userIds.add(exp.approved_by);
            });

            let userMap = new Map<number, any>();
            if (userIds.size > 0 && authHeader) {
                try {
                    const users = await AuthService.getUsersByIds(Array.from(userIds), authHeader, getUserData(req));
                    users.forEach(u => userMap.set(u.id, u));
                } catch (err) {
                    console.error('[Project Expenses] Failed to fetch users:', err);
                }
            }

            // Enrich expenses with user info
            const enrichedExpenses = expenses.map(exp => ({
                ...exp,
                created_by_user: exp.created_by ? userMap.get(exp.created_by) : null,
                approved_by_user: exp.approved_by ? userMap.get(exp.approved_by) : null
            }));

            // Calculate total (all expenses matching filters)
            const allExpenses = await countQuery;
            const total = allExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
            const approvedTotal = allExpenses
                .filter(exp => exp.status === 'approved')
                .reduce((sum, exp) => sum + Number(exp.amount), 0);

            res.json({
                success: true,
                data: enrichedExpenses,
                pagination: {
                    page: pageNum,
                    pageSize: pageSizeNum,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / pageSizeNum)
                },
                summary: {
                    total_expenses: totalCount,
                    total_amount: total,
                    approved_amount: approvedTotal,
                    pending_amount: total - approvedTotal,
                    budget: project.budget || 0,
                    spent: project.spent || 0
                }
            });
        } catch (error: any) {
            console.error('[Project Expenses] Error:', error);
            res.status(500).json({ error: 'Failed to get expenses', details: error.message });
        }
    };

    /**
     * Create a new expense
     */
    static createExpense: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { project_id } = req.params;
            const userId = getUserData(req)?.userId;

            // Verify project exists
            const project = await ProjectModel.query().findById(Number(project_id));
            if (!project) {
                res.status(404).json({ error: 'Project not found' });
                return;
            }

            // Validate input
            const { title, description, amount, category, expense_date, status, metadata } = req.body;

            if (!title || !amount || !category || !expense_date) {
                res.status(400).json({
                    error: 'Missing required fields',
                    required: ['title', 'amount', 'category', 'expense_date']
                });
                return;
            }

            // Create expense
            const expense = await ProjectExpenseModel.query().insert({
                project_id: Number(project_id),
                title,
                description: description || null,
                amount: Number(amount),
                category,
                expense_date,
                created_by: userId || null,
                status: status || 'pending',
                metadata: metadata || null
            });

            // If auto-approved, update project spent
            if (expense.status === 'approved') {
                await ProjectModel.query()
                    .findById(Number(project_id))
                    .patch({
                        spent: knex.raw('COALESCE(spent, 0) + ?', [Number(amount)])
                    });
            }

            // Add timeline event
            await ProjectTimelineModel.query().insert({
                project_id: Number(project_id),
                event_type: 'budget_updated',
                title: 'Thêm khoản chi tiêu',
                description: `Khoản chi tiêu "${title}" - ${amount.toLocaleString('vi-VN')} đ`,
                user_id: userId || null,
                event_time: dayjs().toISOString(),
                metadata: { expense_id: expense.expense_id, amount, category }
            } as any);

            res.status(201).json({
                success: true,
                data: expense,
                message: 'Expense created successfully'
            });
        } catch (error: any) {
            console.error('[Project Expenses] Create error:', error);
            res.status(500).json({ error: 'Failed to create expense', details: error.message });
        }
    };

    /**
     * Update an expense
     */
    static updateExpense: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { project_id, expense_id } = req.params;
            const userId = getUserData(req)?.userId;

            // Find expense
            const expense = await ProjectExpenseModel.query()
                .findOne({ expense_id, project_id: Number(project_id) });

            if (!expense) {
                res.status(404).json({ error: 'Expense not found' });
                return;
            }

            // Don't allow updating approved expenses
            if (expense.status === 'approved') {
                res.status(400).json({ error: 'Cannot update approved expense' });
                return;
            }

            const { title, description, amount, category, expense_date, metadata } = req.body;

            // Update expense
            const updated = await ProjectExpenseModel.query()
                .findById(expense_id)
                .patch({
                    ...(title && { title }),
                    ...(description !== undefined && { description }),
                    ...(amount && { amount: Number(amount) }),
                    ...(category && { category }),
                    ...(expense_date && { expense_date }),
                    ...(metadata !== undefined && { metadata })
                });

            const updatedExpense = await ProjectExpenseModel.query().findById(expense_id);

            // Add timeline event
            await ProjectTimelineModel.query().insert({
                project_id: Number(project_id),
                event_type: 'budget_updated',
                title: 'Cập nhật chi tiêu',
                description: `Cập nhật khoản chi tiêu "${updatedExpense?.title}"`,
                user_id: userId || null,
                event_time: dayjs().toISOString(),
                metadata: { expense_id, action: 'updated' }
            } as any);

            res.json({
                success: true,
                data: updatedExpense,
                message: 'Expense updated successfully'
            });
        } catch (error: any) {
            console.error('[Project Expenses] Update error:', error);
            res.status(500).json({ error: 'Failed to update expense', details: error.message });
        }
    };

    /**
     * Delete an expense
     */
    static deleteExpense: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { project_id, expense_id } = req.params;
            const userId = getUserData(req)?.userId;

            // Find expense
            const expense = await ProjectExpenseModel.query()
                .findOne({ expense_id, project_id: Number(project_id) });

            if (!expense) {
                res.status(404).json({ error: 'Expense not found' });
                return;
            }

            // If expense was approved, subtract from project spent
            if (expense.status === 'approved') {
                await ProjectModel.query()
                    .findById(Number(project_id))
                    .patch({
                        spent: knex.raw('GREATEST(0, COALESCE(spent, 0) - ?)', [Number(expense.amount)])
                    });
            }

            // Delete expense
            await ProjectExpenseModel.query().deleteById(expense_id);

            // Add timeline event
            await ProjectTimelineModel.query().insert({
                project_id: Number(project_id),
                event_type: 'budget_updated',
                title: 'Xóa khoản chi tiêu',
                description: `Đã xóa khoản chi tiêu "${expense.title}"`,
                user_id: userId || null,
                event_time: dayjs().toISOString(),
                metadata: { expense_id, amount: expense.amount }
            } as any);

            res.json({
                success: true,
                message: 'Expense deleted successfully'
            });
        } catch (error: any) {
            console.error('[Project Expenses] Delete error:', error);
            res.status(500).json({ error: 'Failed to delete expense', details: error.message });
        }
    };

    /**
     * Approve an expense (only project manager can approve)
     */
    static approveExpense: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { project_id, expense_id } = req.params;
            const userId = getUserData(req)?.userId;

            // Verify project exists and check if user is manager
            const project = await ProjectModel.query().findById(Number(project_id));
            if (!project) {
                res.status(404).json({ error: 'Project not found' });
                return;
            }

            // Check if user is project manager
            if (project.manager_id !== userId) {
                res.status(403).json({
                    error: 'Forbidden',
                    message: 'Chỉ quản lý dự án mới có quyền duyệt chi tiêu!'
                });
                return;
            }

            // Find expense
            const expense = await ProjectExpenseModel.query()
                .findOne({ expense_id, project_id: Number(project_id) });

            if (!expense) {
                res.status(404).json({ error: 'Expense not found' });
                return;
            }

            if (expense.status === 'approved') {
                res.status(400).json({ error: 'Expense already approved' });
                return;
            }

            // Update expense status
            await ProjectExpenseModel.query()
                .findById(expense_id)
                .patch({
                    status: 'approved',
                    approved_by: userId || null,
                    approved_at: new Date().toISOString()
                });

            // Update project spent
            await ProjectModel.query()
                .findById(Number(project_id))
                .patch({
                    spent: knex.raw('COALESCE(spent, 0) + ?', [Number(expense.amount)])
                });

            // Add timeline event
            await ProjectTimelineModel.query().insert({
                project_id: Number(project_id),
                event_type: 'budget_updated',
                title: 'Duyệt chi tiêu',
                description: `Đã duyệt khoản chi tiêu "${expense.title}" - ${Number(expense.amount).toLocaleString('vi-VN')} đ`,
                user_id: userId || null,
                event_time: dayjs().toISOString(),
                metadata: { expense_id, amount: expense.amount, action: 'approved' }
            } as any);

            const updatedExpense = await ProjectExpenseModel.query().findById(expense_id);

            res.json({
                success: true,
                data: updatedExpense,
                message: 'Expense approved successfully'
            });
        } catch (error: any) {
            console.error('[Project Expenses] Approve error:', error);
            res.status(500).json({ error: 'Failed to approve expense', details: error.message });
        }
    };

    /**
     * Reject an expense (only project manager can reject)
     */
    static rejectExpense: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { project_id, expense_id } = req.params;
            const userId = getUserData(req)?.userId;
            const { reason } = req.body;

            // Verify project exists and check if user is manager
            const project = await ProjectModel.query().findById(Number(project_id));
            if (!project) {
                res.status(404).json({ error: 'Project not found' });
                return;
            }

            // Check if user is project manager
            if (project.manager_id !== userId) {
                res.status(403).json({
                    error: 'Forbidden',
                    message: 'Chỉ quản lý dự án mới có quyền từ chối chi tiêu!'
                });
                return;
            }

            // Find expense
            const expense = await ProjectExpenseModel.query()
                .findOne({ expense_id, project_id: Number(project_id) });

            if (!expense) {
                res.status(404).json({ error: 'Expense not found' });
                return;
            }

            if (expense.status === 'approved') {
                res.status(400).json({ error: 'Cannot reject approved expense' });
                return;
            }

            // Update expense status
            await ProjectExpenseModel.query()
                .findById(expense_id)
                .patch({
                    status: 'rejected',
                    approved_by: userId || null,
                    approved_at: new Date().toISOString(),
                    metadata: { ...expense.metadata, rejection_reason: reason }
                });

            // Add timeline event
            await ProjectTimelineModel.query().insert({
                project_id: Number(project_id),
                event_type: 'budget_updated',
                title: 'Từ chối chi tiêu',
                description: `Đã từ chối khoản chi tiêu "${expense.title}"${reason ? `: ${reason}` : ''}`,
                user_id: userId || null,
                event_time: dayjs().toISOString(),
                metadata: { expense_id, action: 'rejected', reason }
            } as any);

            const updatedExpense = await ProjectExpenseModel.query().findById(expense_id);

            res.json({
                success: true,
                data: updatedExpense,
                message: 'Expense rejected'
            });
        } catch (error: any) {
            console.error('[Project Expenses] Reject error:', error);
            res.status(500).json({ error: 'Failed to reject expense', details: error.message });
        }
    };

    /**
     * POST /projects/:project_id/tasks/:task_id/approve - Duyệt task (chỉ project manager)
     */
    static approveTask: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { project_id, task_id } = req.params;
            const userId = getUserId(req);

            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            // Validate project exists
            const project = await ProjectModel.query().findById(Number(project_id));
            if (!project) {
                res.status(404).json({ error: 'Project not found' });
                return;
            }

            // Check if user is project manager
            if (project.manager_id !== userId) {
                res.status(403).json({ error: 'Only project manager can approve tasks' });
                return;
            }

            // Validate task exists and is pending approval
            const task = await TaskModel.query().findOne({ task_id });
            if (!task) {
                res.status(404).json({ error: 'Task not found' });
                return;
            }

            if (task.status !== 'pending_approval') {
                res.status(400).json({
                    error: 'Task is not pending approval',
                    message: `Current status: ${task.status}`
                });
                return;
            }

            // Update task to done
            // Ensure completed_at is an ISO string
            const approvedCompletedAt = task.completed_at
                ? (typeof task.completed_at === 'string' ? task.completed_at : dayjs(task.completed_at).toISOString())
                : new Date().toISOString();

            const updatedTask = await TaskModel.query()
                .patchAndFetchById(task_id, {
                    status: 'done',
                    approved_by: userId,
                    approved_at: new Date().toISOString(),
                    // Ensure completed_at is set if not present so KPI calculation uses a concrete completion time
                    completed_at: approvedCompletedAt,
                    updated_at: new Date().toISOString()
                });

            // Add timeline event
            await ProjectTimelineModel.query().insert({
                project_id: Number(project_id),
                event_type: 'task_approved',
                title: 'Task được phê duyệt',
                description: `Task "${task.title}" đã được phê duyệt`,
                user_id: userId,
                event_time: dayjs().toISOString(),
                metadata: { task_id, approved_by: userId }
            } as any);

            // Notification logic removed: notifications table absent in DB

            // Save KPI record for assignee with detailed debug logging
            if (task.assignee_id) {
                console.log(`[Approve Task] Saving KPI record for assignee ${task.assignee_id} in project ${project_id}`);
                try {
                    console.log('[Approve Task] Updated task payload before KPI save:', JSON.stringify(updatedTask));
                    const kpiRecord = await kpiService.saveTaskKpiRecord(updatedTask, userId);
                    if (kpiRecord) {
                        console.log(`[Approve Task] ✅ KPI record saved:`, {
                            kpi_id: kpiRecord.kpi_id,
                            completion_status: kpiRecord.completion_status,
                            delay_days: kpiRecord.delay_days
                        });
                    } else {
                        console.warn('[Approve Task] ⚠️ KPI service returned null — check task fields and logs above');
                    }
                } catch (error) {
                    console.error('[Approve Task] ❌ Failed to save KPI record:', error);
                }
            } else {
                console.warn(`[Approve Task] ⚠️ Task ${task_id} has no assignee_id, skipping KPI tracking`);
            }

            res.json({
                success: true,
                data: updatedTask,
                message: 'Task approved successfully'
            });
        } catch (error: any) {
            console.error('[Approve Task] Error:', error);
            res.status(500).json({ error: 'Failed to approve task', details: error.message });
        }
    };

    /**
     * POST /projects/:project_id/tasks/:task_id/reject - Từ chối task (chỉ project manager)
     */
    static rejectTask: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { project_id, task_id } = req.params;
            const { reason } = req.body;
            const userId = getUserId(req);

            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            // Validate project exists
            const project = await ProjectModel.query().findById(Number(project_id));
            if (!project) {
                res.status(404).json({ error: 'Project not found' });
                return;
            }

            // Check if user is project manager
            if (project.manager_id !== userId) {
                res.status(403).json({ error: 'Only project manager can reject tasks' });
                return;
            }

            // Validate task exists and is pending approval
            const task = await TaskModel.query().findOne({ task_id });
            if (!task) {
                res.status(404).json({ error: 'Task not found' });
                return;
            }

            if (task.status !== 'pending_approval') {
                res.status(400).json({
                    error: 'Task is not pending approval',
                    message: `Current status: ${task.status}`
                });
                return;
            }

            // Update task back to in_progress
            const updatedTask = await TaskModel.query()
                .patchAndFetchById(task_id, {
                    status: 'in_progress',
                    completed_at: null, // Clear completed_at
                    updated_at: new Date().toISOString()
                });

            // Add timeline event
            await ProjectTimelineModel.query().insert({
                project_id: Number(project_id),
                event_type: 'task_rejected',
                title: 'Task bị từ chối',
                description: `Task "${task.title}" bị từ chối${reason ? `: ${reason}` : ''}`,
                user_id: userId,
                event_time: dayjs().toISOString(),
                metadata: { task_id, rejected_by: userId, reason: reason || null }
            } as any);

            // Notification logic removed: notifications table absent in DB

            res.json({
                success: true,
                data: updatedTask,
                message: 'Task rejected'
            });
        } catch (error: any) {
            console.error('[Reject Task] Error:', error);
            res.status(500).json({ error: 'Failed to reject task', details: error.message });
        }
    };

    /**
     * GET /kpi/user/:user_id - Lấy KPI của user
     */
    static getUserKpi: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { user_id } = req.params;
            const { period_type, project_id } = req.query;

            const periodType = period_type as 'daily' | 'weekly' | 'monthly' || 'monthly';
            const projectIdNum = project_id ? Number(project_id) : undefined;

            // TODO: getUserKpi method not implemented in kpiService yet
            // const kpi = await kpiService.getUserKpi(
            //     Number(user_id),
            //     periodType,
            //     projectIdNum
            // );

            // if (!kpi) {
            // Tính KPI mới nếu chưa có
            // TODO: calculateAndSaveUserKpiForAllPeriods method not implemented yet
            // const calculated = await kpiService.calculateAndSaveUserKpiForAllPeriods(
            //     Number(user_id),
            //     projectIdNum
            // );

            // res.json({
            //     success: true,
            //     data: calculated[periodType],
            //     message: 'KPI calculated'
            // });
            // return;
            // }

            // res.json({
            //     success: true,
            //     data: kpi
            // });

            // Temporary response until methods are implemented
            res.json({
                success: false,
                message: 'KPI calculation methods not yet implemented in kpiService',
                data: null
            });
        } catch (error: any) {
            console.error('[Get User KPI] Error:', error);
            res.status(500).json({ error: 'Failed to get user KPI', details: error.message });
        }
    };

    /**
     * GET /notifications - Lấy notifications của user hiện tại
     */
    static getNotifications: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        // Notifications endpoint removed because notifications table does not exist
        res.status(410).json({ success: false, error: 'Notifications feature removed' });
    };

    /**
     * GET /notifications/unread-count - Lấy số lượng notifications chưa đọc
     */
    static getUnreadNotificationCount: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        res.status(410).json({ success: false, error: 'Notifications feature removed' });
    };

    /**
     * PUT /notifications/:notification_id/read - Đánh dấu notification đã đọc
     */
    static markNotificationAsRead: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        res.status(410).json({ success: false, error: 'Notifications feature removed' });
    };

    /**
     * PUT /notifications/mark-all-read - Đánh dấu tất cả notifications đã đọc
     */
    static markAllNotificationsAsRead: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        res.status(410).json({ success: false, error: 'Notifications feature removed' });
    };

    /**
     * POST /kpi/test-calculate - TEST: Tính KPI thủ công để kiểm tra logic
     * Body: { user_id: number, project_id?: number, task_id?: string }
     * 
     * Endpoint này để test và debug logic tính KPI
     * Sẽ trả về chi tiết các task được tính, kết quả KPI, và giải thích
     */
    static testCalculateKpi: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { user_id, project_id, task_id } = req.body;

            if (!user_id) {
                res.status(400).json({
                    error: 'user_id is required',
                    message: 'Vui lòng cung cấp user_id để tính KPI'
                });
                return;
            }

            console.log(`\n========== TEST KPI CALCULATION ==========`);
            console.log(`User ID: ${user_id}, Project ID: ${project_id || 'all'}, Task ID: ${task_id || 'all'}`);

            // Nếu có task_id, lấy thông tin task để phân tích
            let taskInfo = null;
            if (task_id) {
                taskInfo = await TaskModel.query().findOne({ task_id });
                if (taskInfo) {
                    console.log(`\n[TEST] Task được chỉ định:`);
                    console.log(`- ID: ${taskInfo.task_id}`);
                    console.log(`- Title: ${taskInfo.title}`);
                    console.log(`- Status: ${taskInfo.status}`);
                    console.log(`- Assignee ID: ${taskInfo.assignee_id}`);
                    console.log(`- Due Date: ${taskInfo.due_date}`);
                    console.log(`- Completed At: ${taskInfo.completed_at}`);
                    console.log(`- Approved At: ${taskInfo.approved_at}`);

                    // Phân tích task này
                    if (taskInfo.completed_at && taskInfo.due_date) {
                        const completedAt = dayjs(taskInfo.completed_at);
                        const dueDate = dayjs(taskInfo.due_date);
                        const delayDays = completedAt.diff(dueDate, 'day', true);

                        console.log(`\n[TEST] Phân tích task:`);
                        if (delayDays <= 0) {
                            console.log(`✅ Task VƯỢT TIẾN ĐỘ: Hoàn thành SỚM ${Math.abs(delayDays).toFixed(1)} ngày`);
                        } else {
                            console.log(`⏰ Task CHẬM TIẾN ĐỘ: Hoàn thành MUỘN ${delayDays.toFixed(1)} ngày`);
                        }
                    }
                }
            }

            // Tính KPI cho cả 3 khoảng thời gian
            // TODO: calculateAndSaveUserKpiForAllPeriods method not implemented yet
            // const kpiResults = await kpiService.calculateAndSaveUserKpiForAllPeriods(
            //     Number(user_id),
            //     project_id ? Number(project_id) : null
            // );

            console.log(`\n[TEST] ✅ KPI calculation skipped (method not implemented yet)`);
            console.log(`========== END TEST KPI CALCULATION ==========\n`);

            const kpiResults: any = {
                daily: {
                    kpi_id: null,
                    period_start: null,
                    period_end: null,
                    total_tasks: 0,
                    completed_tasks: 0,
                    on_time_tasks: 0,
                    late_tasks: 0,
                    overdue_tasks: 0,
                    pending_approval_tasks: 0,
                    kpi_score: 0,
                    completion_rate: 0,
                    on_time_rate: 0,
                    avg_completion_days: 0,
                    avg_delay_days: 0
                },
                weekly: {
                    kpi_id: null,
                    period_start: null,
                    period_end: null,
                    total_tasks: 0,
                    completed_tasks: 0,
                    on_time_tasks: 0,
                    late_tasks: 0,
                    overdue_tasks: 0,
                    pending_approval_tasks: 0,
                    kpi_score: 0,
                    completion_rate: 0,
                    on_time_rate: 0,
                    avg_completion_days: 0,
                    avg_delay_days: 0
                },
                monthly: {
                    kpi_id: null,
                    period_start: null,
                    period_end: null,
                    total_tasks: 0,
                    completed_tasks: 0,
                    on_time_tasks: 0,
                    late_tasks: 0,
                    overdue_tasks: 0,
                    pending_approval_tasks: 0,
                    kpi_score: 0,
                    completion_rate: 0,
                    on_time_rate: 0,
                    avg_completion_days: 0,
                    avg_delay_days: 0
                }
            };

            res.json({
                success: true,
                message: 'Tính KPI thành công - kiểm tra console logs để xem chi tiết',
                data: {
                    task_analyzed: taskInfo ? {
                        task_id: taskInfo.task_id,
                        title: taskInfo.title,
                        status: taskInfo.status,
                        assignee_id: taskInfo.assignee_id,
                        due_date: taskInfo.due_date,
                        completed_at: taskInfo.completed_at,
                        approved_at: taskInfo.approved_at,
                        delay_analysis: taskInfo.completed_at && taskInfo.due_date ? {
                            delay_days: dayjs(taskInfo.completed_at).diff(dayjs(taskInfo.due_date), 'day', true),
                            is_late: dayjs(taskInfo.completed_at).isAfter(dayjs(taskInfo.due_date)),
                            explanation: dayjs(taskInfo.completed_at).isAfter(dayjs(taskInfo.due_date))
                                ? `Task chậm ${dayjs(taskInfo.completed_at).diff(dayjs(taskInfo.due_date), 'day', true).toFixed(1)} ngày`
                                : `Task hoàn thành sớm ${Math.abs(dayjs(taskInfo.completed_at).diff(dayjs(taskInfo.due_date), 'day', true)).toFixed(1)} ngày`
                        } : null
                    } : null,
                    kpi_results: kpiResults,
                    explanation: {
                        vi: {
                            title: 'CÁCH TÍNH KPI TRONG HỆ THỐNG',
                            overview: 'KPI được tính dựa trên hiệu suất hoàn thành công việc của nhân viên',
                            calculation_formula: {
                                kpi_score: 'KPI Score = (Tỷ lệ hoàn thành × 50%) + (Tỷ lệ đúng hạn × 40%) - Phạt quá hạn',
                                completion_rate: 'Tỷ lệ hoàn thành = (Số task hoàn thành / Tổng số task) × 100%',
                                on_time_rate: 'Tỷ lệ đúng hạn = (Số task đúng hạn / Số task hoàn thành) × 100%',
                                overdue_penalty: 'Phạt quá hạn = min((Số task quá hạn / Tổng task) × 30, 30) điểm'
                            },
                            task_classification: {
                                completed: 'Task hoàn thành: status = done VÀ có completed_at',
                                on_time: 'Đúng hạn: completed_at <= due_date (vượt tiến độ)',
                                late: 'Chậm hạn: completed_at > due_date (chậm tiến độ)',
                                overdue: 'Quá hạn: status ≠ done VÀ hiện tại > due_date',
                                pending_approval: 'Chờ duyệt: status = pending_approval'
                            },
                            time_comparison: {
                                key_point: 'QUAN TRỌNG: So sánh completed_at (thời gian user hoàn thành) với due_date (deadline)',
                                example_on_time: 'Ví dụ đúng hạn: due_date = 25/11, completed_at = 20/11 → Sớm 5 ngày',
                                example_late: 'Ví dụ chậm hạn: due_date = 13/11, completed_at = 22/12 → Muộn 39 ngày'
                            },
                            periods: {
                                daily: 'Hàng ngày: Tính KPI cho ngày hôm nay',
                                weekly: 'Hàng tuần: Tính KPI cho tuần hiện tại (ISO week)',
                                monthly: 'Hàng tháng: Tính KPI cho tháng hiện tại'
                            }
                        }
                    }
                }
            });
        } catch (error: any) {
            console.error('[TEST KPI] Error:', error);
            res.status(500).json({
                error: 'Failed to calculate test KPI',
                details: error.message,
                message: 'Lỗi khi tính KPI - kiểm tra console logs'
            });
        }
    };

    /**
     * GET /projects/:project_id/kpi-report - Lấy báo cáo KPI đầy đủ cho project
     * Support filter, sort, search cho màn quản lý KPI nhân viên
     * 
     * Query params:
     * - month: Tháng cần xem (1-12)
     * - year: Năm cần xem (2024, 2025...)
     * - page: Trang hiện tại
     * - pageSize: Số bản ghi mỗi trang
     * - sortField: Trường cần sắp xếp (name, kpi_score, total_done, etc.)
     * - sortOrder: ascend | descend
     * - search: Tìm kiếm theo tên nhân viên
     */
    static getProjectKpiReport: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { project_id } = req.params;
            const {
                month,
                year,
                page = '1',
                pageSize = '10',
                sortField = 'kpi_score',
                sortOrder = 'descend',
                search
            } = req.query;

            console.log(`\n========== GET PROJECT KPI REPORT ==========`);
            console.log(`Project ID: ${project_id}, Month: ${month || 'current'}, Year: ${year || 'current'}`);

            // Validate project exists
            const project = await ProjectModel.query().findById(Number(project_id));
            if (!project) {
                res.status(404).json({ error: 'Project not found' });
                return;
            }

            // Determine time period
            const targetMonth = month ? Number(month) : dayjs().month() + 1;
            const targetYear = year ? Number(year) : dayjs().year();

            const periodStart = dayjs(`${targetYear}-${String(targetMonth).padStart(2, '0')}-01`).startOf('month');
            const periodEnd = periodStart.endOf('month');

            console.log(`[KPI Report] Period: ${periodStart.format('YYYY-MM-DD')} to ${periodEnd.format('YYYY-MM-DD')}`);

            // Get all project members
            const projectMembers = await ProjectMemberModel.query()
                .where('project_id', Number(project_id))
                .select('user_id', 'role');

            if (projectMembers.length === 0) {
                res.json({
                    success: true,
                    project_summary: {
                        total_members: 0,
                        total_tasks: 0,
                        total_done: 0,
                        avg_kpi: 0
                    },
                    members: [],
                    pagination: {
                        page: 1,
                        pageSize: Number(pageSize),
                        total: 0,
                        totalPages: 0
                    }
                });
                return;
            }

            const userIds = projectMembers.map(m => m.user_id);

            // Fetch all tasks for these users in the project during the period
            const allTasks = await TaskModel.query()
                .where('project_id', Number(project_id))
                .whereIn('assignee_id', userIds)
                .where(builder => {
                    builder
                        .whereBetween('created_at', [periodStart.toISOString(), periodEnd.toISOString()])
                        .orWhereBetween('completed_at', [periodStart.toISOString(), periodEnd.toISOString()]);
                });

            console.log(`[KPI Report] Found ${allTasks.length} tasks for ${userIds.length} members`);

            // Get user information from auth service
            const authHeader = req.headers.authorization || (req as any).cookies?.token;
            let users: any[] = [];
            try {
                users = await AuthService.getUsersByIds(userIds, authHeader, getUserData(req));
                console.log(`[KPI Report] Fetched ${users.length} user profiles`);
            } catch (err) {
                console.error('[KPI Report] Failed to fetch users:', err);
            }

            const userMap = new Map(users.map(u => [Number(u.id || u.user_id), u]));

            // Calculate KPI for each member
            const memberStats = userIds.map(userId => {
                const userTasks = allTasks.filter(t => Number(t.assignee_id) === Number(userId));
                const userInfo = userMap.get(Number(userId));

                // Calculate stats
                const totalAssigned = userTasks.length;
                const doneTasks = userTasks.filter(t => t.status === 'done' && t.completed_at);
                const totalDone = doneTasks.length;

                let countEarly = 0;
                let countOnTime = 0;
                let countLate = 0;
                const lateTasks: any[] = [];
                let totalDelayHours = 0;

                doneTasks.forEach(task => {
                    if (!task.completed_at || !task.due_date) return;

                    const completedAt = dayjs(task.completed_at);
                    const dueDate = dayjs(task.due_date);
                    const delayHours = completedAt.diff(dueDate, 'hour', true);

                    if (delayHours < 0) {
                        countEarly++;
                    } else if (delayHours === 0 || Math.abs(delayHours) < 1) {
                        countOnTime++;
                    } else {
                        countLate++;
                        totalDelayHours += delayHours;
                        lateTasks.push({
                            task_id: task.task_id,
                            title: task.title,
                            due_date: task.due_date,
                            completed_at: task.completed_at,
                            delay_hours: Math.round(delayHours * 10) / 10,
                            delay_days: Math.round(delayHours / 24 * 10) / 10
                        });
                    }
                });

                // Calculate KPI score: (early + on_time) / total_done * 100
                const kpiScore = totalDone > 0
                    ? Math.round((countEarly + countOnTime) / totalDone * 100)
                    : 0;

                const avgDelayHours = countLate > 0
                    ? Math.round(totalDelayHours / countLate * 10) / 10
                    : 0;

                // Get pending approval tasks
                const pendingApprovalTasks = userTasks.filter(t => t.status === 'pending_approval').length;

                // Get overdue tasks (not done yet but past due_date)
                const now = dayjs();
                const overdueTasks = userTasks.filter(t =>
                    t.status !== 'done' &&
                    t.due_date &&
                    dayjs(t.due_date).isBefore(now)
                ).length;

                return {
                    user_id: userId,
                    name: userInfo?.fullName || userInfo?.full_name || userInfo?.username || `User ${userId}`,
                    email: userInfo?.email || '',
                    role: projectMembers.find(m => m.user_id === userId)?.role || '',
                    avatar: userInfo?.identificationPhoto || null,
                    stats: {
                        total_assigned: totalAssigned,
                        total_done: totalDone,
                        count_early: countEarly,
                        count_on_time: countOnTime,
                        count_late: countLate,
                        pending_approval: pendingApprovalTasks,
                        overdue: overdueTasks,
                        avg_delay_hours: avgDelayHours,
                        kpi_score: kpiScore
                    },
                    late_tasks: lateTasks,
                    // Add badge color based on KPI score
                    badge: kpiScore >= 90 ? 'A' : kpiScore >= 80 ? 'B' : kpiScore >= 70 ? 'C' : 'D',
                    badge_color: kpiScore >= 90 ? 'green' : kpiScore >= 80 ? 'blue' : kpiScore >= 70 ? 'yellow' : 'red'
                };
            });

            // Apply search filter
            let filteredMembers = memberStats;
            if (search && typeof search === 'string' && search.trim()) {
                const searchLower = search.trim().toLowerCase();
                filteredMembers = memberStats.filter(m =>
                    m.name.toLowerCase().includes(searchLower) ||
                    m.email.toLowerCase().includes(searchLower)
                );
            }

            // Apply sorting
            const sortFieldMap: Record<string, string> = {
                name: 'name',
                kpi_score: 'stats.kpi_score',
                total_done: 'stats.total_done',
                total_assigned: 'stats.total_assigned',
                count_late: 'stats.count_late',
                avg_delay_hours: 'stats.avg_delay_hours'
            };

            const actualSortField = sortFieldMap[sortField as string] || 'stats.kpi_score';
            const sortOrderMultiplier = sortOrder === 'ascend' ? 1 : -1;

            filteredMembers.sort((a, b) => {
                let aVal: any = a;
                let bVal: any = b;

                // Navigate nested fields
                const fields = actualSortField.split('.');
                for (const field of fields) {
                    aVal = aVal?.[field];
                    bVal = bVal?.[field];
                }

                // Handle string comparison
                if (typeof aVal === 'string' && typeof bVal === 'string') {
                    return aVal.localeCompare(bVal) * sortOrderMultiplier;
                }

                // Handle numeric comparison
                const aNum = Number(aVal) || 0;
                const bNum = Number(bVal) || 0;
                return (aNum - bNum) * sortOrderMultiplier;
            });

            // Pagination
            const pageNum = Math.max(1, parseInt(page as string, 10));
            const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize as string, 10)));
            const total = filteredMembers.length;
            const totalPages = Math.ceil(total / pageSizeNum);
            const offset = (pageNum - 1) * pageSizeNum;
            const paginatedMembers = filteredMembers.slice(offset, offset + pageSizeNum);

            // Calculate project summary
            const totalTasks = allTasks.length;
            const totalDoneInProject = allTasks.filter(t => t.status === 'done').length;
            const avgKpi = memberStats.length > 0
                ? Math.round(memberStats.reduce((sum, m) => sum + m.stats.kpi_score, 0) / memberStats.length)
                : 0;

            console.log(`[KPI Report] Summary: ${totalTasks} tasks, ${totalDoneInProject} done, avg KPI: ${avgKpi}%`);
            console.log(`[KPI Report] Returning ${paginatedMembers.length} members (page ${pageNum}/${totalPages})`);
            console.log(`========== END KPI REPORT ==========\n`);

            res.json({
                success: true,
                project_summary: {
                    project_id: Number(project_id),
                    project_name: project.name,
                    total_members: userIds.length,
                    total_tasks: totalTasks,
                    total_done: totalDoneInProject,
                    avg_kpi: avgKpi,
                    period: {
                        month: targetMonth,
                        year: targetYear,
                        start: periodStart.format('YYYY-MM-DD'),
                        end: periodEnd.format('YYYY-MM-DD')
                    }
                },
                members: paginatedMembers,
                pagination: {
                    page: pageNum,
                    pageSize: pageSizeNum,
                    total: total,
                    totalPages: totalPages
                }
            });
        } catch (error: any) {
            console.error('[GET KPI Report] Error:', error);
            res.status(500).json({
                error: 'Failed to get KPI report',
                details: error.message
            });
        }
    };

    /**
     * GET /kpi/users - Lấy KPI tất cả users trong scope theo tháng/năm
     * Query params: month, year
     */
    static getAllUsersKpi: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = getUserId(req);
            const token = req.headers.authorization?.replace('Bearer ', '');

            if (!userId || !token) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            const { month, year } = req.query;

            // Default to current month/year
            const now = dayjs();
            const targetMonth = month ? parseInt(month as string) : now.month() + 1;
            const targetYear = year ? parseInt(year as string) : now.year();


            console.log(`[Get All Users KPI] User ${userId} requesting KPI for ${targetMonth}/${targetYear}`);

            // Pre-check permission and scope: only department/global scope may view KPI management
            const userData = getUserData(req);
            const scopeCheck = await CheckScopeService.checkUserScope('kpiManagement', token, userData);
            console.log('[Get All Users KPI] Scope check (pre):', scopeCheck);

            if (!scopeCheck.hasAccess || scopeCheck.scope === 'personal') {
                console.warn(`[Get All Users KPI] User ${userId} does not have permission to view KPI management (scope: ${scopeCheck.scope})`);
                res.status(403).json({ success: false, error: 'Forbidden: insufficient permission to view KPI management' });
                return;
            }

            const kpiList = await kpiService.getAllUsersKpiInScope(
                userId,
                targetMonth,
                targetYear,
                token,
                userData
            );

            res.json({
                success: true,
                data: kpiList,
                month: targetMonth,
                year: targetYear
            });
        } catch (error: any) {
            console.error('[Get All Users KPI] Error:', error);
            res.status(500).json({
                error: 'Failed to get KPI data',
                details: error.message
            });
        }
    };

    /**
     * GET /kpi/users/:user_id/summary - Lấy KPI summary của một user
     * Query params: month, year
     */
    static getUserKpiSummary: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { user_id } = req.params;
            const { month, year } = req.query;

            // Default to current month/year
            const now = dayjs();
            const targetMonth = month ? parseInt(month as string) : now.month() + 1;
            const targetYear = year ? parseInt(year as string) : now.year();

            console.log(`[Get User KPI Summary] User ${user_id} for ${targetMonth}/${targetYear}`);

            const summary = await kpiService.getUserKpiSummary(
                parseInt(user_id),
                targetMonth,
                targetYear
            );

            res.json({
                success: true,
                data: summary
            });
        } catch (error: any) {
            console.error('[Get User KPI Summary] Error:', error);
            res.status(500).json({
                error: 'Failed to get user KPI summary',
                details: error.message
            });
        }
    };

    /**
     * GET /kpi/users/:user_id/projects - Lấy KPI chi tiết theo từng dự án
     * Query params: month, year
     */
    static getUserProjectKpiDetails: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { user_id } = req.params;
            const { month, year } = req.query;

            // Default to current month/year
            const now = dayjs();
            const targetMonth = month ? parseInt(month as string) : now.month() + 1;
            const targetYear = year ? parseInt(year as string) : now.year();

            console.log(`[Get User Project KPI] User ${user_id} for ${targetMonth}/${targetYear}`);

            const details = await kpiService.getUserProjectKpiDetails(
                parseInt(user_id),
                targetMonth,
                targetYear
            );

            // Fetch project names from database
            const projectIds = details.map(d => d.project_id);
            const projects = await ProjectModel.query().whereIn('project_id', projectIds);
            const projectMap = projects.reduce((acc, p) => {
                acc[p.project_id] = p.name;
                return acc;
            }, {} as Record<number, string>);

            const detailsWithProjectNames = details.map(d => ({
                ...d,
                project_name: projectMap[d.project_id] || `Project ${d.project_id}`
            }));

            res.json({
                success: true,
                data: detailsWithProjectNames
            });
        } catch (error: any) {
            console.error('[Get User Project KPI] Error:', error);
            res.status(500).json({
                error: 'Failed to get user project KPI details',
                details: error.message
            });
        }
    };

}

export default ProjectController;
