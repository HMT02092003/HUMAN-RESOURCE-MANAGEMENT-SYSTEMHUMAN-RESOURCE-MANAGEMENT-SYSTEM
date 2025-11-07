import e, { Request, Response, RequestHandler } from 'express';
import dayjs from 'dayjs';
import knex from '../lib/database.ts';
import { JobModel } from '../Models/JobModel.ts';
import { JobRequiredSkillModel } from '../Models/JobRequiredSkillModel.ts';
import { JobSuggestionModel } from '../Models/JobSuggestionModel.ts';
import { SkillModel } from '../Models/SkillModel.ts';
import { JobController } from './job-controller.ts';
import { validate } from '../ulitis/validation-utility.ts';
import { remove } from 'lodash';
import ProjectModel from '../Models/ProjectModel.ts';
import ProjectMemberModel from '../Models/ProjectMemberModel.ts';
import ProjectTimelineModel from '../Models/ProjectTimelineModel.ts';
import CheckScopeService from '../services/checkScope.ts';
import axios from 'axios';


JobModel.knex(knex);
JobRequiredSkillModel.knex(knex);
JobSuggestionModel.knex(knex);
SkillModel.knex(knex);
ProjectModel.knex(knex);
ProjectMemberModel.knex(knex);
ProjectTimelineModel.knex(knex);

const AuthServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';

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
                members: 'object'
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

                // Accept project_id as provided (PRJ codes are now stored directly)
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
            const scopeResult = await CheckScopeService.checkUserScope('projects', authHeader);
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

            let getUserBulk: any;
            try {
                getUserBulk = await axios.post(
                    `${AuthServiceUrl}/api/users/user-bulk`,
                    { userIds: allowedUserIds },
                    { headers: { Authorization: authHeader }, timeout: 5000 }
                );

            } catch (err: any) {
                console.error('Error calling auth service user-bulk:', err?.response?.status, err?.response?.data || err?.message || err);
                // return an upstream error to the client so the request doesn't hang silently
                res.status(502).json({ success: false, message: 'Failed to fetch users from auth service', error: err?.message || err });
                return;
            }


            // Extract users robustly (support various response shapes)
            const users: any[] = Array.isArray(getUserBulk?.data.data) ? getUserBulk.data.data : [];

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
            let ids: string[] = [];
            if (Array.isArray(req.body?.ids) && req.body.ids.length) {
                ids = req.body.ids.map(String);
            } else if (req.params?.id) {
                ids = [String(req.params.id)];
            }

            if (!ids.length) {
                res.status(400).json({ success: false, message: 'No project IDs provided for deletion' });
                return;
            }

            await knex.transaction(async (trx) => {
                // delete projects and related rows within the same transaction
                await Promise.all([
                    ProjectModel.query(trx).delete().whereIn('project_id', ids),
                    ProjectMemberModel.query(trx).delete().whereIn('project_id', ids),
                    ProjectTimelineModel.query(trx).delete().whereIn('project_id', ids)
                ]);
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

            // Fetch project with members and timeline
            const project = await ProjectModel.query()
                .findById(id)
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
                    const resp = await axios.post(
                        `${AuthServiceUrl}/api/users/user-bulk`,
                        { userIds },
                        { headers: { Authorization: authHeader }, timeout: 5000 }
                    );
                    userBulkData = Array.isArray(resp?.data?.data) ? resp.data.data : [];
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
                members: 'object'
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

                // Update project
                const updatedProject = await ProjectModel.query(trx)
                    .patchAndFetchById(id, updateData);

                if (!updatedProject) {
                    await trx.rollback();
                    res.status(404).json({ success: false, message: 'Project not found' });
                    return;
                }

                // Update members if provided
                if (Array.isArray(params.members)) {
                    // Delete existing members
                    await ProjectMemberModel.query(trx).delete().where('project_id', id);

                    // Insert new members
                    const toInsert: any[] = [];
                    for (const member of params.members) {
                        const user_id = member.id ?? member.user_id;
                        if (!user_id) continue;

                        toInsert.push({
                            project_id: id,
                            user_id,
                            role: member.role || null,
                            joined_at: dayjs().toISOString()
                        });
                    }

                    if (toInsert.length) {
                        await ProjectMemberModel.query(trx).insert(toInsert);
                    }
                }

                // Add timeline event
                await ProjectTimelineModel.query(trx).insert({
                    project_id: id,
                    event_type: 'updated',
                    title: 'Dự án được cập nhật',
                    description: `Dự án "${updatedProject.name}" đã được cập nhật.`,
                    user_id: params.managerId || updatedProject.manager_id,
                    event_time: dayjs().toISOString()
                });

                await trx.commit();

                // Fetch updated project with relations
                const project = await ProjectModel.query()
                    .findById(id)
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
                        const resp = await axios.post(
                            `${AuthServiceUrl}/api/users/user-bulk`,
                            { userIds },
                            { headers: { Authorization: authHeader }, timeout: 5000 }
                        );
                        userBulkData = Array.isArray(resp?.data?.data) ? resp.data.data : [];
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

}

export default ProjectController;
