/**
 * QueryBuilder - Utility functions để xây dựng query với search, sort, filter
 * Sử dụng cho các service có Objection.js
 */

/**
 * Áp dụng search cho query
 * @param {Object} query - Objection query builder
 * @param {string} searchValue - Giá trị tìm kiếm
 * @param {string[]} searchFields - Mảng các field có thể search (format: 'table.column' hoặc 'column')
 * @param {string} searchField - Field cụ thể để search (nếu có)
 * @returns {Object} query
 */
export function applySearch(query, searchValue, searchFields, searchField) {
  if (!searchValue || searchValue.trim() === '') return query;

  const term = `%${searchValue.trim().toLowerCase()}%`;

  if (searchField && searchFields.includes(searchField)) {
    // Search trên field cụ thể
    query = query.whereRaw(`LOWER(${searchField}) LIKE ?`, [term]);
  } else {
    // Search trên tất cả các fields
    query = query.where(function () {
      searchFields.forEach((field, index) => {
        if (index === 0) {
          this.whereRaw(`LOWER(${field}) LIKE ?`, [term]);
        } else {
          this.orWhereRaw(`LOWER(${field}) LIKE ?`, [term]);
        }
      });
    });
  }

  return query;
}

/**
 * Áp dụng các filter cho query
 * @param {Object} query - Objection query builder
 * @param {Object} filters - Object chứa các filter { fieldName: value }
 * @param {Object} fieldMapping - Mapping từ filter key sang database column
 * @returns {Object} query
 */
export function applyFilters(query, filters, fieldMapping = {}) {
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;

    const dbField = fieldMapping[key] || key;

    // Xử lý date range (From/To)
    if (key.endsWith('From')) {
      const baseKey = key.replace('From', '');
      const dbFieldForDate = fieldMapping[baseKey] || baseKey;
      query = query.where(dbFieldForDate, '>=', value);
    } else if (key.endsWith('To')) {
      const baseKey = key.replace('To', '');
      const dbFieldForDate = fieldMapping[baseKey] || baseKey;
      // Thêm time cho end date để bao gồm cả ngày cuối
      const endValue = value.includes(' ') ? value : `${value} 23:59:59`;
      query = query.where(dbFieldForDate, '<=', endValue);
    } else if (key.endsWith('Start')) {
      // Alternative format: xxxStart/xxxEnd
      const baseKey = key.replace('Start', '');
      const dbFieldForDate = fieldMapping[baseKey] || baseKey;
      query = query.where(dbFieldForDate, '>=', value);
    } else if (key.endsWith('End')) {
      const baseKey = key.replace('End', '');
      const dbFieldForDate = fieldMapping[baseKey] || baseKey;
      const endValue = value.includes(' ') ? value : `${value} 23:59:59`;
      query = query.where(dbFieldForDate, '<=', endValue);
    } else {
      // Filter thông thường (exact match)
      query = query.where(dbField, value);
    }
  });

  return query;
}

/**
 * Áp dụng sorting cho query
 * @param {Object} query - Objection query builder
 * @param {string} sortField - Field để sort
 * @param {string} sortOrder - 'asc' | 'desc'
 * @param {Object} fieldMapping - Mapping từ sort field sang database column
 * @param {Object} defaultSort - Default sort config { field, order }
 * @returns {Object} query
 */
export function applySorting(
  query,
  sortField,
  sortOrder,
  fieldMapping = {},
  defaultSort = { field: 'created_at', order: 'desc' }
) {
  const field = sortField || defaultSort.field;
  const order = (sortOrder === 'asc' || sortOrder === 'desc') ? sortOrder : defaultSort.order;
  
  const dbField = fieldMapping[field] || field;

  return query.orderBy(dbField, order);
}

/**
 * Áp dụng pagination cho query
 * @param {Object} query - Objection query builder
 * @param {number} page - Số trang (1-based)
 * @param {number} limit - Số items per page
 * @returns {Object} query
 */
export function applyPagination(query, page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  return query.offset(offset).limit(limit);
}

/**
 * Xây dựng query hoàn chỉnh với tất cả các tính năng
 * @param {Object} baseQuery - Base query đã được setup
 * @param {Object} params - Request query params
 * @param {Object} config - Cấu hình cho query builder
 * @returns {Object} { query, page, limit }
 */
export function buildQuery(baseQuery, params, config = {}) {
  const {
    searchFields = [],
    filterFields = [],
    fieldMapping = {},
    defaultSort = { field: 'created_at', order: 'desc' },
  } = config;

  let query = baseQuery;

  // Extract pagination params
  const page = parseInt(String(params.page)) || 1;
  const limit = parseInt(String(params.limit)) || 10;

  // Extract sort params
  const sortField = params.sort;
  const sortOrder = params.order;

  // Extract search params
  const search = params.search;
  const searchField = params.search_field;

  // Build filters from remaining params
  const filters = {};
  Object.entries(params).forEach(([key, value]) => {
    // Skip pagination, sort, search params
    if (['page', 'limit', 'sort', 'order', 'search', 'search_field'].includes(key)) return;
    
    // Check if this is a filter field
    const isFilterField = filterFields.length === 0 || 
      filterFields.some(f => key === f || key.startsWith(f));
    
    if (isFilterField && value !== undefined && value !== null && value !== '') {
      filters[key] = value;
    }
  });

  // Apply search
  if (search && searchFields.length > 0) {
    query = applySearch(query, search, searchFields, searchField);
  }

  // Apply filters
  query = applyFilters(query, filters, fieldMapping);

  // Apply sorting
  query = applySorting(query, sortField, sortOrder, fieldMapping, defaultSort);

  return { query, page, limit };
}

/**
 * Thực hiện query hoàn chỉnh với pagination
 * @param {Object} baseQuery - Base query đã được setup
 * @param {Object} params - Request query params
 * @param {Object} config - Cấu hình cho query builder
 * @returns {Promise<Object>} { data, total, page, limit }
 */
export async function executeQuery(baseQuery, params, config = {}) {
  const { query, page, limit } = buildQuery(baseQuery, params, config);
  
  // Clone query để count
  const countQuery = query.clone().clearOrder();
  const total = await countQuery.resultSize();
  
  // Apply pagination và execute
  const data = await applyPagination(query, page, limit);

  return { data, total, page, limit };
}

/**
 * Chỉ đếm tổng số records (không pagination)
 * @param {Object} baseQuery - Base query đã được setup
 * @param {Object} params - Request query params
 * @param {Object} config - Cấu hình cho query builder
 * @returns {Promise<number>} total count
 */
export async function getQueryCount(baseQuery, params, config = {}) {
  const { query } = buildQuery(baseQuery, params, config);
  // Clone query và bỏ sort để count
  const countQuery = query.clone().clearOrder();
  return await countQuery.resultSize();
}
