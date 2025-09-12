import { Request, Response } from "express";
import fs from 'fs';
import path from 'path';
import UserModel from "@/src/Models/UserModel";
import RoleModel from "@/src/Models/RoleModel";
import { validate, ValidationException } from "@/src/utils/validation-utility";
import constantConfig from "@/src/config/constant";
import bcrypt from 'bcryptjs';
import _ from "lodash";
import axios from 'axios';

import os from 'os';

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

const API_GATEWAY_URL = `http://${getLocalIpAddress()}:${process.env.API_GATEWAY_PORT || 3000}`;
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
        } catch {}
      });
    }
  } catch (error) {
    console.error('Error deleting old identification photo:', error);
  }
};

/**
 * Get all users with pagination and filtering
 */
export const getAllUsers = async (req: any, res: Response) => {
  try {
    const { auth } = req as any;
    const scope = "users";
    let inputs = { ...req.query, ...req.body };

    let project = ["users.*"];
    let currentDate = new Date();

    let userIds: number[] = await UserModel.checkScope(scope, req);

    // console.log("userIds", userIds);

    // Retrieve page and pageSize from query parameters, defaulting to 0 and 10
    // Ensure these are treated as numbers
    const page = parseInt(req.query.page as string) || 0;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    // Fetch users WITHOUT joins
    let result: any = (await UserModel.query()
      .select(project)
      .whereIn("users.id", userIds)
      .whereNot("users.id", auth.id)
      .where("users.status", 1)
      .page(page, pageSize)) as any;

    // Lấy chi tiết department và chevron cho từng user (nếu có id)
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    const headers: any = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const usersWithDetails = await Promise.all(result.results.map(async (user: any) => {
      let department = null;
      let chevron = null;
      // console.log("user", user);
      try {
        if (user.departmentId) {
          // console.log("user.departmentId", user.departmentId);
          const depRes = await axios.get(`${API_GATEWAY_URL}/api/employee/departments/${user.departmentId}`, { headers });
          // console.log("depRes", depRes);
          department = depRes.data || null;
        }
      } catch (e) {
        console.error('Error fetching department from gateway', e);
      }
      try {
        if (user.chevronId) {
          // console.log("user.chevronId", user.chevronId);
          const chvRes = await axios.post(`${API_GATEWAY_URL}/api/employee/getChevronDetail`, { id: user.chevronId }, { headers });
          // console.log("chvRes", chvRes);
          chevron = chvRes.data || null;
        }
      } catch (e) {
        console.error('Error fetching chevron from gateway', e);
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
 * Create a new user
 */
export const createUser = async (req: Request, res: Response) => {
  try {
    const { auth } = req as any;
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
      firstName: "string!",
      lastName: "string!",
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

    // Validate required identificationPhoto presence on create
    if (!params.identificationPhoto) {
      return res.status(400).json({ message: "Vui lòng tải ảnh đại diện (identificationPhoto)", code: 7002 });
    }

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
    const headers: any = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const depRes = await axios.get(`${API_GATEWAY_URL}/api/employee/departments/${params.departmentId}`, { headers });
      if (!depRes.data) {
        return res.status(400).json({ message: "Phòng ban không tồn tại!", code: 5008 });
      }
    } catch (e) {
      return res.status(400).json({ message: "Phòng ban không tồn tại!", code: 5008 });
    }

    try {
      const chvRes = await axios.post(`${API_GATEWAY_URL}/api/employee/getChevronDetail`, { id: params.chevronId }, { headers });
      if (!chvRes.data) {
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
    userData = {
      ...userData,
      createdBy: auth.id,
    };

    console.log("User data:", userData);

    // Insert the new user into the database
    const newUser = await UserModel.query().insert(userData);
    
    // Gọi AI service để lưu face embedding nếu có ảnh
    if (req.file || (req as any).files?.identificationPhoto) {
      const photoFile = req.file || (req as any).files?.identificationPhoto;
      console.log('🔍 [CREATE USER] Found photo file for AI processing:', {
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
          const aiServiceUrl = `${API_GATEWAY_URL}/api/ai/register-face`;
          console.log('📡 [CREATE USER] AI Service URL:', aiServiceUrl);
          
          const formData = new FormData();
          
          // Đọc file từ vị trí đã lưu nếu có identificationPhoto path
          let imageBuffer = null;
          let imageName = photoFile.originalname || 'face.jpg';
          
          if (userData.identificationPhoto) {
            // Đọc từ file đã lưu
            const savedPhotoPath = resolvePhotoAbsolutePath(userData.identificationPhoto);
            console.log('� [CREATE USER] Reading saved photo from:', savedPhotoPath);
            
            if (fs.existsSync(savedPhotoPath)) {
              console.log('📎 [CREATE USER] Adding image from saved path');
              imageBuffer = fs.readFileSync(savedPhotoPath);
              imageName = path.basename(savedPhotoPath);
            }
          }
          
          // Fallback to original file methods
          if (!imageBuffer) {
            if (photoFile.buffer) {
              console.log('📎 [CREATE USER] Adding image from buffer, size:', photoFile.buffer.length);
              imageBuffer = photoFile.buffer;
            } else if (photoFile.path && fs.existsSync(photoFile.path)) {
              console.log('📎 [CREATE USER] Adding image from file path:', photoFile.path);
              imageBuffer = fs.readFileSync(photoFile.path);
            }
          }
          
          if (imageBuffer) {
            console.log('📎 [CREATE USER] Final image buffer size:', imageBuffer.length);
            const blob = new Blob([imageBuffer], { type: photoFile.mimetype || 'image/jpeg' });
            formData.append('image', blob, imageName);
          } else {
            console.error('❌ [CREATE USER] No valid image source found');
            throw new Error('No valid image source found');
          }
          
          formData.append('user_id', newUser.id.toString());
          formData.append('username', params.username);
          
          console.log('📦 [CREATE USER] FormData contents:', {
            user_id: newUser.id.toString(),
            username: params.username,
            hasImageField: formData.has('image')
          });
          
          const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
          const aiHeaders: any = {};
          if (token) {
            aiHeaders['Authorization'] = `Bearer ${token}`;
          }
          
          console.log('🔑 [CREATE USER] Request headers:', {
            hasToken: !!token,
            authHeader: aiHeaders['Authorization'] ? 'Bearer [HIDDEN]' : 'None'
          });
          
          console.log('🚀 [CREATE USER] Calling AI service...');
          
          // Gọi AI service
          const aiResponse = await axios.post(aiServiceUrl, formData, {
            headers: {
              ...aiHeaders
            }
          });
          
          console.log('📥 [CREATE USER] AI service response:', {
            status: aiResponse.status,
            success: aiResponse.data?.success,
            message: aiResponse.data?.message,
            data: aiResponse.data?.data
          });
          
          if (aiResponse.data.success) {
            console.log('✅ [CREATE USER] Face embedding saved successfully for user:', params.username);
          } else {
            console.warn('⚠️ [CREATE USER] AI service returned error:', aiResponse.data.message);
          }
        } catch (aiError: any) {
          console.error('❌ [CREATE USER] Error saving face embedding:', {
            message: aiError.message,
            status: aiError.response?.status,
            statusText: aiError.response?.statusText,
            responseData: aiError.response?.data,
            url: aiError.config?.url,
            method: aiError.config?.method
          });
          
          if (aiError.response) {
            console.error('❌ [CREATE USER] AI service detailed response:', aiError.response.data);
          }
          // Không fail user creation nếu AI service lỗi
        }
      } else {
        console.log('⚠️ [CREATE USER] No photo file found despite file detection');
      }
    } else {
      console.log('ℹ️ [CREATE USER] No photo file provided for AI processing');
    }
    
    // Remove password from the response object for security
    const { password: _, ...userWithoutPassword } = newUser;
    const newUserResponse = userWithoutPassword;

    // Prepare email variables (commented out as per original code) 
    const emailVariables = {
      fullname: `${params.lastName || ""} ${params.firstName || ""}`.trim(),
      username: params.username,
      password: params.password, // Be cautious sending plain passwords, consider a password reset flow
    };

    // await MailService.send({
    //   to: params.email,
    //   templateKey: "createUser",
    //   variables: emailVariables,
    // });

    // Handle contract creation if contract data is provided (SAGA compensation for cross-service atomicity)
    // Only create contract when there is a valid contractTypeId
    if (params.contract && params.contract.contractTypeId) {
      // Coerce primitive date strings to Date where needed for comparisons
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
      if (
        params.contract.endDate &&
        new Date(params.contract.endDate) <= new Date(params.contract.startDate)
      ) {
        return res.status(400).json({ message: "Ngày kết thúc phải sau ngày ký!", code: 5009 });
      }

      if (
        new Date(params.contract.activeDay) < new Date(params.contract.startDate)
      ) {
        return res.status(400).json({
          message: "Ngày bắt đầu phải sau hoặc bằng ngày ký!",
          code: 5010
        });
      }

      // Check if contract type exists using employee-service
      try {
        const contractTypeRes = await axios.get(`${API_GATEWAY_URL}/api/employee/contractTypes/${params.contract.contractTypeId}`, { headers });
        console.log("contractTypeRes", contractTypeRes);
        if (!contractTypeRes.data) {
          return res.status(400).json({ message: "Loại hợp đồng không tồn tại!", code: 5011 });
        }
      } catch (e) {
        return res.status(400).json({ message: "Loại hợp đồng không tồn tại!", code: 5011 });
      }

      // Prepare contract parameters (userId will be taken from URL on employee-service)
      const contractParams: any = {
        ...params.contract,
        created_at: new Date(),
      };

      // Convert Date objects to ISO strings for contract data
      if (contractParams.startDate && contractParams.startDate instanceof Date) {
        contractParams.startDate = contractParams.startDate.toISOString();
      }
      if (contractParams.endDate && contractParams.endDate instanceof Date) {
        contractParams.endDate = contractParams.endDate.toISOString();
      }
      if (contractParams.activeDay && contractParams.activeDay instanceof Date) {
        contractParams.activeDay = contractParams.activeDay.toISOString();
      }

      try {
        await axios.post(`${API_GATEWAY_URL}/api/employee/users/${newUser.id}/contracts`, contractParams, { headers });
      } catch (contractErr: any) {
        // Compensation: rollback created user to keep consistency
        try {
          await UserModel.query().findById(newUser.id).delete();
        } catch (rollbackErr) {
          console.error('Rollback user failed after contract error:', rollbackErr);
        }
        const msg = contractErr?.response?.data?.message || contractErr?.response?.data?.error || contractErr?.message || 'Tạo hợp đồng thất bại';
        return res.status(400).json({ message: msg, code: 7001, details: { stage: 'contract', rolledBackUserId: newUser.id } });
      }
    }

    // Return the newly created user (without password)
    return res.status(201).json(newUser);
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
export const getUsersByChevron = async (req: Request, res: Response) => {
  try {
    let { chevronId, chevronIds } = req.query;
    let query = UserModel.query().select('id', 'username', 'email', 'chevronId');

    if (chevronId) {
      // Ép kiểu về number (nếu là string)
      const chvId = Array.isArray(chevronId) ? Number(chevronId[0]) : Number(chevronId);
      query = query.where('chevronId', chvId);
    } else if (chevronIds) {
      // chevronIds có thể là chuỗi "1,2,3" hoặc mảng
      let ids: number[] = [];
      if (Array.isArray(chevronIds)) {
        ids = chevronIds.map(id => Number(id));
      } else {
        ids = String(chevronIds).split(',').map(Number);
      }
      query = query.whereIn('chevronId', ids);
    } else {
      return res.status(400).json({ error: 'Missing chevronId or chevronIds' });
    }

    const users = await query;
    return res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users by chevron:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

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
        "users.firstName",
        "users.lastName",
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
        "users.baseSalary",
        "users.vacationDay",
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
    const headers: any = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`; 
    }

    let department = null;
    let chevron = null;
    let contract = null;
    let contractsList: any[] = [];

    try {
      if (result.departmentId) {
        const depRes = await axios.get(`${API_GATEWAY_URL}/api/employee/departments/${result.departmentId}`, { headers });
        department = depRes.data || null;
      }
    } catch (e) {
      console.error('Error fetching department from gateway', e);
    }

    try {
      if (result.chevronId) {
        const chvRes = await axios.post(`${API_GATEWAY_URL}/api/employee/getChevronDetail`, { id: result.chevronId }, { headers });
        chevron = chvRes.data || null;
      }
    } catch (e) {
      console.error('Error fetching chevron from gateway', e);
    }

    // Get contract info from employee-service
    try {
      const contractRes = await axios.get(`${API_GATEWAY_URL}/api/employee/contracts/user/${result.id}`, { headers });
      if (contractRes.data && contractRes.data.length > 0) {
        const contracts = contractRes.data;

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
      firstName: "string!",
      lastName: "string!",
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
      baseSalary: "number",
      vacationDay: "number",
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
            
            if (fs.existsSync(savedPhotoPath)) {
              console.log('📎 [UPDATE USER] Adding image from saved path');
              const fileBuffer = fs.readFileSync(savedPhotoPath);
              console.log('📎 [UPDATE USER] File buffer size:', fileBuffer.length);
              const blob = new Blob([fileBuffer], { type: photoFile.mimetype || 'image/jpeg' });
              formData.append('image', blob, path.basename(savedPhotoPath));
            } else if (photoFile.buffer) {
              console.log('📎 [UPDATE USER] Adding image from buffer, size:', photoFile.buffer.length);
              const blob = new Blob([photoFile.buffer], { type: photoFile.mimetype || 'image/jpeg' });
              formData.append('image', blob, photoFile.originalname || 'face.jpg');
            } else {
              console.error('❌ [UPDATE USER] No valid image source found');
              throw new Error('No valid image source found');
            }
            
            formData.append('user_id', id.toString());
            formData.append('username', updateData.username);
            
            console.log('📦 [UPDATE USER] FormData contents:', {
              user_id: id.toString(),
              username: updateData.username,
              hasImageField: formData.has('image')
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
            const aiResponse = await axios.post(aiServiceUrl, formData, {
              headers: {
                ...aiHeaders
              }
            });
            
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
      const query = UserModel.query().whereNot("id", id);

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
        const depRes = await axios.get(`${API_GATEWAY_URL}/api/employee/departments/${updateData.departmentId}`, { headers });
         if (!depRes.data) {
           return res.status(400).json({ message: "Phòng ban không tồn tại!", code: 5008 });
         }
      }
    } catch (e) {
      return res.status(400).json({ message: "Phòng ban không tồn tại!", code: 5008 });
    }

    try {
      if (updateData.chevronId) {
        const chvRes = await axios.post(`${API_GATEWAY_URL}/api/employee/getChevronDetail`, { id: updateData.chevronId }, { headers });
         if (!chvRes.data) {
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
      const contractTypeRes = await axios.get(`${API_GATEWAY_URL}/api/employee/contractTypes/${params.contractTypeId}`, { headers });
      if (!contractTypeRes.data) {
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

    const result = await axios.post(`${API_GATEWAY_URL}/api/employee/users/${inputs.id}/contracts`, contractData, { headers });
    return res.status(201).json(result.data);
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
export const getUserByUsername = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username không được để trống',
        code: 400
      });
    }

    // Tìm user theo username
    const user = await UserModel.query()
      .select(
        'id',
        'username',
        'email',
        'firstName',
        'lastName',
        'status',
        'identificationPhoto',
        'departmentId',
        'chevronId'
      )
      .where('username', username)
      .where('status', 1)
      .first();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng với username này',
        code: 404
      });
    }

    // Lấy thông tin department và chevron nếu có
    let department = null;
    let chevron = null;

    if (user.departmentId) {
      try {
        const deptResponse = await axios.get(`${API_GATEWAY_URL}/api/employee/departments/${user.departmentId}`);
        if (deptResponse.data.success) {
          department = deptResponse.data.data.name;
        }
      } catch (error) {
        console.warn('Không thể lấy thông tin department:', error);
      }
    }

    if (user.chevronId) {
      try {
        const chevronResponse = await axios.get(`${API_GATEWAY_URL}/api/employee/chevrons/${user.chevronId}`);
        if (chevronResponse.data.success) {
          chevron = chevronResponse.data.data.name;
        }
      } catch (error) {
        console.warn('Không thể lấy thông tin chevron:', error);
      }
    }

    // Tạo employeeId
    const employeeId = `NV${user.id.toString().padStart(4, '0')}`;

    const userInfo = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      employeeId,
      department: department || 'N/A',
      position: chevron || 'N/A',
      identificationPhoto: user.identificationPhoto,
      status: user.status
    };

    return res.status(200).json({
      success: true,
      message: 'Lấy thông tin người dùng thành công',
      data: userInfo
    });

  } catch (error) {
    console.error('Error getting user by username:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ nội bộ',
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 500
    });
  }
};

// aintelligence787@gmail.com