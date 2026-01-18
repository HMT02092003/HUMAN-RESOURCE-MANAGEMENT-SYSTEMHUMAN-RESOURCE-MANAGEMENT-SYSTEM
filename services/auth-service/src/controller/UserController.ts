import { Request, Response } from "express";
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import UserModel from "@/src/Models/UserModel";
import RoleModel from "@/src/Models/RoleModel";
import { validate, ValidationException } from "@/src/utils/validation-utility";
import constantConfig from "@/src/config/constant";
import bcrypt from 'bcryptjs';
import _ from "lodash";

import { getDecodedToken } from "@/src/utils/decode-token";
import { getUserData, getUserId } from "@/src/utils/getUserData";

import os from 'os';
import EmployeeService from "../integrations/EmployeeService";
import AIService from "../integrations/AIService";

function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const API_GATEWAY_URL = `http://localhost:${process.env.API_GATEWAY_PORT || 4000}`;
const { Gender, statusOptions, Relationship } = constantConfig;

// Resolve absolute path for frontend public directory
const getFrontendPublicPath = (...segments: string[]): string => {
  // services/auth-service -> repo root -> frontend/public
  return path.resolve(process.cwd(), "../../frontend/public", ...segments);
};

// Map stored URL path to absolute filesystem path
const resolvePhotoAbsolutePath = (storedPath: string): string => {
  if (!storedPath) return '';
  const normalized = storedPath.replace(/\\/g, '/');
  if (normalized.startsWith('/identificationPhoto/')) {
    return getFrontendPublicPath(normalized.replace('/identificationPhoto/', 'identificationPhoto/'));
  }
  return path.join(process.cwd(), normalized);
};

