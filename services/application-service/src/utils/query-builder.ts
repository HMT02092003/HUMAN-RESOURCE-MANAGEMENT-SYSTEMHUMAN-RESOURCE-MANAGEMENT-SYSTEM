/**
 * QueryBuilder - Utility functions để xây dựng query với search, sort, filter
 * Sử dụng cho các service có Objection.js
 */

/**
 * Áp dụng search cho query
 * @param query - Objection query builder
 * @param searchValue - Giá trị tìm kiếm
 * @param searchFields - Mảng các field có thể search (format: 'table.column' hoặc 'column')
 * @param searchField - Field cụ thể để search (nếu có)
 */
export function applySearch(
  query: any,
  searchValue: string | undefined,
  searchFields: string[],
  searchField?: string
) {
  if (!searchValue || searchValue.trim() === '') return query;

  const term = `%${searchValue.trim().toLowerCase()}%`;

  if (searchField && searchFields.includes(searchField)) {
    // Search trên field cụ thể
    query = query.whereRaw(`LOWER(${searchField}) LIKE ?`, [term]);
  } else {
    // Search trên tất cả các fields
    query = query.where(function (this: any) {
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
 * @param query - Objection query builder
 * @param filters - Object chứa các filter { fieldName: value }
 * @param fieldMapping - Mapping từ filter key sang database column
 */
export function applyFilters(
  query: any,
  filters: Record<string, any>,
  fieldMapping: Record<string, string> = {}
) {
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
      // Thêm time cho end date để bao gồm cả ngày cuối. Checks for space (YYYY-MM-DD HH:mm:ss) or T (ISO)
      const endValue = (value.includes(' ') || value.includes('T')) ? value : `${value} 23:59:59`;
      query = query.where(dbFieldForDate, '<=', endValue);
    } else if (key.endsWith('Start')) {
      // Alternative format: xxxStart/xxxEnd
      const baseKey = key.replace('Start', '');
      const dbFieldForDate = fieldMapping[baseKey] || baseKey;
      query = query.where(dbFieldForDate, '>=', value);
    } else if (key.endsWith('End')) {
      const baseKey = key.replace('End', '');
      const dbFieldForDate = fieldMapping[baseKey] || baseKey;
      const endValue = (value.includes(' ') || value.includes('T')) ? value : `${value} 23:59:59`;
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
 * @param query - Objection query builder
 * @param sortField - Field để sort
 * @param sortOrder - 'asc' | 'desc'
 * @param fieldMapping - Mapping từ sort field sang database column
 * @param defaultSort - Default sort config { field, order }
 */
export function applySorting(
  query: any,
  sortField: string | undefined,
  sortOrder: string | undefined,
  fieldMapping: Record<string, string> = {},
  defaultSort: { field: string; order: 'asc' | 'desc' } = { field: 'created_at', order: 'desc' }
) {
  const field = sortField || defaultSort.field;
  const order = (sortOrder === 'asc' || sortOrder === 'desc') ? sortOrder : defaultSort.order;
  
  const dbField = fieldMapping[field] || field;

  return query.orderBy(dbField, order);
}

/**
 * Áp dụng pagination cho query
 * @param query - Objection query builder
 * @param page - Số trang (1-based)
 * @param limit - Số items per page
 */
export function applyPagination(query: any, page: number = 1, limit: number = 10) {
  const offset = (page - 1) * limit;
  return query.offset(offset).limit(limit);
}

/**
 * Xây dựng query hoàn chỉnh với tất cả các tính năng
 * @param baseQuery - Base query đã được setup
 * @param params - Request query params
 * @param config - Cấu hình cho query builder
 */
export interface QueryBuilderConfig {
  searchFields?: string[];
  filterFields?: string[];
  fieldMapping?: Record<string, string>;
  defaultSort?: { field: string; order: 'asc' | 'desc' };
}

export interface QueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
  search?: string;
  search_field?: string;
  [key: string]: any;
}

export function buildQuery(
  baseQuery: any,
  params: QueryParams,
  config: QueryBuilderConfig = {}
) {
  const {
    searchFields = [],
    filterFields = [],
    fieldMapping = {},
    defaultSort = { field: 'created_at', order: 'desc' as const },
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
  const filters: Record<string, any> = {};
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
 * Lấy tổng số records (không pagination)
 */
export async function getQueryCount(
  baseQuery: any,
  params: QueryParams,
  config: QueryBuilderConfig = {}
): Promise<number> {
  const { query } = buildQuery(baseQuery, params, config);
  // Clone query và bỏ sort để count
  const countQuery = query.clone().clearOrder();
  return await countQuery.resultSize();
}

/**
 * Thực hiện query hoàn chỉnh với pagination
 */
export async function executeQuery<T>(
  baseQuery: any,
  params: QueryParams,
  config: QueryBuilderConfig = {}
): Promise<{ data: T[]; total: number; page: number; limit: number }> {
  const { query, page, limit } = buildQuery(baseQuery, params, config);
  
  // Clone query để count
  const countQuery = query.clone().clearOrder();
  const total = await countQuery.resultSize();
  
  // Apply pagination và execute
  const data = await applyPagination(query, page, limit);

  return { data, total, page, limit };
}
