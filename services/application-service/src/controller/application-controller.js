import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { ApplicationModel } from '../Models/ApplicationModel.js';
import { ApplicationStatus } from '../config/application-constants.js';
import AuthService from '../service/AuthService.js';
import CheckScopeService from '../service/CheckScopeService.js';
import { deleteFiles } from '../middleware/upload.js';
import axios from 'axios';
import { getUserData, getUserId } from '../utils/getUserData.js';

// Extend dayjs với timezone plugin
dayjs.extend(utc);
dayjs.extend(timezone);

// Sử dụng API Gateway thay vì gọi trực tiếp
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://127.0.0.1:4000';

export class ApplicationController {
  /**
   * Tạo đơn từ mới
   * POST /applications
   */
  static async create(req, res) {
    try {
      const { type, data } = req.body;
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng không được xác thực'
        });
      }

      // Parse data nếu là string (từ FormData)
      let parsedData = typeof data === 'string' ? JSON.parse(data) : data;

      // Xử lý file upload nếu có
      if (req.files && req.files.length > 0) {
        const evidenceFiles = req.files.map(file => ({
          filename: file.filename,
          originalName: file.originalname,
          path: `/applications/${file.filename}`, // Đường dẫn tương đối từ public
          size: file.size,
          mimetype: file.mimetype
        }));

        parsedData.evidence = evidenceFiles;
      }

      if (type == "forgot-check") {
         await ApplicationModel.checkRequiredApplication(userId);
      }

      const application = await ApplicationModel.createApplication({
        type,
        data: parsedData,
        userId,
      });

      res.status(201).json({
        success: true,
        message: 'Tạo đơn từ thành công',
        data: application,
        timestamp: dayjs().format()
      });
    } catch (error) {
      // Xóa files đã upload nếu có lỗi
      if (req.files && req.files.length > 0) {
        const filenames = req.files.map(file => file.filename);
        deleteFiles(filenames);
      }

      res.status(400).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi tạo đơn từ',
        timestamp: dayjs().format()
      });
    }
  }

  /**
   * Lấy danh sách tất cả đơn từ (cho admin/manager)
   * GET /applications
   * 
   * Query params:
   *   - page: page number (1-based, default 1)
   *   - pageSize: items per page (default 10)
   *   - sortField: field to sort by (e.g., 'id', 'type', 'status', 'created_at')
   *   - sortOrder: 'ascend' | 'descend' (default 'descend')
   *   - search: global search keyword
   *   - type: filter by application type
   *   - status: filter by status (0, 1, 2)
   *   - createdAtFrom, createdAtTo: date range for created_at
   */
  static async getAll(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10,  // Changed from pageSize to limit
        sort = 'created_at',  // Changed from sortField to sort
        order = 'desc',  // Changed from sortOrder to order, expecting 'asc'/'desc'
        search = '',
        type: typeFilter,
        status: statusFilter,
        createdAtFrom,
        createdAtTo,
        approvedDateFrom,
        approvedDateTo,
        // Column-specific search
        'userInfo.fullName': searchEmployeeName
      } = req.query;
      const currentUserId = getUserId(req);

      if (!currentUserId) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng không được xác thực'
        });
      }

      // Lấy token từ request để gọi sang Auth Service; fallback to gateway x-user-data
      const token = req.cookies.token ||
        (req.headers.authorization && req.headers.authorization.split(' ')[1]);

      const userData = getUserData(req);

      if (!token && !userData) {
        return res.status(401).json({
          success: false,
          message: 'Access token or user data required'
        });
      }

      // Check scope quyền quản lý đơn từ từ Auth Service (use permission key)
      let allowedUserIds = [];
      let scopeResult = null;
      try {
        scopeResult = await CheckScopeService.checkUserScope('manage_applications', token, userData);
        allowedUserIds = scopeResult.userIds || [];
      } catch (err) {
        console.error('Error checking user scope from Auth Service:', err?.message || err);
        allowedUserIds = [];
      }

      // If auth service says no access or returned no users, return empty set
      if (!scopeResult || !scopeResult.hasAccess || !allowedUserIds || allowedUserIds.length === 0) {
        return res.json({
          success: true,
          data: [],
          pagination: {
            page: parseInt(page),
            pageSize: parseInt(limit),
            total: 0,
            totalPages: 0
          },
          total: 0,
          timestamp: dayjs().format()
        });
      }

      // If searching by employee name, find matching users first
      if (searchEmployeeName && searchEmployeeName.trim()) {
        try {
          // Search users by fullName in Auth Service
          const searchResponse = await axios.get(
            `${API_GATEWAY_URL}/api/auth/users/search`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              params: {
                q: searchEmployeeName.trim()
              }
            }
          );
          
          const matchingUsers = searchResponse.data?.data || searchResponse.data || [];
          const matchingUserIds = matchingUsers.map(u => u.id);
          
          // Intersect with allowedUserIds
          if (allowedUserIds && allowedUserIds.length > 0) {
            allowedUserIds = allowedUserIds.filter(id => matchingUserIds.includes(id));
          } else {
            allowedUserIds = matchingUserIds;
          }
          
          // If no matching users, return empty result
          if (allowedUserIds.length === 0) {
            return res.json({
              success: true,
              data: [],
              pagination: {
                page: parseInt(page),
                pageSize: parseInt(limit),
                total: 0,
                totalPages: 0
              },
              total: 0,
              timestamp: dayjs().format()
            });
          }
        } catch (error) {
          console.error('Error searching users by name:', error.message);
          // On error, continue with original allowedUserIds
        }
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);  // Use limit instead of pageSizeNum
      const offset = (pageNum - 1) * limitNum;

      // Lấy danh sách applications với filters đúng format
      // Normalize date range inputs to full-day ISO range for DB comparison
      const normalizedCreatedAtFrom = createdAtFrom ? dayjs(createdAtFrom).startOf('day').toISOString() : null;
      const normalizedCreatedAtTo = createdAtTo ? dayjs(createdAtTo).endOf('day').toISOString() : null;
      const normalizedApprovedFrom = approvedDateFrom ? dayjs(approvedDateFrom).startOf('day').toISOString() : null;
      const normalizedApprovedTo = approvedDateTo ? dayjs(approvedDateTo).endOf('day').toISOString() : null;

      const filters = {
        allowedUserIds,
        userId: currentUserId, // Để loại bỏ đơn của chính mình
        type: typeFilter || null,
        status: statusFilter !== undefined && statusFilter !== '' ? parseInt(statusFilter) : null,
        search: search.trim(),
        createdAtFrom: normalizedCreatedAtFrom,
        createdAtTo: normalizedCreatedAtTo,
        approvedDateFrom: normalizedApprovedFrom,
        approvedDateTo: normalizedApprovedTo,
        sortField: sort || 'created_at',  // Map sort to sortField for model
        sortOrder: order === 'asc' ? 'asc' : 'desc'  // Convert order to sortOrder
      };

      const applications = await ApplicationModel.getAllApplicationsPaginatedWithSort(
        filters,
        offset,
        limitNum  // Use limitNum instead of pageSizeNum
      );

      const totalCount = await ApplicationModel.getAllApplicationsCountWithFilters(filters);

      // Lấy danh sách unique user IDs từ applications (cả người tạo và người duyệt)
      const uniqueUserIds = [...new Set(applications.map(app => app.userId))];
      const uniqueApprovedIds = [...new Set(applications.filter(app => app.approvedBy != null).map(app => app.approvedBy))];
      const allUserIds = [...new Set([...uniqueUserIds, ...uniqueApprovedIds])];

      // ✨ Gọi API getUserDetail cho từng user để lấy đầy đủ thông tin (user, department, chevron)
      const usersDetailMap = {};
      await Promise.all(allUserIds.map(async (userId) => {
        try {
          const response = await axios.get(
            `${API_GATEWAY_URL}/api/auth/users/detail/${userId}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          if (response.data) {
            usersDetailMap[userId] = {
              id: response.data.id,
              username: response.data.username,
              fullName: response.data.fullName,
              email: response.data.email,
              identificationPhoto: response.data.identificationPhoto,
              department: response.data.department ? {
                id: response.data.department.id,
                name: response.data.department.name
              } : null,
              chevron: response.data.chevron ? {
                id: response.data.chevron.id,
                name: response.data.chevron.name
              } : null
            };
          }
        } catch (error) {
          console.error(`Error fetching user detail for user ${userId}:`, error.message);
          // Fallback to basic info if detail fetch fails
          usersDetailMap[userId] = {
            id: userId,
            username: 'Unknown',
            fullName: 'Unknown',
            email: null,
            identificationPhoto: null,
            department: null,
            chevron: null
          };
        }
      }));

      // Map thông tin user đầy đủ vào applications
      const applicationsWithUserInfo = applications.map(application => ({
        ...application,
        userInfo: usersDetailMap[application.userId] || null,
        approvedByInfo: application.approvedBy ? usersDetailMap[application.approvedBy] : null
      }));

      res.json({
        success: true,
        data: applicationsWithUserInfo,
        pagination: {
          page: pageNum,
          pageSize: limitNum,  // Return as pageSize for consistency
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum)
        },
        total: totalCount,
        timestamp: dayjs().format()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy danh sách đơn từ',
        timestamp: dayjs().format()
      });
    }
  }

  /**
   * Lấy danh sách đơn của user hiện tại
   * GET /applications/my-applications
   */
  static async getMyApplications(req, res) {
    try {
      console.log('🔍 getMyApplications called');
      console.log('🔍 getUserData(req):', getUserData(req));
      console.log('🔍 req.query:', req.query);
      
      const { page = 1, pageSize = 10, status, userId: queryUserId, year, month } = req.query;
      
      // Ưu tiên userId từ query (cho inter-service call), fallback về getUserData(req).id
      const userId = queryUserId ? parseInt(queryUserId) : getUserId(req);

      console.log('🔍 userId:', userId);

      if (!userId) {
        console.log('❌ No userId found');
        return res.status(401).json({
          success: false,
          message: 'Người dùng không được xác thực'
        });
      }

      const pageNum = parseInt(page);
      const pageSizeNum = parseInt(pageSize);
      const offset = (pageNum - 1) * pageSizeNum;

      const applications = await ApplicationModel.getUserApplicationsPaginated(
        userId,
        status || null, // Filter theo status nếu có
        null, // type
        offset,
        pageSizeNum
      );

      // Đếm tổng số record
      const totalCount = await ApplicationModel.getUserApplicationsCount(
        userId,
        status || null, // Filter theo status nếu có
        null  // type
      );

      // Filter theo year/month nếu có
      let filteredApplications = applications;
      if (year && month) {
        filteredApplications = applications.filter(app => {
          const appDate = new Date(app.applicationDate || app.createdAt);
          return appDate.getFullYear() === parseInt(year) && 
                 appDate.getMonth() + 1 === parseInt(month);
        });
      }

      // Lấy thông tin user từ Auth Service
      const usersInfo = await AuthService.getUsersByIds([userId], getUserData(req));

      // Lấy danh sách unique approvedBy IDs
      let uniqueApprovedIds = [];
      filteredApplications.forEach(app => {
        if (app.approvedBy != null) uniqueApprovedIds.push(app.approvedBy);
      });

      // Gọi Auth Service để lấy thông tin người duyệt
      const approvedUsersInfo = uniqueApprovedIds.length > 0
        ? await AuthService.getUsersByIds(uniqueApprovedIds, getUserData(req))
        : [];

      let userInfo = {
        id: userId,
        username: 'Unknown',
        fullName: 'Unknown User',
        email: '',
        identificationPhoto: null
      };

      if (usersInfo && usersInfo.length > 0) {
        const user = usersInfo[0];
        userInfo = {
          id: user.id,
          username: user.username,
          fullName: `${user.lastName || ''} ${user.firstName || ''}`.trim() || user.username || 'N/A',
          email: user.email,
          identificationPhoto: user.identificationPhoto
        };
      }

      // Tạo map để dễ dàng lookup approved user info
      const approvedUsersMap = {};
      approvedUsersInfo.forEach(approve => {
        approvedUsersMap[approve.id] = {
          id: approve.id,
          username: approve.username,
          fullName: `${approve.lastName || ''} ${approve.firstName || ''}`.trim() || approve.username || 'N/A',
          email: approve.email,
          identificationPhoto: approve.identificationPhoto
        };
      });

      // Map applications với user info và approvedBy info
      const applicationsWithUserInfo = filteredApplications.map(application => ({
        ...application,
        userInfo,
        approvedByInfo: approvedUsersMap[application.approvedBy] || null
      }));

      res.json({
        success: true,
        data: applicationsWithUserInfo,
        pagination: {
          page: pageNum,
          pageSize: pageSizeNum,
          total: filteredApplications.length,
          totalPages: Math.ceil(filteredApplications.length / pageSizeNum)
        },
        total: filteredApplications.length,
        timestamp: dayjs().format()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy danh sách đơn từ',
        timestamp: dayjs().format()
      });
    }
  }

  /**
   * Lấy danh sách đơn của user hiện tại - có server-side search/sort/filter
   * GET /applications/my-applications/paginated
   * 
   * Query params:
   *   - page: page number (1-based, default 1)
   *   - limit: items per page (default 10)
   *   - sort: field to sort by (e.g., 'type', 'status', 'created_at')
   *   - order: 'asc' | 'desc' (default 'desc')
   *   - search: global search keyword
   *   - type: filter by application type
   *   - status: filter by status (0, 1, 2)
   *   - createdAtFrom, createdAtTo: date range for created_at
   */
  static async getMyApplicationsPaginated(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        sort = 'created_at',
        order = 'desc',
        search = '',
        type: typeFilter,
        status: statusFilter,
        createdAtFrom,
        createdAtTo,
        // Approver search (from frontend approvedByInfo.fullName)
        'approvedByInfo.fullName': searchApproverName
      } = req.query;

      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Người dùng không được xác thực' });
      }

      // Lấy token từ request để gọi sang Auth Service
      const token = req.cookies?.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

      if (!token) {
        // No token available — approver name search will likely fail; continue but log
        console.warn('[getMyApplicationsPaginated] No auth token found in request headers/cookies');
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      // Normalize date ranges to start/end of day ISO
      const normalizedCreatedAtFrom = createdAtFrom ? dayjs(createdAtFrom).startOf('day').toISOString() : null;
      const normalizedCreatedAtTo = createdAtTo ? dayjs(createdAtTo).endOf('day').toISOString() : null;

      const filters = {
        search: search ? String(search).trim() : '',
        type: typeFilter || null,
        status: statusFilter !== undefined && statusFilter !== '' ? parseInt(String(statusFilter)) : null,
        createdAtFrom: normalizedCreatedAtFrom,
        createdAtTo: normalizedCreatedAtTo,
        sortField: sort || 'created_at',
        sortOrder: order === 'asc' || order === 'desc' ? order : 'desc'
      };

      // If searching by approver name, resolve matching user IDs first
      if (searchApproverName && String(searchApproverName).trim()) {
        try {
          const searchResponse = await axios.get(
            `${API_GATEWAY_URL}/api/auth/users/search`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              params: { q: String(searchApproverName).trim() }
            }
          );

          const matchingUsers = searchResponse.data?.data || searchResponse.data || [];
          const matchingApproverIds = matchingUsers.map(u => u.id);

          if (matchingApproverIds.length === 0) {
            // Return empty paginated response immediately
            return res.json({
              success: true,
              data: [],
              pagination: { page: pageNum, pageSize: limitNum, total: 0, totalPages: 0 },
              total: 0,
              timestamp: dayjs().format()
            });
          }

          // Add approver filter to filters (ApplicationModel expects approvedDate/approvedBy via filters)
          filters.approvedBy = matchingApproverIds;
        } catch (err) {
          console.error('Error searching approvers by name:', err?.message || err);
          // On error, proceed without approver filter
        }
      }

      // Detect nested user-field sorts (approvedByInfo.fullName, userInfo.fullName)
      const requestedSort = String(filters.sortField || '').trim();
      const isNestedUserSort = requestedSort.includes('.') && (
        requestedSort.startsWith('approvedByInfo') || requestedSort.startsWith('userInfo')
      );

      let applications = [];
      let totalCount = 0;

      if (isNestedUserSort) {
        // For nested user-field sorting: we must fetch all FILTERED records, resolve names, sort, then slice
        // This is not ideal for performance but necessary since user names are not in applications table
        
        // First, get total count with filters applied
        totalCount = await ApplicationModel.getMyApplicationsCountWithFilters(userId, filters);
        
        if (totalCount === 0) {
          applications = [];
        } else {
          // Fetch ALL filtered records (but with filters applied to reduce dataset)
          const allFilteredRows = await ApplicationModel.getMyApplicationsPaginatedWithSort(
            userId,
            { ...filters, sortField: 'created_at', sortOrder: 'desc' }, // Use DB sort as fallback
            0,
            Math.min(totalCount, 10000) // Cap at 10k to prevent memory issues
          );

          const rows = Array.isArray(allFilteredRows) ? allFilteredRows : (allFilteredRows || []);

          // Collect user IDs to resolve
          const userIdsToResolve = new Set();
          if (requestedSort.startsWith('approvedByInfo')) {
            rows.forEach(r => { if (r.approvedBy != null) userIdsToResolve.add(r.approvedBy); });
          } else {
            rows.forEach(r => { if (r.userId != null) userIdsToResolve.add(r.userId); });
          }

          const idsArray = Array.from(userIdsToResolve);
          const usersInfo = idsArray.length > 0 ? await AuthService.getUsersByIds(idsArray, getUserData(req)) : [];
          const usersMap = {};
          usersInfo.forEach(u => { usersMap[u.id] = u; });

          const getFullName = (user) => {
            if (!user) return '';
            if (user.fullName) return String(user.fullName).trim();
            return `${user.lastName || ''} ${user.firstName || ''}`.trim();
          };

          // Perform in-memory sort
          const direction = (filters.sortOrder === 'asc') ? 1 : -1;
          rows.sort((a, b) => {
            const ua = requestedSort.startsWith('approvedByInfo') ? usersMap[a.approvedBy] : usersMap[a.userId];
            const ub = requestedSort.startsWith('approvedByInfo') ? usersMap[b.approvedBy] : usersMap[b.userId];
            const na = (getFullName(ua) || '').toLowerCase();
            const nb = (getFullName(ub) || '').toLowerCase();
            if (na < nb) return -1 * direction;
            if (na > nb) return 1 * direction;
            return 0;
          });

          // Now slice for pagination AFTER sorting
          applications = rows.slice(offset, offset + limitNum);
        }
      } else {
        // Regular DB-side sorting/pagination - this path should work correctly
        applications = await ApplicationModel.getMyApplicationsPaginatedWithSort(userId, filters, offset, limitNum);
        totalCount = await ApplicationModel.getMyApplicationsCountWithFilters(userId, filters);
      }

      // Resolve current user info and approver info for the returned page
      const usersInfo = await AuthService.getUsersByIds([userId], getUserData(req));
      const uniqueApprovedIds = [...new Set(applications.filter(app => app.approvedBy != null).map(app => app.approvedBy))];
      const approvedUsersInfo = uniqueApprovedIds.length > 0 ? await AuthService.getUsersByIds(uniqueApprovedIds, getUserData(req)) : [];

      let userInfo = { id: userId, username: 'Unknown', fullName: 'Unknown User', email: '', identificationPhoto: null, department: null, chevron: null };
      if (usersInfo && usersInfo.length > 0) {
        const u = usersInfo[0];
        userInfo = { id: u.id, username: u.username, fullName: `${u.lastName || ''} ${u.firstName || ''}`.trim() || u.username || 'N/A', email: u.email, identificationPhoto: u.identificationPhoto, department: u.department || null, chevron: u.chevron || null };
      }

      const approvedUsersMap = {};
      approvedUsersInfo.forEach(ap => { approvedUsersMap[ap.id] = { id: ap.id, username: ap.username, fullName: `${ap.lastName || ''} ${ap.firstName || ''}`.trim() || ap.username || 'N/A', email: ap.email, identificationPhoto: ap.identificationPhoto, department: ap.department || null, chevron: ap.chevron || null }; });

      const applicationsWithUserInfo = applications.map(application => ({ ...application, userInfo, approvedByInfo: approvedUsersMap[application.approvedBy] || null }));

      res.json({ success: true, data: applicationsWithUserInfo, pagination: { page: pageNum, pageSize: limitNum, total: totalCount, totalPages: Math.ceil(totalCount / limitNum) }, total: totalCount, timestamp: dayjs().format() });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message || 'Có lỗi xảy ra khi lấy danh sách đơn từ', timestamp: dayjs().format() });
    }
  }

  /**
   * Lấy tất cả đơn của user hiện tại (không phân trang) - dùng cho select/dropdown
   * GET /all/my-applications
   */
  static async getAllMyApplicationsList(req, res) {
    try {
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng không được xác thực'
        });
      }

      const applications = await ApplicationModel.getAllMyApplicationsList(userId);

      res.json(applications);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy danh sách đơn từ',
        timestamp: dayjs().format()
      });
    }
  }

  /**
   * Lấy danh sách đơn APPROVED của user (cho inter-service calls)
   * GET /applications/user/:userId/approved?year=2025&month=10
   */
  static async getUserApprovedApplications(req, res) {
    try {
      const { userId } = req.params;
      const { year, month } = req.query;

      console.log(`📋 getUserApprovedApplications called: userId=${userId}, year=${year}, month=${month}`);

      if (!userId) {
        console.log('❌ Missing userId');
        return res.status(400).json({
          success: false,
          message: 'Thiếu userId'
        });
      }

      // Lấy tất cả đơn APPROVED của user
      console.log(`🔍 Fetching APPROVED applications for user ${userId}...`);
      const applications = await ApplicationModel.getUserApplicationsPaginated(
        parseInt(userId),
        ApplicationStatus.APPROVED, // Dùng số 1 thay vì 'APPROVED'
        null, // type
        0, // offset
        1000 // limit lớn để lấy hết
      );

      console.log(`✅ Found ${applications.length} APPROVED applications`);

      // Filter theo year/month nếu có
      let filteredApplications = applications;
      if (year && month) {
        const targetYear = parseInt(year);
        const targetMonth = parseInt(month);
        
        filteredApplications = applications.filter(app => {
          // Đối với đơn leave và business-trip, kiểm tra startDate và endDate
          if ((app.type === 'leave' || app.type === 'business-trip') && app.data) {
            const startDate = new Date(app.data.startDate);
            const endDate = new Date(app.data.endDate);
            
            // Kiểm tra xem khoảng thời gian có giao với tháng đang xem không
            const startYear = startDate.getFullYear();
            const startMonth = startDate.getMonth() + 1;
            const endYear = endDate.getFullYear();
            const endMonth = endDate.getMonth() + 1;
            
            // Đơn thuộc tháng nếu:
            // - startDate trong tháng, HOẶC
            // - endDate trong tháng, HOẶC  
            // - startDate trước tháng và endDate sau tháng (dài hạn)
            const isInMonth = (
              (startYear === targetYear && startMonth === targetMonth) ||
              (endYear === targetYear && endMonth === targetMonth) ||
              (startDate <= new Date(targetYear, targetMonth - 1, 1) && 
               endDate >= new Date(targetYear, targetMonth, 0))
            );
            
            if (isInMonth) {
              console.log(`✅ ${app.type} application in month ${targetYear}-${targetMonth}:`, {
                id: app.id,
                startDate: app.data.startDate,
                endDate: app.data.endDate,
                destination: app.data.destination || app.data.location
              });
            }
            
            return isInMonth;
          }
          
          // ✨ Đối với đơn forgot-check, dùng forgotDate
          if (app.type === 'forgot-check' && app.data && app.data.forgotDate) {
            const forgotDate = new Date(app.data.forgotDate);
            const isInMonth = forgotDate.getFullYear() === targetYear && 
                              forgotDate.getMonth() + 1 === targetMonth;
            if (isInMonth) {
              console.log(`✅ forgot-check application in month ${targetYear}-${targetMonth}:`, {
                id: app.id,
                forgotDate: app.data.forgotDate,
                forgotType: app.data.forgotType
              });
            }
            return isInMonth;
          }
          
          // ✨ Đối với đơn overtime, dùng overtimeDate hoặc date
          if (app.type === 'overtime' && app.data) {
            const otDateField = app.data.overtimeDate || app.data.date;
            if (otDateField) {
              // Convert UTC date sang timezone VN để lấy đúng ngày
              // Ví dụ: "2025-12-15T17:00:00.000Z" (UTC) = 2025-12-16 00:00 (VN)
              const otDateVN = dayjs(otDateField).tz('Asia/Ho_Chi_Minh');
              const otYear = otDateVN.year();
              const otMonth = otDateVN.month() + 1; // dayjs month is 0-indexed
              const isInMonth = otYear === targetYear && otMonth === targetMonth;
              
              console.log(`🔍 [Filter OT] App ${app.id}:`, {
                overtimeDateUTC: otDateField,
                overtimeDateVN: otDateVN.format('YYYY-MM-DD HH:mm:ss'),
                extractedYear: otYear,
                extractedMonth: otMonth,
                targetYear,
                targetMonth,
                isInMonth
              });
              
              if (isInMonth) {
                console.log(`✅ overtime application in month ${targetYear}-${targetMonth}:`, {
                  id: app.id,
                  overtimeDate: app.data.overtimeDate,
                  date: app.data.date,
                  startTime: app.data.startTime,
                  overtimeHours: app.data.overtimeHours
                });
              }
              return isInMonth;
            }
          }
          
          // Đối với các loại đơn khác, dùng applicationDate hoặc createdAt
          const appDate = new Date(app.applicationDate || app.createdAt);
          return appDate.getFullYear() === targetYear && 
                 appDate.getMonth() + 1 === targetMonth;
        });
        
        console.log(`📅 Filtered to ${filteredApplications.length} applications for ${year}-${month}`);
        console.log(`🚀 Business trips: ${filteredApplications.filter(a => a.type === 'business-trip').length}`);
        console.log(`📄 Application types breakdown:`, {
          leave: filteredApplications.filter(a => a.type === 'leave').length,
          'business-trip': filteredApplications.filter(a => a.type === 'business-trip').length,
          overtime: filteredApplications.filter(a => a.type === 'overtime').length,
          'forgot-check': filteredApplications.filter(a => a.type === 'forgot-check').length,
        });
      }

      res.json({
        success: true,
        data: filteredApplications,
        total: filteredApplications.length,
        timestamp: dayjs().format()
      });
    } catch (error) {
      console.error('❌ Error in getUserApprovedApplications:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy danh sách đơn từ',
        timestamp: dayjs().format()
      });
    }
  }

  /**
   * Lấy danh sách đơn cần duyệt
   * GET /applications/pending
   */
  static async getPendingApplications(req, res) {
    try {
      // Chỉ lấy page và pageSize từ query parameters
      const { page = 1, pageSize = 10 } = req.query;
      const currentUserId = getUserId(req);

      if (!currentUserId) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng không được xác thực'
        });
      }

      // Lấy token từ request để gọi sang Auth Service; fallback to gateway x-user-data
      const token = req.cookies.token ||
        (req.headers.authorization && req.headers.authorization.split(' ')[1]);

      const userData = getUserData(req);

      if (!token && !userData) {
        return res.status(401).json({
          success: false,
          message: 'Access token or user data required'
        });
      }

      // Check scope quyền quản lý đơn từ từ Auth Service (use permission key)
      let allowedUserIds = [];
      let scopeResult = null;
      try {
        scopeResult = await CheckScopeService.checkUserScope('manage_applications', token, userData);
        allowedUserIds = scopeResult.userIds || [];
      } catch (err) {
        console.error('Error checking user scope from Auth Service:', err?.message || err);
        allowedUserIds = [];
      }

      // If auth service says no access or returned no users, return empty set
      if (!scopeResult || !scopeResult.hasAccess || !allowedUserIds || allowedUserIds.length === 0) {
        return res.json({
          success: true,
          data: [],
          pagination: {
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            total: 0,
            totalPages: 0
          },
          total: 0,
          timestamp: dayjs().format()
        });
      }

      const pageNum = parseInt(page);
      const pageSizeNum = parseInt(pageSize);
      const offset = (pageNum - 1) * pageSizeNum;

      const applications = await ApplicationModel.getPendingApplicationsPaginated(
        null, // removed type parameter 
        offset,
        pageSizeNum,
        allowedUserIds
      );

      const totalCount = await ApplicationModel.getPendingApplicationsCount(
        null, // removed type parameter
        allowedUserIds
      );

      // Lấy danh sách unique user IDs từ applications (cả người tạo và người duyệt)
      const uniqueUserIds = [...new Set(applications.map(app => app.userId))];
      const uniqueApprovedIds = [...new Set(applications.filter(app => app.approvedBy != null).map(app => app.approvedBy))];
      const allUserIds = [...new Set([...uniqueUserIds, ...uniqueApprovedIds])];

      // ✨ Gọi API getUserDetail cho từng user để lấy đầy đủ thông tin (user, department, chevron)
      const usersDetailMap = {};
      await Promise.all(allUserIds.map(async (userId) => {
        try {
          const response = await axios.get(
            `${API_GATEWAY_URL}/api/auth/users/detail/${userId}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          if (response.data) {
            usersDetailMap[userId] = {
              id: response.data.id,
              username: response.data.username,
              fullName: response.data.fullName,
              email: response.data.email,
              identificationPhoto: response.data.identificationPhoto,
              department: response.data.department ? {
                id: response.data.department.id,
                name: response.data.department.name
              } : null,
              chevron: response.data.chevron ? {
                id: response.data.chevron.id,
                name: response.data.chevron.name
              } : null
            };
          }
        } catch (error) {
          console.error(`Error fetching user detail for user ${userId}:`, error.message);
          // Fallback to basic info if detail fetch fails
          usersDetailMap[userId] = {
            id: userId,
            username: 'Unknown',
            fullName: 'Unknown',
            email: null,
            identificationPhoto: null,
            department: null,
            chevron: null
          };
        }
      }));

      // Map applications với user info và approvedBy info
      const applicationsWithUserInfo = applications.map(application => ({
        ...application,
        userInfo: usersDetailMap[application.userId] || {
          id: application.userId,
          username: 'Unknown',
          fullName: 'Unknown User',
          email: '',
          identificationPhoto: null,
          department: null,
          chevron: null
        },
        approvedByInfo: application.approvedBy ? usersDetailMap[application.approvedBy] : null
      }));

      res.json({
        success: true,
        data: applicationsWithUserInfo,
        pagination: {
          page: pageNum,
          pageSize: pageSizeNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / pageSizeNum)
        },
        total: totalCount,
        timestamp: dayjs().format()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy danh sách đơn từ',
        timestamp: dayjs().format()
      });
    }
  }

  /**
   * Lấy chi tiết đơn từ
   * GET /applications/:id
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;
      console.log(`📋 getById called for application ID: ${id}`);
      
      const application = await ApplicationModel.getApplicationById(parseInt(id));
      console.log(`✅ Found application:`, {
        id: application.id,
        type: application.type,
        status: application.status,
        userId: application.userId,
        data: application.data
      });

      // Lấy thông tin user từ Auth Service
      const usersInfo = await AuthService.getUsersByIds([application.userId], getUserData(req));
      const approvedUsersInfo = application.approvedBy ? await AuthService.getUsersByIds([application.approvedBy], getUserData(req)) : [];

      let userInfo = {
        id: application.userId,
        username: 'Unknown',
        fullName: 'Unknown User',
        email: '',
        identificationPhoto: null
      };

      if (usersInfo && usersInfo.length > 0) {
        const user = usersInfo[0];
        userInfo = {
          id: user.id,
          username: user.username,
          fullName: `${user.lastName || ''} ${user.firstName || ''}`.trim() || user.username || 'N/A',
          email: user.email,
          identificationPhoto: user.identificationPhoto
        };
      }

      if (approvedUsersInfo && approvedUsersInfo.length > 0) {
        const approve = approvedUsersInfo[0];
        application.approvedByInfo = {
          id: approve.id,
          username: approve.username,
          fullName: `${approve.lastName || ''} ${approve.firstName || ''}`.trim() || approve.username || 'N/A',
          email: approve.email,
          identificationPhoto: approve.identificationPhoto
        };
      }

      const responseData = {
        success: true,
        data: {
          ...application,
          userInfo,
          approvedByInfo: application.approvedByInfo
        },
        timestamp: dayjs().format()
      };
      
      console.log(`📤 Sending response:`, responseData);
      res.json(responseData);
    } catch (error) {
      console.error(`❌ Error in getById:`, error);
      res.status(error.message.includes('Không tìm thấy') ? 404 : 500).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy chi tiết đơn từ',
        timestamp: dayjs().format()
      });
    }
  }

  /**
   * Cập nhật đơn từ
   * PUT /applications/:id
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { data } = req.body;
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng không được xác thực'
        });
      }

      const application = await ApplicationModel.updateApplication(
        parseInt(id), userId, data
      );

      res.json({
        success: true,
        message: 'Cập nhật đơn từ thành công',
        data: application,
        timestamp: dayjs().format()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi cập nhật đơn từ',
        timestamp: dayjs().format()
      });
    }
  }

  /**
   * Hủy/Xóa đơn từ
   * DELETE /applications/:id
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng không được xác thực'
        });
      }

      const result = await ApplicationModel.cancelApplication(parseInt(id), userId);

      res.json({
        success: true,
        message: result.message,
        timestamp: dayjs().format()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi hủy đơn từ',
        timestamp: dayjs().format()
      });
    }
  }

  /**
   * Duyệt đơn từ
   * POST /applications/:id/approve
   */
  static async approve(req, res) {
    try {
      const { id } = req.params;
      const { note } = req.body;
      const approvedBy = getUserId(req);

      if (!approvedBy) {
        return res.status(401).json({
          success: false,
          message: 'Người duyệt không được xác thực'
        });
      }

      // Lấy thông tin đơn trước khi approve để xử lý
      const applicationBeforeApprove = await ApplicationModel.getApplicationById(parseInt(id));

      if (!applicationBeforeApprove) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn từ'
        });
      }

      // Xử lý riêng cho đơn quên check - cập nhật bảng chấm công TRƯỚC KHI approve
      if (applicationBeforeApprove.type === 'forgot-check') {
        try {
          console.log('📝 Processing forgot-check application approval...');
          console.log('Application data:', applicationBeforeApprove.data);

          const { forgotDate, forgotTime, forgotType } = applicationBeforeApprove.data;

          if (!forgotDate || !forgotTime || !forgotType) {
            return res.status(400).json({
              success: false,
              message: 'Dữ liệu đơn quên check không đầy đủ (thiếu forgotDate, forgotTime, hoặc forgotType)'
            });
          }

          // Lấy token từ request để truyền sang attendance-service
          const token = req.cookies.token ||
            (req.headers.authorization && req.headers.authorization.split(' ')[1]);

          if (!token) {
            return res.status(401).json({
              success: false,
              message: 'Không tìm thấy token để xác thực'
            });
          }

          // Gọi sang attendance-service QUA API GATEWAY để cập nhật bảng chấm công
          console.log(`🌐 Calling attendance service via API Gateway: ${API_GATEWAY_URL}/api/attendance/update-forgot-check`);

          const attendanceResponse = await axios.post(
            `${API_GATEWAY_URL}/api/attendance/update-forgot-check`,
            {
              userId: applicationBeforeApprove.userId,
              forgotDate,
              forgotTime,
              forgotType
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Cookie': `token=${token}`
              },
              timeout: 10000 // 10 seconds timeout
            }
          );

          console.log('✅ Attendance updated successfully:', attendanceResponse.data);

          // CHỈ SAU KHI cập nhật chấm công thành công, mới approve đơn
          const application = await ApplicationModel.approveApplication(
            parseInt(id), approvedBy, note
          );

          return res.json({
            success: true,
            message: 'Duyệt đơn từ và cập nhật chấm công thành công',
            data: application,
            attendanceUpdate: attendanceResponse.data,
            timestamp: dayjs().format()
          });

        } catch (attendanceError) {
          console.error('❌ Error updating attendance:', attendanceError.message);

          // Nếu lỗi khi cập nhật chấm công, KHÔNG approve đơn
          return res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật chấm công: ' + attendanceError.message,
            detail: attendanceError.response?.data || attendanceError.message,
            timestamp: dayjs().format()
          });
        }
      }

      // Đơn tăng ca: chỉ approve đơn, việc tính lương sẽ xử lý khi tính lương tháng
      if (applicationBeforeApprove.type === 'overtime') {
        console.log('📝 Approving overtime application (calculation will be done during salary processing)...');
        console.log('Application data:', applicationBeforeApprove.data);

        // Validate dữ liệu cơ bản
        const { overtimeDate, startTime, overtimeHours } = applicationBeforeApprove.data;
        if (!overtimeDate || !startTime || !overtimeHours) {
          return res.status(400).json({
            success: false,
            message: 'Dữ liệu đơn tăng ca không đầy đủ (thiếu overtimeDate, startTime, hoặc overtimeHours)'
          });
        }

        // Chỉ approve đơn, không xử lý tăng ca ngay
        const application = await ApplicationModel.approveApplication(
          parseInt(id), approvedBy, note
        );

        return res.json({
          success: true,
          message: 'Duyệt đơn tăng ca thành công. Lương tăng ca sẽ được tính khi xử lý lương tháng.',
          data: application,
          timestamp: dayjs().format()
        });
      }

      // Đơn thôi việc: chỉ approve đơn, việc cập nhật trạng thái user sẽ xử lý cuối tháng
      if (applicationBeforeApprove.type === 'resignation') {
        console.log('📝 Approving resignation application (user status will be updated during month-end processing)...');
        console.log('Application data:', applicationBeforeApprove.data);

        // Validate dữ liệu cơ bản
        const { resignationDate, resignationReason } = applicationBeforeApprove.data;
        if (!resignationDate || !resignationReason) {
          return res.status(400).json({
            success: false,
            message: 'Dữ liệu đơn thôi việc không đầy đủ (thiếu resignationDate hoặc resignationReason)'
          });
        }

        // Chỉ approve đơn, không cập nhật trạng thái user ngay
        const application = await ApplicationModel.approveApplication(
          parseInt(id), approvedBy, note
        );

        return res.json({
          success: true,
          message: 'Duyệt đơn thôi việc thành công. Trạng thái người dùng sẽ được cập nhật khi xử lý cuối tháng.',
          data: application,
          timestamp: dayjs().format()
        });
      }

      // Với các loại đơn khác, approve bình thường
      const application = await ApplicationModel.approveApplication(
        parseInt(id), approvedBy, note
      );

      res.json({
        success: true,
        message: 'Duyệt đơn từ thành công',
        data: application,
        timestamp: dayjs().format()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi duyệt đơn từ',
        timestamp: dayjs().format()
      });
    }
  }

  /**
   * Duyệt nhiều đơn từ cùng lúc
   * POST /applications/bulk-approve
   * Body: { ids: number[] }
   */
  static async bulkApprove(req, res) {
    try {
      const { ids } = req.body;
      const approvedBy = getUserId(req);

      if (!approvedBy) {
        return res.status(401).json({
          success: false,
          message: 'Người duyệt không được xác thực'
        });
      }

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Danh sách ID không hợp lệ'
        });
      }

      console.log(`📝 Bulk approving ${ids.length} applications by user ${approvedBy}...`);

      // Sử dụng Objection.js để update nhiều records cùng lúc
      const updatedCount = await ApplicationModel.query()
        .whereIn('id', ids)
        .where('status', 0) // Chỉ approve các đơn đang pending
        .patch({
          status: 1, // approved
          approvedBy: approvedBy,
          approvedDate: new Date().toISOString()
        });

      if (updatedCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'Không có đơn nào được duyệt. Vui lòng kiểm tra lại trạng thái đơn.'
        });
      }

      console.log(`✅ Successfully approved ${updatedCount} applications`);

      res.json({
        success: true,
        message: `Đã duyệt thành công ${updatedCount} đơn từ`,
        data: {
          approvedCount: updatedCount,
          requestedCount: ids.length
        },
        timestamp: dayjs().format()
      });
    } catch (error) {
      console.error('❌ Error in bulkApprove:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi duyệt đơn hàng loạt',
        timestamp: dayjs().format()
      });
    }
  }

  /**
   * Từ chối đơn từ
   * POST /applications/:id/reject
   */
  static async reject(req, res) {
    try {

      const { id } = req.params;
      const { rejectionReason } = req.body;
      const approvedBy = getUserId(req);

      if (!approvedBy) {
        return res.status(401).json({
          success: false,
          message: 'Người duyệt không được xác thực'
        });
      }

      // rejectionReason là optional, không bắt buộc
      const application = await ApplicationModel.rejectApplication(
        parseInt(id), approvedBy, rejectionReason || null
      );

      res.json({
        success: true,
        message: 'Từ chối đơn từ thành công',
        data: application,
        timestamp: dayjs().format()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi từ chối đơn từ',
        timestamp: dayjs().format()
      });
    }
  }

  /**
   * Lấy thống kê đơn từ
   * GET /applications/stats
   */
  static async getStats(req, res) {
    try {
      const { userId } = req.query;
      const currentUserId = getUserId(req);

      let targetUserId = null;
      if (userId) {
        targetUserId = parseInt(userId);
      } else if (currentUserId) {
        targetUserId = currentUserId;
      }

      // Only aggregate by user; remove date/type filters as requested
      const stats = await ApplicationModel.getApplicationStats(targetUserId, {});

      res.json({
        success: true,
        data: stats,
        timestamp: dayjs().format()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy thống kê',
        timestamp: dayjs().format()
      });
    }
  }

  /**
   * Lấy đơn từ theo khoảng thời gian
   * GET /applications/date-range
   */
  static async getByDateRange(req, res) {
    try {
      // Deprecated: previous implementation filtered by date/status.
      // Now only support paginated listing by optional userId.
      const { page = 1, pageSize = 10, userId } = req.query;
      const pageNum = parseInt(page);
      const pageSizeNum = parseInt(pageSize);
      const offset = (pageNum - 1) * pageSizeNum;

      const filters = {
        userId: userId ? parseInt(userId) : null
      };

      const applications = await ApplicationModel.getAllApplicationsPaginated(filters, offset, pageSizeNum);
      const totalCount = await ApplicationModel.getAllApplicationsCount(filters);

      // Lấy danh sách unique user IDs từ applications
      const uniqueUserIds = [...new Set(applications.map(app => app.userId))];

      // Lấy danh sách unique approvedBy IDs
      let uniqueApprovedIds = [];
      applications.forEach(app => {
        if (app.approvedBy != null) uniqueApprovedIds.push(app.approvedBy);
      });

      // Gọi Auth Service để lấy thông tin users
      const usersInfo = await AuthService.getUsersByIds(uniqueUserIds, getUserData(req));
      const approvedUsersInfo = uniqueApprovedIds.length > 0
        ? await AuthService.getUsersByIds(uniqueApprovedIds, getUserData(req))
        : [];

      // Tạo map để dễ dàng lookup user info
      const usersMap = {};
      usersInfo.forEach(user => {
        usersMap[user.id] = {
          id: user.id,
          username: user.username,
          fullName: `${user.lastName || ''} ${user.firstName || ''}`.trim() || user.username || 'N/A',
          email: user.email,
          identificationPhoto: user.identificationPhoto
        };
      });

      // Tạo map để dễ dàng lookup approved user info
      const approvedUsersMap = {};
      approvedUsersInfo.forEach(approve => {
        approvedUsersMap[approve.id] = {
          id: approve.id,
          username: approve.username,
          fullName: `${approve.lastName || ''} ${approve.firstName || ''}`.trim() || approve.username || 'N/A',
          email: approve.email,
          identificationPhoto: approve.identificationPhoto
        };
      });

      // Map applications với user info và approvedBy info
      const applicationsWithUserInfo = applications.map(application => ({
        ...application,
        userInfo: usersMap[application.userId] || null,
        approvedByInfo: approvedUsersMap[application.approvedBy] || null
      }));

      res.json({
        success: true,
        data: applicationsWithUserInfo,
        pagination: {
          page: pageNum,
          pageSize: pageSizeNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / pageSizeNum)
        },
        total: totalCount,
        timestamp: dayjs().format()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy danh sách đơn từ',
        timestamp: dayjs().format()
      });
    }
  }

  /**
   * Xóa đơn từ
   * DELETE /applications/:id
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng không được xác thực'
        });
      }

      // Lấy thông tin đơn từ để xóa files
      const application = await ApplicationModel.getApplicationById(parseInt(id));

      // Kiểm tra quyền xóa (chỉ người tạo hoặc admin mới được xóa)
      if (application.userId !== userId) {
        // TODO: Check if user is admin
        // For now, only creator can delete
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xóa đơn từ này'
        });
      }

      // Xóa files nếu có
      if (application.data?.evidence && Array.isArray(application.data.evidence)) {
        const { deleteFiles } = await import('../middleware/upload.js');
        deleteFiles(application.data.evidence.map(file => file.filename));
      }

      // Xóa đơn từ trong database
      await ApplicationModel.query().deleteById(parseInt(id));

      res.json({
        success: true,
        message: 'Xóa đơn từ thành công',
        timestamp: dayjs().format()
      });
    } catch (error) {
      res.status(error.message.includes('Không tìm thấy') ? 404 : 500).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi xóa đơn từ',
        timestamp: dayjs().format()
      });
    }
  }

  /**
   * Xóa nhiều đơn từ
   * POST /applications/bulk-delete
   */
  static async bulkDelete(req, res) {
    try {
      const { ids } = req.body;
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng không được xác thực'
        });
      }

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Danh sách ID không hợp lệ'
        });
      }

      const deletedCount = [];
      const errors = [];

      for (const id of ids) {
        try {
          const application = await ApplicationModel.getApplicationById(parseInt(id));

          // Kiểm tra quyền xóa
          if (application.userId !== userId) {
            errors.push({ id, message: 'Không có quyền xóa' });
            continue;
          }

          // Xóa files nếu có
          if (application.data?.evidence && Array.isArray(application.data.evidence)) {
            const { deleteFiles } = await import('../middleware/upload.js');
            deleteFiles(application.data.evidence.map(file => file.filename));
          }

          // Xóa đơn từ
          await ApplicationModel.query().deleteById(parseInt(id));
          deletedCount.push(id);
        } catch (error) {
          errors.push({ id, message: error.message });
        }
      }

      res.json({
        success: true,
        message: `Đã xóa ${deletedCount.length}/${ids.length} đơn từ`,
        data: {
          deleted: deletedCount,
          errors: errors
        },
        timestamp: dayjs().format()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi xóa đơn từ',
        timestamp: dayjs().format()
      });
    }
  }
}