// Helper function to handle file upload and save with username into frontend/public
const handleIdentificationPhotoUpload = (file: any, username: string): string => {
  try {
    // Tạo thư mục identificationPhoto trong frontend/public nếu chưa tồn tại
    const uploadDir = getFrontendPublicPath('identificationPhoto');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Lấy extension từ file gốc
    const fileExtension = path.extname(file.originalname || file.name || '.jpg');

    // Tạo tên file mới với username
    const fileName = `${username}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);

    // Nếu file đã tồn tại, xóa file cũ
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Lưu file mới
    if (file.buffer) {
      // Nếu file có buffer (từ multer memory storage)
      fs.writeFileSync(filePath, file.buffer);
    } else if (file.path) {
      // Nếu file được lưu tạm thời (từ multer disk storage)
      fs.copyFileSync(file.path, filePath);
      fs.unlinkSync(file.path); // Xóa file tạm
    }

    // Trả về đường dẫn public phía FE
    return ('/identificationPhoto/' + fileName).replace(/\\/g, '/');
  } catch (error) {
    console.error('Error handling identification photo upload:', error);
    throw new Error('Lỗi khi lưu ảnh đại diện');
  }
};

// Helper function to delete old identification photo (supports legacy path and new FE public path)
const deleteOldIdentificationPhoto = (oldPhotoPath: string): void => {
  try {
    if (oldPhotoPath) {
      const candidates: string[] = [];
      // New location in FE public
      candidates.push(resolvePhotoAbsolutePath(oldPhotoPath));
      // Legacy location inside this service
      candidates.push(path.join(process.cwd(), oldPhotoPath));

      candidates.forEach((p) => {
        try {
          if (p && fs.existsSync(p)) fs.unlinkSync(p);
        } catch { }
      });
    }
  } catch (error) {
    console.error('Error deleting old identification photo:', error);
  }
};

/**
 * Unified search API - Search users by keyword (fullName, phone, or email)
 */


/**
 * Get all users with pagination and filtering
 */
export const getAllUsers = async (req: any, res: Response) => {
  try {
    const auth = getUserData(req);
    if (!auth || !auth.id) {
      return res.status(401).json({
        success: false,
        message: "Người dùng không được xác thực"
      });
    }
    
    const scope = "users";
    let inputs = { ...req.query, ...req.body };

    let project = ["users.*"];
    let currentDate = new Date();

    let userIds: number[] = await UserModel.checkScope(scope, req);

    // console.log("userIds", userIds);

    // Retrieve page and pageSize from query parameters, defaulting to 0 and 10
    // Ensure these are treated as numbers
    // Accept 1-based page from clients, but work if page=0 is provided.
    const rawPage = req.query.page !== undefined ? parseInt(req.query.page as string, 10) : 1;
    const page = Math.max(0, (isNaN(rawPage) ? 1 : rawPage) - 1);
    const pageSize = parseInt(req.query.pageSize as string, 10) || 10;

    // Fetch users WITHOUT joins
    let baseQuery = UserModel.query()
      .select(project)
      .whereIn("users.id", userIds)
      .where("users.status", 1)
      .withGraphJoined("[role]");

    if (auth && auth.id) {
      baseQuery = baseQuery.whereNot("users.id", auth.id as any);
    }

    let result: any = (await baseQuery.skipUndefined().page(page, pageSize)) as any;

    // Lấy chi tiết department và chevron cho từng user (nếu có id)
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    const authToken = token ? `Bearer ${token}` : undefined;
    const currentUserData = getUserData(req);
    
    const usersWithDetails = await Promise.all(result.results.map(async (user: any) => {
      let department = null;
      let chevron = null;
      
      try {
        if (user.departmentId) {
          department = await EmployeeService.getDepartmentById(user.departmentId, authToken, currentUserData);
        }
      } catch (e: any) {
        console.error(`Error fetching department ${user.departmentId}:`, e.message || 'Unknown error');
      }
      
      try {
        if (user.chevronId) {
          chevron = await EmployeeService.getChevronDetail(user.chevronId, authToken, currentUserData);
        }
      } catch (e: any) {
        console.error(`Error fetching chevron ${user.chevronId}:`, e.message || 'Unknown error');
      }
      
      return {
        ...user,
        department,
        chevron,
      };
    }));

    result.results = usersWithDetails;

    return res.status(200).json(result); // { results: [...], total: N }
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
}

/**
 * Get all users with server-side pagination, sorting, and filtering
 * Query params:
 *   - page: page number (1-based, default 1)
 *   - pageSize: items per page (default 10)
 *   - sortField: field to sort by (e.g., 'id', 'fullName', 'email', 'createdAt')
 *   - sortOrder: 'ascend' | 'descend' (default 'descend')
 *   - search: global search keyword
 *   - username, fullName, email, phone, gender, status, roleId, departmentId, chevronId: column filters
 *   - startDateFrom, startDateTo: date range for startDate
 *   - createdAtFrom, createdAtTo: date range for createdAt
 */
export const getAllUsersAll = async (req: any, res: Response) => {
  try {
    const { auth } = req as any;
    const scope = req.query.scope || 'users';

    // Pagination params
    const rawPage = req.query.page !== undefined ? parseInt(req.query.page as string, 10) : 1;
    const page = Math.max(0, (isNaN(rawPage) ? 1 : rawPage) - 1); // Convert to 0-based
    const pageSize = parseInt(req.query.pageSize as string, 10) || 10;

    // Sort params
    const sortField = (req.query.sortField as string) || 'id';
    const sortOrder = req.query.sortOrder === 'ascend' ? 'asc' : 'desc';

    // Filter params
    const search = (req.query.search as string || '').trim();
    const usernameFilter = (req.query.username as string || '').trim();
    const fullNameFilter = (req.query.fullName as string || '').trim();
    const emailFilter = (req.query.email as string || '').trim();
    const phoneFilter = (req.query.phone as string || '').trim();
    const genderFilter = req.query.gender as string;
    const statusFilter = req.query.status as string;
    const roleIdFilter = req.query.roleId ? parseInt(req.query.roleId as string, 10) : null;
    const roleNameFilter = (req.query['role.name'] as string || '').trim();
    const departmentIdFilter = req.query.departmentId ? parseInt(req.query.departmentId as string, 10) : null;
    const departmentNameFilter = (req.query['department.name'] as string || '').trim();
    const chevronIdFilter = req.query.chevronId ? parseInt(req.query.chevronId as string, 10) : null;
    const chevronNameFilter = (req.query['chevron.name'] as string || '').trim();
    const startDateFrom = req.query.startDateFrom as string;
    const startDateTo = req.query.startDateTo as string;
    const createdAtFrom = req.query.createdAtFrom as string;
    const createdAtTo = req.query.createdAtTo as string;

    // Determine which user IDs are visible under the provided scope
    let userIds: number[] = await UserModel.checkScope(scope, req);
    console.log('getAllUsersAll - userIds from checkScope:', userIds.length);

    // Fetch department/chevron IDs if name filters are provided
    let departmentIdsToFilter: number[] | null = null;
    let chevronIdsToFilter: number[] | null = null;
    
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    const authToken = token ? `Bearer ${token}` : undefined;
    const currentUserData = getUserData(req);
    
    if (departmentNameFilter) {
      try {
        const allDepartments = await EmployeeService.getAllDepartments(authToken, currentUserData);
        departmentIdsToFilter = allDepartments
          .filter((d: any) => d.name && d.name.toLowerCase().includes(departmentNameFilter.toLowerCase()))
          .map((d: any) => d.id);
        console.log('Department name filter:', departmentNameFilter, '-> IDs:', departmentIdsToFilter);
      } catch (e) {
        console.error('Error fetching departments for filter:', e);
      }
    }
    
    if (chevronNameFilter) {
      try {
        const allChevrons = await EmployeeService.getAllChevrons(authToken, currentUserData);
        chevronIdsToFilter = allChevrons
          .filter((c: any) => c.name && c.name.toLowerCase().includes(chevronNameFilter.toLowerCase()))
          .map((c: any) => c.id);
        console.log('Chevron name filter:', chevronNameFilter, '-> IDs:', chevronIdsToFilter);
      } catch (e) {
        console.error('Error fetching chevrons for filter:', e);
      }
    }

    // Build query
    let query = UserModel.query()
      .select(['users.*'])
      .whereIn('users.id', userIds)
      .where('users.status', 1);

    if (auth && auth.id) {
      query = query.whereNot('users.id', auth.id as any);
    }
    query = query.skipUndefined();

    // Apply global search (OR across multiple fields)
    if (search) {
      query = query.where(function () {
        this.where('users.username', 'like', `%${search}%`)
          .orWhere('users.fullName', 'like', `%${search}%`)
          .orWhere('users.email', 'like', `%${search}%`)
          .orWhere('users.phone', 'like', `%${search}%`);
      });
    }

    // Apply column-specific filters (AND)
    if (usernameFilter) {
      query = query.where('users.username', 'like', `%${usernameFilter}%`);
    }
    if (fullNameFilter) {
      query = query.where('users.fullName', 'like', `%${fullNameFilter}%`);
    }
    if (emailFilter) {
      query = query.where('users.email', 'like', `%${emailFilter}%`);
    }
    if (phoneFilter) {
      query = query.where('users.phone', 'like', `%${phoneFilter}%`);
    }
    if (genderFilter) {
      query = query.where('users.gender', genderFilter);
    }
    if (statusFilter) {
      query = query.where('users.status', statusFilter);
    }
    if (roleIdFilter) {
      query = query.where('users.roleId', roleIdFilter);
    }
    if (departmentIdFilter) {
      query = query.where('users.departmentId', departmentIdFilter);
    }
    if (departmentIdsToFilter !== null) {
      if (departmentIdsToFilter.length > 0) {
        query = query.whereIn('users.departmentId', departmentIdsToFilter);
      } else {
        // No departments match the name filter, return empty result
        query = query.where('users.id', -1);
      }
    }
    if (chevronIdFilter) {
      query = query.where('users.chevronId', chevronIdFilter);
    }
    if (chevronIdsToFilter !== null) {
      if (chevronIdsToFilter.length > 0) {
        query = query.whereIn('users.chevronId', chevronIdsToFilter);
      } else {
        // No chevrons match the name filter, return empty result
        query = query.where('users.id', -1);
      }
    }
    if (startDateFrom) {
      query = query.where('users.startDate', '>=', startDateFrom);
    }
    if (startDateTo) {
      query = query.where('users.startDate', '<=', startDateTo);
    }
    if (createdAtFrom) {
      query = query.where('users.createdAt', '>=', createdAtFrom);
    }
    if (createdAtTo) {
      query = query.where('users.createdAt', '<=', createdAtTo);
    }

    // Apply sorting
    // Map sortField to actual DB column (handle nested fields)
    const sortFieldMap: Record<string, string> = {
      'id': 'users.id',
      'username': 'users.username',
      'fullName': 'users.fullName',
      'email': 'users.email',
      'phone': 'users.phone',
      'gender': 'users.gender',
      'status': 'users.status',
      'startDate': 'users.startDate',
      'createdAt': 'users.createdAt',
      'birthday': 'users.birthday',
      'role.name': 'role.name',
    };
    const dbSortField = sortFieldMap[sortField] || 'users.id';
    query = query.orderBy(dbSortField, sortOrder);

    // Execute with pagination and join role (with role name filter if present)
    let joinedQuery = query.withGraphJoined('[role]');
    
    // Apply role name filter after join
    if (roleNameFilter) {
      joinedQuery = joinedQuery.where('role.name', 'like', `%${roleNameFilter}%`);
    }
    
    const result: any = await joinedQuery.page(page, pageSize);

    console.log('getAllUsersAll - query result:', result.results?.length, 'total:', result.total);

    // Enrich with department and chevron details (reuse token/authToken/currentUserData from above)
    const usersWithDetails = await Promise.all((result.results || []).map(async (user: any) => {
      let department = null;
      let chevron = null;
      try {
        if (user.departmentId) {
          department = await EmployeeService.getDepartmentById(user.departmentId, authToken, currentUserData);
        }
      } catch (e: any) {
        console.error(`Error fetching department ${user.departmentId}:`, e.message || 'Unknown error');
      }
      try {
        if (user.chevronId) {
          chevron = await EmployeeService.getChevronDetail(user.chevronId, authToken, currentUserData);
        }
      } catch (e: any) {
        console.error(`Error fetching chevron ${user.chevronId}:`, e.message || 'Unknown error');
      }
      return {
        ...user,
        department,
        chevron,
      };
    }));

    // Return paginated response
    return res.status(200).json({
      results: usersWithDetails,
      total: result.total,
      page: page + 1, // Return 1-based page
      pageSize,
    });
  } catch (error) {
    console.error("Error fetching users (all):", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
}

export const getAllUsersAllForSelect = async (req: any, res: Response) => {
  try {
    const { auth } = req as any;
    const scope = req.query.scope || 'users';

    // Determine which user IDs are visible under the provided scope
    let userIds: number[] = await UserModel.checkScope(scope, req);

    // Fetch users (no pagination)
    let users: any[] = await UserModel.query()
      .select(['users.*'])
      .whereIn('users.id', userIds)
      // .whereNot('users.id', auth?.id)
      .where('users.status', 1)
      .withGraphJoined('[role]');

    // Enrich with department and chevron details (reuse same logic as paginated endpoint)
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    const authToken = token ? `Bearer ${token}` : undefined;
    const currentUserData = getUserData(req);

    const usersWithDetails = await Promise.all(users.map(async (user: any) => {
      let department = null;
      let chevron = null;
      try {
        if (user.departmentId) {
          department = await EmployeeService.getDepartmentById(user.departmentId, authToken, currentUserData);
        }
      } catch (e: any) {
        console.error(`Error fetching department ${user.departmentId}:`, e.message || 'Unknown error');
      }
      try {
        if (user.chevronId) {
          chevron = await EmployeeService.getChevronDetail(user.chevronId, authToken, currentUserData);
        }
      } catch (e: any) {
        console.error(`Error fetching chevron ${user.chevronId}:`, e.message || 'Unknown error');
      }
      return {
        ...user,
        department,
        chevron,
      };
    }));

    return res.status(200).json(usersWithDetails);
  } catch (error) {
    console.error("Error fetching users (all):", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
}

/**
 * Create a new user
 */
export const createUser = async (req: Request, res: Response) => {
  try {
    const auth = getUserData(req) || (req as any).auth;
    // Clone and normalize inputs to be tolerant with different frontend payload shapes
    const inputs: any = { ...req.body };

    // Normalize family members: accept `fullName` from FE and map to `name`
    if (Array.isArray(inputs.profileFamily)) {
      inputs.profileFamily = inputs.profileFamily.map((member: any) => ({
        name: member?.name ?? member?.fullName ?? "",
        relationship: member?.relationship,
        birthday: member?.birthday,
        dependent: member?.dependent ?? false,
      }));
    }

    // Normalize contract: accept top-level contract fields if `contract` wrapper is missing
    const hasTopLevelContractFields =
      inputs.contractTypeId !== undefined ||
      inputs.startDate !== undefined ||
      inputs.activeDay !== undefined ||
      inputs.endDate !== undefined ||
      inputs.insurance !== undefined;

    if (!inputs.contract && hasTopLevelContractFields) {
      inputs.contract = {
        contractTypeId: inputs.contractTypeId,
        startDate: inputs.startDate,
        endDate: inputs.endDate,
        activeDay: inputs.activeDay,
        insurance: inputs.insurance,
      };
    }
    console.log("Inputs:", inputs);

    const allowFields = {
      fullName: "string!",
      username: "string!",
      password: "string!",
      roleId: "number!",
      email: "string!",
      departmentId: "number!",
      chevronId: "number!",
      status: "number",
      gender: "number",
      phone: "string",
      birthday: "date",
      startDate: "date",
      identificationPhoto: "string", // saved file relative path
      profileFamily: [
        {
          name: "string",
          relationship: "number",
          birthday: "date",
          dependent: "boolean",
        },
      ],
      contract: {
        contractTypeId: "number",
        startDate: "date",
        endDate: "date",
        activeDay: "date",
        insurance: "number",
        salary: "number",
        allowance_type_ids: ["number"],
      },
    };

    const params = validate(inputs, allowFields, {
      removeNotAllow: true,
    });

    console.log("Create user params:", params);

    // Xử lý upload ảnh đại diện nếu có
    if (req.file || (req as any).files?.identificationPhoto) {
      const photoFile = req.file || (req as any).files?.identificationPhoto;
      if (photoFile) {
        try {
          params.identificationPhoto = handleIdentificationPhotoUpload(photoFile, params.username);
        } catch (uploadError) {
          return res.status(400).json({
            message: uploadError instanceof Error ? uploadError.message : "Lỗi khi tải ảnh",
            code: 7003
          });
        }
      }
    }

    // Stringify profileFamily if it's meant to be stored as a JSON string in the database
    if (params.profileFamily) {
      // Ensure each member has the correct property name
      const normalizedFamily = (params.profileFamily as any[]).map((m: any) => ({
        name: m?.name ?? "",
        relationship: m?.relationship,
        birthday: m?.birthday,
        dependent: m?.dependent ?? false,
      }));
      params.profileFamily = JSON.stringify(normalizedFamily);
    }

    // Convert Date objects to ISO strings for database storage
    if (params.birthday && params.birthday instanceof Date) {
      params.birthday = params.birthday.toISOString();
    }
    if (params.startDate && params.startDate instanceof Date) {
      params.startDate = params.startDate.toISOString();
    }

    // ✅ BỎ VALIDATION BẮT BUỘC ẢNH - Cho phép tạo user không cần ảnh
    // Validate required identificationPhoto presence on create
    // if (!params.identificationPhoto) {
    //   return res.status(400).json({ message: "Vui lòng tải ảnh đại diện (identificationPhoto)", code: 7002 });
    // }

    // Check for existing user by username or email
    const existingUser = await UserModel.query()
      .where("username", params.username)
      .orWhere("email", params.email)
      .first();

    if (existingUser) {
      if (existingUser.username === params.username) {
        return res.status(400).json({ message: "Tên đăng nhập đã tồn tại!", code: 5005 });
      }
      if (existingUser.email === params.email) {
        return res.status(400).json({ message: "Email đã tồn tại!", code: 6021 });
      }
    }

    // Validate role
    const role = await RoleModel.query().findById(params.roleId);
    if (!role) return res.status(400).json({ message: "Vai trò người dùng không tồn tại!", code: 5006 });

    // Validate department and chevron using employee-service
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    const authToken = token ? `Bearer ${token}` : undefined;
    const currentUserData = getUserData(req);

    try {
      const department = await EmployeeService.getDepartmentById(params.departmentId, authToken, currentUserData);
      if (!department) {
        return res.status(400).json({ message: "Phòng ban không tồn tại!", code: 5008 });
      }
    } catch (e) {
      return res.status(400).json({ message: "Phòng ban không tồn tại!", code: 5008 });
    }

    try {
      const chevron = await EmployeeService.getChevronDetail(params.chevronId, authToken, currentUserData);
      if (!chevron) {
        return res.status(400).json({ message: "Chức vụ không tồn tại!", code: 5007 });
      }
    } catch (e) {
      return res.status(400).json({ message: "Chức vụ không tồn tại!", code: 5007 });
    }

    // Hash the user's password using bcrypt
    params.password = await bcrypt.hash(params.password, 10);

    // Destructure contract out of params, the rest goes into userData
    let { contract, ...userData } = params;

    // Add createdBy from auth ID
    if (auth && auth.id) {
      userData = {
        ...userData,
        createdBy: auth.id,
      };
    } else {
      console.warn('⚠️ [CREATE USER] Missing auth ID for createdBy field');
      // Optional: Set a fallback if appropriate, or leave null if DB allows
    }

    console.log("User data:", userData);

    // Insert the new user into the database
    const newUser = await UserModel.query().insert(userData);
    console.log('✅ User created with ID:', newUser.id);

    // Track what needs to be rolled back if any step fails
    let createdContractId: number | null = null;
    let needsUserRollback = false;

    try {
      // Step 1: Process AI face recognition if photo provided
      if (req.file || (req as any).files?.identificationPhoto) {
        const photoFile = req.file || (req as any).files?.identificationPhoto;
        console.log('🔍 [CREATE USER] Found photo file for AI processing');

        if (photoFile) {
          try {
            const aiServiceUrl = `${API_GATEWAY_URL}/api/ai/register-face`;
            const formData = new FormData();
            let imageBuffer = null;
            let imageName = photoFile.originalname || 'face.jpg';

            if (userData.identificationPhoto) {
              const savedPhotoPath = resolvePhotoAbsolutePath(userData.identificationPhoto);
              if (fs.existsSync(savedPhotoPath)) {
                imageBuffer = fs.readFileSync(savedPhotoPath);
                imageName = path.basename(savedPhotoPath);
              }
            }

            if (!imageBuffer) {
              if (photoFile.buffer) {
                imageBuffer = photoFile.buffer;
              } else if (photoFile.path && fs.existsSync(photoFile.path)) {
                imageBuffer = fs.readFileSync(photoFile.path);
              }
            }

            if (imageBuffer) {
              formData.append('image', imageBuffer, {
                filename: imageName,
                contentType: photoFile.mimetype || 'image/jpeg',
              });
              formData.append('user_id', newUser.id.toString());
              formData.append('username', params.username);

              const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
              const aiHeaders: any = {};
              if (token) aiHeaders['Authorization'] = `Bearer ${token}`;

              const aiResponse = await AIService.registerFace(formData, aiHeaders['Authorization']);
              if (aiResponse.success) {
                console.log('✅ [CREATE USER] Face embedding saved successfully');
              }
            }
          } catch (aiError: any) {
            console.error('❌ [CREATE USER] Error saving face embedding:', aiError.message);
            // Don't fail user creation if AI service fails
          }
        }
      }

      // Step 2: Handle contract creation if contract data is provided
      if (params.contract && params.contract.contractTypeId) {
        needsUserRollback = true; // Enable rollback from this point

        // Coerce date strings to Date objects
        if (params.contract.startDate && typeof params.contract.startDate === 'string') {
          params.contract.startDate = new Date(params.contract.startDate);
        }
        if (params.contract.endDate && typeof params.contract.endDate === 'string') {
          params.contract.endDate = new Date(params.contract.endDate);
        }
        if (params.contract.activeDay && typeof params.contract.activeDay === 'string') {
          params.contract.activeDay = new Date(params.contract.activeDay);
        }

        // Validate contract dates
        if (params.contract.endDate && new Date(params.contract.endDate) <= new Date(params.contract.startDate)) {
          throw new Error("Ngày kết thúc phải sau ngày ký!");
        }
        if (new Date(params.contract.activeDay) < new Date(params.contract.startDate)) {
          throw new Error("Ngày bắt đầu phải sau hoặc bằng ngày ký!");
        }

        // Verify contract type exists
        try {
          const contractType = await EmployeeService.getContractTypeById(params.contract.contractTypeId, authToken, currentUserData);
          if (!contractType) {
            throw new Error("Loại hợp đồng không tồn tại!");
          }
        } catch (e) {
          throw new Error("Loại hợp đồng không tồn tại!");
        }

        // Prepare contract parameters
        // Salary and allowance_type_ids might be at top level or inside contract object
        const salary = params.contract.salary || params.salary;
        const allowance_type_ids = params.contract.allowance_type_ids || params.allowance_type_ids;

        const contractParams: any = {
          contractTypeId: params.contract.contractTypeId,
          startDate: params.contract.startDate instanceof Date
            ? params.contract.startDate.toISOString()
            : params.contract.startDate,
          endDate: params.contract.endDate instanceof Date
            ? params.contract.endDate.toISOString()
            : params.contract.endDate,
          activeDay: params.contract.activeDay instanceof Date
            ? params.contract.activeDay.toISOString()
            : params.contract.activeDay,
          insurance: params.contract.insurance,
          salary: salary, // Use extracted value
          allowance_type_ids: allowance_type_ids, // Use extracted value
          userId: newUser.id,
          created_at: new Date(),
        };

        console.log('📝 Creating contract with params:', contractParams);

        // Call employee-service to create contract and salary
        const userDataForHeader = getUserData(req) || auth;
        const contractResponse = await EmployeeService.createContract(newUser.id, contractParams, authToken, userDataForHeader);

        console.log('✅ Contract and salary created successfully');
        createdContractId = contractResponse?.id || null;
      }

      // Success! Return the newly created user (without password)
      const { password: _, ...userWithoutPassword } = newUser;
      return res.status(201).json(newUser);

    } catch (innerError: any) {
      // Something failed after user creation - perform rollback
      console.error('❌ Error after user creation:', innerError.response?.data || innerError.message);

      // ROLLBACK: Delete the created user if contract creation was attempted
      if (needsUserRollback) {
        try {
          await UserModel.query().findById(newUser.id).delete();
          console.log('✅ User rollback successful (deleted user ID:', newUser.id, ')');
        } catch (rollbackErr) {
          console.error('❌ CRITICAL: User rollback failed:', rollbackErr);
        }
      }

      // Determine error message
      const errorMsg = innerError?.response?.data?.error
        || innerError?.response?.data?.message
        || innerError?.message
        || 'Tạo hợp đồng hoặc lương thất bại';

      return res.status(400).json({
        message: errorMsg,
        code: 7001,
        details: {
          stage: createdContractId ? 'salary' : 'contract',
          rolledBackUserId: newUser.id,
          contractId: createdContractId
        }
      });
    }
  } catch (error) {
    console.error("Error creating user:", error);

    // Handle custom ValidationException
    if (error instanceof ValidationException) {
      return res.status(error.status).json({
        error: error.message,
        code: error.code
      });
    }

    // Handle other errors
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Lỗi máy chủ nội bộ",
      code: 500
    });
  }
};

/**
 * Get users by departmentId or departmentIds (for internal service use)
 */
export const getUsersByDepartment = async (req: Request, res: Response) => {
  try {
    let { departmentId, departmentIds } = req.query;
    let query = UserModel.query().select('id', 'username', 'email', 'departmentId');

    if (departmentId) {
      // Ép kiểu về number (nếu là string)
      const depId = Array.isArray(departmentId) ? Number(departmentId[0]) : Number(departmentId);
      query = query.where('departmentId', depId);
    } else if (departmentIds) {
      // departmentIds có thể là chuỗi "1,2,3" hoặc mảng
      let ids: number[] = [];
      if (Array.isArray(departmentIds)) {
        ids = departmentIds.map(id => Number(id));
      } else {
        ids = String(departmentIds).split(',').map(Number);
      }
      query = query.whereIn('departmentId', ids);
    } else {
      return res.status(400).json({ error: 'Missing departmentId or departmentIds' });
    }

    const users = await query;
    return res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users by department:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Get users by chevronId or chevronIds (for internal service use)
 */


/**
 * Get user details by ID
 */
export const getUserDetail = async (req: Request, res: Response) => {
  try {
    const allowFields = {
      id: "number!",
    };
    const currentDate = new Date();
    // Lấy id từ params (RESTful URL), query, hoặc body
    let inputs = {
      id: req.params.id || req.query.id || req.body.id,
      ...req.query,
      ...req.body
    };

    // Debug logging để kiểm tra id
    console.log("=== getUserDetail Debug ===");
    console.log("req.params:", req.params);
    console.log("req.query:", req.query);
    console.log("req.body:", req.body);
    console.log("inputs:", inputs);

    let params = validate(inputs, allowFields, { removeNotAllow: true });

    console.log("params after validation:", params);

    // Fetch user basic info
    let result = await UserModel.query()
      .findById(params.id)
      .select([
        "users.id as id",
        "users.username",
        "users.fullName",
        "users.email",
        "users.roleId",
        "users.createdAt",
        "users.status",
        "users.profileFamily",
        "users.departmentId",
        "users.chevronId",
        "users.phone",
        "users.birthday",
        "users.gender",
        "users.startDate",
        "users.dayOff",
        "users.identificationPhoto"
      ]);

    if (!result) {
      return res.status(404).json({ message: "Người dùng không tồn tại!", code: 5003 });
    }

    // Get role info
    const role = await RoleModel.query().findById(result.roleId);

    // Get department and chevron from employee-service
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    const authToken = token ? `Bearer ${token}` : undefined;
    const currentUserData = getUserData(req);

    let department = null;
    let chevron = null;
    let contract = null;
    let contractsList: any[] = [];

    try {
      if (result.departmentId) {
        department = await EmployeeService.getDepartmentById(result.departmentId, authToken, currentUserData);
      }
    } catch (e) {
      console.error('Error fetching department from gateway', e);
    }

    try {
      if (result.chevronId) {
        chevron = await EmployeeService.getChevronDetail(result.chevronId, authToken, currentUserData);
      }
    } catch (e) {
      console.error('Error fetching chevron from gateway', e);
    }

    // Get contract info from employee-service
    try {
      const contracts = await EmployeeService.getContractsByUserId(result.id, authToken, currentUserData);
      if (contracts && contracts.length > 0) {

        // Classify: upcoming if now < activeDay; effective if activeDay <= now <= endDate (or endDate null);
        // past otherwise. Among effective ones, select the one with the latest activeDay <= now as current.
        contracts.sort((a: any, b: any) => new Date(a.activeDay).getTime() - new Date(b.activeDay).getTime());
        const nowMs = currentDate.getTime();
        let currentIdx = -1;
        let maxActiveMs = -Infinity;
        contracts.forEach((c: any, idx: number) => {
          const activeMs = new Date(c.activeDay).getTime();
          const endMs = c.endDate ? new Date(c.endDate).getTime() : Infinity;
          if (activeMs > nowMs) {
            c.status = 'upcoming';
          } else if (endMs < nowMs) {
            c.status = 'past';
          } else {
            // effective window
            c.status = 'past'; // temporary, will mark one as current below
            if (activeMs <= nowMs && activeMs > maxActiveMs) {
              maxActiveMs = activeMs;
              currentIdx = idx;
            }
          }
        });

        if (currentIdx >= 0) {
          contracts[currentIdx].status = 'current';
          contract = contracts[currentIdx];
        }

        // Sort for FE display: current -> upcoming -> past, then by activeDay asc
        const statusRank: Record<string, number> = { current: 0, upcoming: 1, past: 2 } as const;
        contracts.sort((a: any, b: any) => {
          const rankDiff = (statusRank[a.status] ?? 3) - (statusRank[b.status] ?? 3);
          if (rankDiff !== 0) return rankDiff;
          return new Date(a.activeDay).getTime() - new Date(b.activeDay).getTime();
        });

        contractsList = contracts;
      }
    } catch (e) {
      console.error('Error fetching contract from gateway', e);
    }

    // Combine all data
    const userWithDetails = {
      ...result,
      role,
      department,
      chevron,
      contract,
      contracts: contractsList
    };

    return res.status(200).json(userWithDetails);
  } catch (error) {
    console.error("Error fetching user detail:", error);

    if (error instanceof ValidationException) {
      return res.status(error.status).json({
        error: error.message,
        code: error.code
      });
    }

    return res.status(500).json({
      message: error instanceof Error ? error.message : "Lỗi máy chủ nội bộ",
      code: 500
    });
  }
};

/**
 * Update an existing user
 */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { auth } = req as any;
    // Lấy id từ params (RESTful URL) hoặc body
    const inputs = {
      id: req.params.id || req.body.id,
      ...req.body
    };

    // Debug logging để kiểm tra id
    console.log("=== updateUser Debug ===");
    console.log("req.params:", req.params);
    console.log("req.body:", req.body);
    console.log("inputs:", inputs);

    const allowFields = {
      id: "number!",
      fullName: "string!",
      username: "string!",
      email: "string!",
      roleId: "number",
      departmentId: "number!",
      chevronId: "number!",
      status: "number",
      gender: "number",
      phone: "string",
      birthday: "date",
      startDate: "date",
      dayOff: "number",
      identificationPhoto: "string",

      profileFamily: [
        {
          name: "string",
          relationship: "number",
          birthday: "date",
          dependent: "boolean",
        },
      ],
    };

    const params = validate(inputs, allowFields, {
      removeNotAllow: true,
    });
    console.log("Update user params:", params);

    const { id, ...updateData } = params;

    const existingUser = await UserModel.query().findById(id);
    if (!existingUser) {
      return res.status(404).json({ message: "Người dùng không tồn tại!", code: 6006 });
    }

    // Xử lý upload ảnh đại diện mới nếu có
    if (req.file || (req as any).files?.identificationPhoto) {
      const photoFile = req.file || (req as any).files?.identificationPhoto;
      console.log('🔍 [UPDATE USER] Found photo file for processing:', {
        hasReqFile: !!req.file,
        hasFilesPhoto: !!(req as any).files?.identificationPhoto,
        fileName: photoFile?.originalname || photoFile?.name,
        fileSize: photoFile?.size || photoFile?.buffer?.length,
        mimeType: photoFile?.mimetype,
        hasBuffer: !!photoFile?.buffer,
        hasPath: !!photoFile?.path
      });

      if (photoFile) {
        try {
          // Xóa ảnh cũ nếu có
          if (existingUser.identificationPhoto) {
            console.log('🗑️ [UPDATE USER] Deleting old photo:', existingUser.identificationPhoto);
            deleteOldIdentificationPhoto(existingUser.identificationPhoto);
          }

          // Lưu ảnh mới với username
          console.log('💾 [UPDATE USER] Saving new photo with username:', updateData.username);
          updateData.identificationPhoto = handleIdentificationPhotoUpload(photoFile, updateData.username);
          console.log('✅ [UPDATE USER] New photo saved at:', updateData.identificationPhoto);

          // Gọi AI service để cập nhật face embedding
          try {
            const aiServiceUrl = `${API_GATEWAY_URL}/api/ai/register-face`;
            console.log('📡 [UPDATE USER] AI Service URL:', aiServiceUrl);

            const formData = new FormData();

            // Đọc file từ vị trí đã lưu thay vì từ file tạm thời
            const savedPhotoPath = resolvePhotoAbsolutePath(updateData.identificationPhoto);
            console.log('📂 [UPDATE USER] Reading saved photo from:', savedPhotoPath);

            let imageBuffer = null;
            let imageName = photoFile.originalname || 'face.jpg';
            
            if (fs.existsSync(savedPhotoPath)) {
              console.log('📎 [UPDATE USER] Adding image from saved path');
              imageBuffer = fs.readFileSync(savedPhotoPath);
              imageName = path.basename(savedPhotoPath);
              console.log('📎 [UPDATE USER] File buffer size:', imageBuffer.length);
            } else if (photoFile.buffer) {
              console.log('📎 [UPDATE USER] Adding image from buffer, size:', photoFile.buffer.length);
              imageBuffer = photoFile.buffer;
            } else {
              console.error('❌ [UPDATE USER] No valid image source found');
              throw new Error('No valid image source found');
            }

            formData.append('image', imageBuffer, {
              filename: imageName,
              contentType: photoFile.mimetype || 'image/jpeg',
            });

            formData.append('user_id', id.toString());
            formData.append('username', updateData.username);

            console.log('📦 [UPDATE USER] FormData contents:', {
              user_id: id.toString(),
              username: updateData.username,
              imageSize: imageBuffer?.length
            });

            const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
            const aiHeaders: any = {};
            if (token) {
              aiHeaders['Authorization'] = `Bearer ${token}`;
            }

            console.log('🔑 [UPDATE USER] Request headers:', {
              hasToken: !!token,
              authHeader: aiHeaders['Authorization'] ? 'Bearer [HIDDEN]' : 'None'
            });

            console.log('🚀 [UPDATE USER] Calling AI service...');

            // Gọi AI service
            const aiResponse = await AIService.registerFace(formData, aiHeaders['Authorization']);

            console.log('📥 [UPDATE USER] AI service response:', {
              status: aiResponse.status,
              success: aiResponse.data?.success,
              message: aiResponse.data?.message,
              data: aiResponse.data?.data
            });

            if (aiResponse.data.success) {
              console.log('✅ [UPDATE USER] Face embedding updated successfully for user:', updateData.username);
            } else {
              console.warn('⚠️ [UPDATE USER] AI service returned error:', aiResponse.data.message);
            }
          } catch (aiError: any) {
            console.error('❌ [UPDATE USER] Error updating face embedding:', {
              message: aiError.message,
              status: aiError.response?.status,
              statusText: aiError.response?.statusText,
              responseData: aiError.response?.data,
              url: aiError.config?.url,
              method: aiError.config?.method
            });

            if (aiError.response) {
              console.error('❌ [UPDATE USER] AI service detailed response:', aiError.response.data);
            }
            // Không fail user update nếu AI service lỗi
          }
        } catch (uploadError) {
          console.error('❌ [UPDATE USER] Upload error:', uploadError);
          return res.status(400).json({
            message: uploadError instanceof Error ? uploadError.message : "Lỗi khi tải ảnh",
            code: 7003
          });
        }
      } else {
        console.log('⚠️ [UPDATE USER] No photo file found despite file detection');
      }
    } else {
      console.log('ℹ️ [UPDATE USER] No photo file provided for update');
    }

    // Nếu username thay đổi và có ảnh đại diện, cần đổi tên file ảnh
    if (updateData.username && updateData.username !== existingUser.username && existingUser.identificationPhoto) {
      try {
        const legacyOld = path.join(process.cwd(), existingUser.identificationPhoto);
        const newOld = resolvePhotoAbsolutePath(existingUser.identificationPhoto);
        const oldPhotoPath = fs.existsSync(newOld) ? newOld : legacyOld;
        if (fs.existsSync(oldPhotoPath)) {
          const fileExtension = path.extname(existingUser.identificationPhoto);
          const newFileName = `${updateData.username}${fileExtension}`;
          const newPhotoPath = getFrontendPublicPath('identificationPhoto', newFileName);

          // Copy file với tên mới
          fs.copyFileSync(oldPhotoPath, newPhotoPath);
          // Xóa file cũ
          fs.unlinkSync(oldPhotoPath);

          // Cập nhật đường dẫn trong database (FE public URL)
          updateData.identificationPhoto = ('/identificationPhoto/' + newFileName).replace(/\\/g, '/');
        }
      } catch (renameError) {
        console.error('Error renaming identification photo:', renameError);
      }
    }

    // Stringify profileFamily if it's meant to be stored as a JSON string in the database
    if (updateData.profileFamily) {
      updateData.profileFamily = JSON.stringify(updateData.profileFamily);
    }

    // Convert Date objects to ISO strings for database storage
    if (updateData.birthday && updateData.birthday instanceof Date) {
      updateData.birthday = updateData.birthday.toISOString();
    }
    if (updateData.startDate && updateData.startDate instanceof Date) {
      updateData.startDate = updateData.startDate.toISOString();
    }

    // Check for unique constraints only if values have changed
    const usernameChanged =
      params.username && params.username !== existingUser.username;
    const emailChanged =
      updateData.email && updateData.email !== existingUser.email;

    if (usernameChanged || emailChanged) {
      const query = UserModel.query().whereNot("id", id).skipUndefined();

      if (usernameChanged) {
        query.where(function () {
          this.orWhere("username", params.username);
        });
      }

      if (emailChanged) {
        query.where(function () {
          this.orWhere("email", updateData.email);
        });
      }

      const duplicateUser = await query.first();

      if (duplicateUser) {
        if (usernameChanged && duplicateUser.username === params.username) {
          return res.status(400).json({ message: "Tên đăng nhập đã tồn tại!", code: 6007 });
        }
        if (emailChanged && duplicateUser.email === updateData.email) {
          return res.status(400).json({ message: "Email đã tồn tại!", code: 6021 });
        }
      }
    }

    // Validate related entities using employee-service
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    const headers: any = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      if (updateData.departmentId) {
        const department = await EmployeeService.getDepartmentById(updateData.departmentId, headers['Authorization']);
        if (!department) {
          return res.status(400).json({ message: "Phòng ban không tồn tại!", code: 5008 });
        }
      }
    } catch (e) {
      return res.status(400).json({ message: "Phòng ban không tồn tại!", code: 5008 });
    }

    try {
      if (updateData.chevronId) {
        const chevron = await EmployeeService.getChevronDetail(updateData.chevronId, headers['Authorization']);
        if (!chevron) {
          return res.status(400).json({ message: "Chức vụ không tồn tại!", code: 5007 });
        }
      }
    } catch (e) {
      return res.status(400).json({ message: "Chức vụ không tồn tại!", code: 5007 });
    }

    // Validate role
    if (updateData.roleId) {
      const role = await RoleModel.query().findById(updateData.roleId);
      if (!role) {
        return res.status(400).json({ message: "Vai trò người dùng không tồn tại!", code: 5006 });
      }
    }

    const paramsData = {
      ...updateData,
      updatedBy: auth.id,
      updatedAt: new Date(),
    };

    console.log("Update user data:", paramsData);

    const result = await UserModel.query().findById(id).patch(paramsData);
    const updatedUser = await UserModel.query().findById(id);
    if (updatedUser) {
      const { password, ...userWithoutPassword } = updatedUser;
      return res.status(200).json({
        updated: userWithoutPassword,
        old: existingUser,
      });
    }

    return res.status(200).json({
      updated: updatedUser,
      old: existingUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);

    if (error instanceof ValidationException) {
      return res.status(error.status).json({
        error: error.message,
        code: error.code
      });
    }

    return res.status(500).json({
      message: error instanceof Error ? error.message : "Lỗi máy chủ nội bộ",
      code: 500
    });
  }
};

/**
 * Delete a single user
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { auth } = req as any;
    // Lấy id từ params (RESTful URL), query, hoặc body
    let id = req.params.id || req.query.id || req.body.id;

    // Debug logging để kiểm tra id
    console.log("=== deleteUser Debug ===");
    console.log("req.params:", req.params);
    console.log("req.query:", req.query);
    console.log("req.body:", req.body);
    console.log("id:", id);

    if (!id) {
      return res.status(400).json({ message: "Thiếu ID!", code: 9996 });
    }

    let exist = await UserModel.query().findById(id);
    if (!exist) {
      return res.status(404).json({ message: "Người dùng không tồn tại!", code: 6006 });
    }

    if ([id].includes(auth.id)) {
      return res.status(400).json({
        message: "Bạn không thể xóa tài khoản của chính mình.",
        code: 6022
      });
    }

    // Cập nhật status thành "3" thay vì xóa user
    await UserModel.query().findById(id).patch({ status: "3" });

    return res.status(200).json({
      message: "Cập nhật trạng thái thành công",
      old: exist,
      newStatus: 3
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Lỗi máy chủ nội bộ",
      code: 500
    });
  }
};

/**
 * Delete multiple users
 */
export const deleteMultipleUsers = async (req: Request, res: Response) => {
  try {
    const { auth } = req as any;
    const allowFields = {
      ids: ["number!"],
    };
    const inputs = req.body;
    let params = validate(inputs, allowFields);

    let exist = await UserModel.query().whereIn("id", params.ids);
    if (!exist || exist.length !== params.ids.length) {
      return res.status(404).json({ message: "Người dùng không tồn tại!", code: 6006 });
    }

    if (params.ids.includes(auth.id)) {
      return res.status(400).json({
        message: "Bạn không thể xóa tài khoản của chính mình.",
        code: 6022
      });
    }

    // Cập nhật status thành "3" thay vì xóa users
    await UserModel.query().whereIn("id", params.ids).patch({ status: "3" });

    return res.status(200).json({
      message: "Cập nhật trạng thái thành công",
      old: {
        usernames: (exist || []).map((user) => user.username).join(", "),
      },
      newStatus: "3"
    });
  } catch (error) {
    console.error("Error updating multiple users status:", error);

    if (error instanceof ValidationException) {
      return res.status(error.status).json({
        error: error.message,
        code: error.code
      });
    }

    return res.status(500).json({
      message: error instanceof Error ? error.message : "Lỗi máy chủ nội bộ",
      code: 500
    });
  }
};

/**
 * Get current user info
 */
export const getUserInfo = async (req: Request, res: Response) => {
  try {
    const { auth } = req as any;
    let result = await UserModel.query().findById(auth.id);
    if (result) {
      const { password, ...userWithoutPassword } = result;
      return res.status(200).json(userWithoutPassword);
    }

    if (!result) {
      return res.status(404).json({ message: "Người dùng không tồn tại", code: 6006 });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error getting user info:", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Lỗi máy chủ nội bộ",
      code: 500
    });
  }
};

/**
 * Create a contract for user
 */
export const createContract = async (req: Request, res: Response) => {
  try {
    const { auth } = req as any;
    // Lấy id từ params (RESTful URL) hoặc body
    let inputs = {
      id: req.params.id || req.body.id,
      ...req.body
    };

    // Debug logging để kiểm tra id
    console.log("=== createContract Debug ===");
    console.log("req.params:", req.params);
    console.log("req.body:", req.body);
    console.log("inputs:", inputs);

    const allowFields = {
      id: "number!",
      contractTypeId: "number!",
      startDate: "date!",
      endDate: "date",
      activeDay: "date!",
      insurance: "number",
      // Allow salary and allowance_type_ids to pass through so downstream services
      // (employee-service -> salary-service) can create linked salary profiles.
      salary: 'number',
      allowance_type_ids: ['number'],
    };

    let params = validate(inputs, allowFields, { removeNotAllow: true });

    console.log("params after validation:", params);

    // Convert Date objects to ISO strings for database storage
    if (params.startDate && params.startDate instanceof Date) {
      params.startDate = params.startDate.toISOString();
    }
    if (params.endDate && params.endDate instanceof Date) {
      params.endDate = params.endDate.toISOString();
    }
    if (params.activeDay && params.activeDay instanceof Date) {
      params.activeDay = params.activeDay.toISOString();
    }

    // Check if user exists
    const user = await UserModel.query().findById(params.id);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại!", code: 6006 });
    }

    // Validate contract type using employee-service
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    const headers: any = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const contractType = await EmployeeService.getContractTypeById(params.contractTypeId, headers['Authorization']);
      if (!contractType) {
        return res.status(400).json({ message: "Loại hợp đồng không tồn tại!", code: 5011 });
      }
    } catch (e) {
      return res.status(400).json({ message: "Loại hợp đồng không tồn tại!", code: 5011 });
    }

    // Validate dates
    if (
      params.endDate &&
      new Date(params.endDate) <= new Date(params.startDate)
    ) {
      return res.status(400).json({ message: "Ngày kết thúc phải sau ngày ký!", code: 5009 });
    }

    if (new Date(params.activeDay) < new Date(params.startDate)) {
      return res.status(400).json({
        message: "Ngày bắt đầu phải sau hoặc bằng ngày ký!",
        code: 5012
      });
    }

    // Remove id to let DB auto-generate
    delete params.id;

    // Create contract in employee-service (userId passed via URL)
    const contractData: any = {
      ...params,
      created_at: new Date(),
    };

    // Convert Date objects to ISO strings for contract data
    if (contractData.startDate && contractData.startDate instanceof Date) {
      contractData.startDate = contractData.startDate.toISOString();
    }
    if (contractData.endDate && contractData.endDate instanceof Date) {
      contractData.endDate = contractData.endDate.toISOString();
    }
    if (contractData.activeDay && contractData.activeDay instanceof Date) {
      contractData.activeDay = contractData.activeDay.toISOString();
    }

    console.log("Contract data:", contractData);
    const userDataForHeader = getUserData(req) || (req as any).auth;
    const result = await EmployeeService.createContract(inputs.id, contractData, headers['Authorization'], userDataForHeader);
    return res.status(201).json(result);
  } catch (error) {
    console.error("Error creating contract:", error);

    if (error instanceof ValidationException) {
      return res.status(error.status).json({
        error: error.message,
        code: error.code
      });
    }

    return res.status(500).json({
      message: error instanceof Error ? error.message : "Lỗi máy chủ nội bộ",
      code: 500
    });
  }
};

// API lấy thông tin user theo username


// aintelligence787@gmail.com

// NOTE: Salary/allowance/vacationDay fields were removed from the database.
// Related endpoints and handlers have been removed accordingly.

export const getNumberOfDaysOff = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await UserModel.query().findById(id);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại", code: 6006 });
    }
    return res.status(200).json({
      monthly_leave_balance: user.monthly_leave_balance || 0,
    });
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Lỗi khi lấy số ngày nghỉ của người dùng",
      code: 500
    });
  }
};

/**
 * Check scope của user - dành cho internal service calls
 * POST /api/users/check-scope
 */
export const checkUserScope = async (req: Request, res: Response) => {
  try {
    const { permissionKey } = req.body;

    if (!permissionKey) {
      return res.status(400).json({
        success: false,
        message: "Permission key is required"
      });
    }

    // Get auth from request (set by authenticateToken middleware)
    const auth = getUserData(req);
    const userId = getUserId(req);

    // Accept requests where we can determine a user id from token/header
    if (!auth && !userId) {
      console.error('[checkUserScope] No auth data found in request');
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User authentication required"
      });
    }

    // Sử dụng UserModel.checkScope với req (có token trong header/cookie)
    const userIds = await UserModel.checkScope(permissionKey, req);

    // Determine actual scope type based on the actualScopeValue from UserModel.checkScope
    let scope = "personal";

    // Get the actual scope value that was used in UserModel.checkScope 
    let actualScopeValue = null;
    if (auth && auth.user && auth.user.scope && auth.user.scope[permissionKey]) {
      actualScopeValue = auth.user.scope[permissionKey];
    } else if (auth && auth.scope && auth.scope[permissionKey]) {
      actualScopeValue = auth.scope[permissionKey];
    } else {
      // Try to get from token in cookies or header
      const tokenFromCookie = req.cookies?.token ||
        (req.headers.authorization?.startsWith('Bearer ') ?
          req.headers.authorization.substring(7) : null);
      if (tokenFromCookie) {
        try {
          const decodedAuth = getDecodedToken(tokenFromCookie);
          actualScopeValue = decodedAuth?.user?.scope?.[permissionKey];
        } catch (err: any) {
          console.error("Error decoding token in checkUserScope:", err?.message || err);
          // If token expired, return 401 với thông báo rõ ràng
          if (err?.name === 'TokenExpiredError') {
            return res.status(401).json({
              success: false,
              message: "Token expired. Please login again.",
              code: "TOKEN_EXPIRED"
            });
          }
          // Với lỗi khác, vẫn tiếp tục với scope = personal
          console.warn("Cannot decode token, defaulting to personal scope");
        }
      }
    }

    // Map scope value to scope name using constantConfig
    const { permissionScope } = constantConfig;
    if (actualScopeValue === permissionScope.global) {
      scope = "global";
    } else if (actualScopeValue === permissionScope.department) {
      scope = "department";
    } else if (actualScopeValue === permissionScope.personal) {
      scope = "personal";
    } else {
      // Fallback: determine by userIds count and relationships
      if (userIds.length > 1) {
        const totalUsers = await UserModel.query().resultSize();
        if (userIds.length === totalUsers) {
          scope = "global";
        } else if (auth && auth.departmentId) {
          const deptUsers = await UserModel.query()
            .select("id")
            .where("departmentId", auth.departmentId);

          if (userIds.length === deptUsers.length) {
            scope = "department";
          } else {
            scope = "chevron";
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      userIds: userIds,
      scope: scope,
      message: `Scope check completed for permission: ${permissionKey}`
    });

  } catch (error) {
    console.error("Error checking user scope:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi kiểm tra phạm vi quyền",
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

/**
 * Get multiple users by IDs - for internal service use
 * POST /api/users/bulk
 */
export const getUsersByIds = async (req: Request, res: Response) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "userIds array is required"
      });
    }

    // Validate that all userIds are numbers
    const numericUserIds = userIds.map(id => {
      const numId = parseInt(id);
      if (isNaN(numId)) {
        throw new Error(`Invalid user ID: ${id}`);
      }
      return numId;
    });

    // Fetch users by IDs with basic info
    const users = await UserModel.query()
      .select([
        'id',
        'username',
        'fullName',
        'email',
        'departmentId',
        'chevronId',
        'identificationPhoto',
        'phone',
        'birthday',
        'gender'
      ])
      .whereIn('id', numericUserIds)
      .where('status', 1); // Only active users

    // Enrich each user with department and chevron details by calling employee-service through gateway
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    const headers: any = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const usersWithDetails = await Promise.all(users.map(async (user: any) => {
      let department = null;
      let chevron = null;
      try {
        if (user.departmentId) {
          department = await EmployeeService.getDepartmentById(user.departmentId, headers['Authorization']);
        }
      } catch (e: any) {
        console.error(`Error fetching department ${user.departmentId}:`, e?.message || e);
      }

      try {
        if (user.chevronId) {
          chevron = await EmployeeService.getChevronDetail(user.chevronId, headers['Authorization']);
        }
      } catch (e: any) {
        console.error(`Error fetching chevron ${user.chevronId}:`, e?.message || e);
      }

      return {
        ...user,
        department,
        chevron,
        // Thêm position/jobTitle từ chevron.name để dễ dùng
        position: chevron?.name || null,
        jobTitle: chevron?.name || null
      };
    }));

    return res.status(200).json({
      success: true,
      data: usersWithDetails,
      total: usersWithDetails.length
    });

  } catch (error) {
    console.error("Error fetching users by IDs:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

/**
 * Search users by name with department and chevron enrichment
 * Query params: 
 *   - q or keyword: search term
 *   - page: page number (default 1)
 *   - pageSize: items per page (default 50)
 */
export const searchUsers = async (req: Request, res: Response) => {
  try {
    const searchTerm = (req.query.q || req.query.keyword) as string;
    const page = parseInt((req.query.page as string) || '1');
    const pageSize = Math.min(parseInt((req.query.pageSize as string) || '50'), 1000);

    if (!searchTerm || searchTerm.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Search term is required"
      });
    }

    const trimmedTerm = searchTerm.trim();
    const offset = (page - 1) * pageSize;

    // Build query with pagination
    const query = UserModel.query()
      .select(['id', 'fullName', 'email', 'username', 'departmentId', 'chevronId', 'identificationPhoto'])
      .where('fullName', 'ilike', `%${trimmedTerm}%`)
      .orWhere('email', 'ilike', `%${trimmedTerm}%`)
      .orWhere('username', 'ilike', `%${trimmedTerm}%`)
      .where('status', 1); // Only active users

    // Get total count
    const countQuery = query.clone().clearSelect().clearOrder();
    const [countResult] = await (countQuery as any).count('* as count');
    const total = Number(countResult.count || 0);

    // Get paginated results
    const users = await query.limit(pageSize).offset(offset);

    // Enrich with department and chevron details
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    const headers: any = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const usersWithDetails = await Promise.all(users.map(async (user: any) => {
      let department = null;
      let chevron = null;

      try {
        if (user.departmentId) {
          department = await EmployeeService.getDepartmentById(user.departmentId, headers['Authorization']);
        }
      } catch (e: any) {
        console.error(`Error fetching department ${user.departmentId}:`, e?.message || e);
      }

      try {
        if (user.chevronId) {
          chevron = await EmployeeService.getChevronDetail(user.chevronId, headers['Authorization']);
        }
      } catch (e: any) {
        console.error(`Error fetching chevron ${user.chevronId}:`, e?.message || e);
      }

      return {
        ...user,
        department,
        chevron,
        full_name: user.fullName, // Add alias for compatibility
        department_id: user.departmentId,
        chevron_id: user.chevronId
      };
    }));

    return res.status(200).json({
      success: true,
      data: usersWithDetails,
      results: usersWithDetails, // Add alias for compatibility
      total,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });

  } catch (error) {
    console.error("Error searching users:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};


