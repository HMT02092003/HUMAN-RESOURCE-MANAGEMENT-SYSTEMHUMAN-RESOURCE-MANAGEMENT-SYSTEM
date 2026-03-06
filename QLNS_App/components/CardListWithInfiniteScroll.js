/**
 * ============================================
 * CARD LIST WITH INFINITE SCROLL COMPONENT
 * ============================================
 * 
 * Component tái sử dụng để hiển thị danh sách dạng thẻ với:
 * - Infinite scroll (tự động load more khi cuộn xuống)
 * - Search/Filter UI
 * - Pull to refresh
 * - Card-based UI thay cho bảng
 * 
 * Props:
 * - fetchData: async function(page, pageSize, filters) => { results: [], total: 0 }
 * - renderCard: function(item) => <Component />
 * - searchPlaceholder: string
 * - filters: array of { key, label, type, options }
 * - onItemPress: function(item)
 * - pageSize: number (default 10)
 */

import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  ScrollView
} from 'react-native';
import {
  Surface,
  Text,
  Searchbar,
  ActivityIndicator,
  useTheme,
  Chip,
  IconButton,
  Menu,
  Button,
  Dialog,
  Portal,
  Checkbox,
  Divider
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const CardListWithInfiniteScroll = forwardRef(({
  fetchData,
  renderCard,
  searchPlaceholder = 'Tìm kiếm...',
  filters = [],
  onItemPress,
  pageSize = 10,
  emptyMessage = 'Không có dữ liệu',
  keyExtractor = (item) => item.id?.toString(),
}, ref) => {
  const theme = useTheme();

  // State
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filter state
  const [activeFilters, setActiveFilters] = useState({});
  const [filterDialogVisible, setFilterDialogVisible] = useState(false);
  const [tempFilters, setTempFilters] = useState({}); // Temporary filters before OK
  const [searchFields, setSearchFields] = useState([]); // selected searchable fields
  const [serverFieldSearchSupported, setServerFieldSearchSupported] = useState(true);

  // Expose refresh method to parent via ref
  useImperativeHandle(ref, () => ({
    refresh: () => {
      setHasMore(true);
      loadData(1, true);
    }
  }));

  // Initial load
  useEffect(() => {
    loadData(1, true);
  }, []);

  // Debounced search
  useEffect(() => {
    const delayTimer = setTimeout(() => {
      loadData(1, true);
    }, 500);

    return () => clearTimeout(delayTimer);
  }, [searchQuery, activeFilters]);

  // Initialize default searchFields and tempFilters from filters prop
  useEffect(() => {
    if (filters && filters.length > 0) {
      // Separate dropdown filters (type, status with options) from search fields
      const searchableFilters = filters.filter((f) => !f.options);
      const plainKeys = searchableFilters.filter(f => !f.key.includes('.')).map(f => f.key);
      const dottedKeys = searchableFilters.filter(f => f.key.includes('.')).map(f => f.key);
      if (plainKeys.length > 0) setSearchFields(plainKeys);
      else if (dottedKeys.length > 0) setSearchFields(dottedKeys);
    }
  }, [filters]);

  // Helper to safely get nested field values by dotted path (e.g. 'data.reason' or 'createdBy.fullName')
  const getFieldValue = (obj, path) => {
    if (!obj || !path) return undefined;
    return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
  };

  const loadData = async (pageNumber = 1, isRefresh = false) => {
    if (loading) return;
    if (!hasMore && !isRefresh && pageNumber > 1) return;

    try {
      setLoading(true);

      // Build base params
      const baseParams = {
        page: pageNumber,
        pageSize,
        ...activeFilters
      };

      // If there is a search query, try server-side first (including selected fields if backend supports it)
      let response;
      const q = searchQuery.trim();
      if (q) {
        if (serverFieldSearchSupported) {
          try {
            // Only include search-related params that backend expects.
            // Avoid sending a raw `searchFields` array (may contain dotted JSON paths)
            // Instead, if user selected exactly one dotted field (e.g. 'userInfo.fullName'),
            // send it as a query param with that key and value = q so controller can handle it.
            const safeSearchFields = (searchFields || []).filter((k) => !['type', 'status'].includes(k));
            const params = { ...baseParams, search: q };

            // If exactly one selected field and it's a dotted field, send it as param: { 'userInfo.fullName': q }
            const dotted = safeSearchFields.filter((k) => k && k.includes('.'));
            const flat = safeSearchFields.filter((k) => k && !k.includes('.'));

            if (dotted.length === 1 && flat.length === 0) {
              params[dotted[0]] = q;
            } else if (flat.length > 0 && dotted.length === 0) {
              // For plain fields (no dots), don't send array; let backend use `search` for its default searchable fields.
            } else {
              // Mixed or multiple dotted selections - fallback to generic `search` only
            }

            console.log('🔎 [CardList] Server search params:', params);
            response = await fetchData(params);
            console.log('🔎 [CardList] Server search response:', response);
          } catch (err) {
            // Detect SQL column error from backend and fallback to client-side filtering
            const msg = err?.message || err?.toString() || JSON.stringify(err);
            if (/column .* does not exist|column .*does not exist|does not exist/i.test(msg)) {
              console.warn('⚠️ [CardList] Server-side field search failed, will retry without field list then fallback to client-side', msg);
              setServerFieldSearchSupported(false);
            } else {
              throw err;
            }
          }
        }

        // If server did not return response (either unsupported or error), try basic server search without searchFields
        if (!response && serverFieldSearchSupported === false) {
          try {
            console.log('🔎 [CardList] Retrying server search without searchFields');
            response = await fetchData({ ...baseParams, search: q });
            console.log('🔎 [CardList] Retry response:', response);
          } catch (err) {
            console.warn('⚠️ [CardList] Retry without searchFields failed, will do client-side filtering', err?.message || err);
            response = null;
          }
        }

        // If server did not return response (either unsupported or error), perform client-side filtering
        if (!response) {
          // We'll fetch pages from server without search and filter locally until we have enough items
          const accumulated = [];
          let fetchedPage = 1;
          let fetchedTotal = null;
          const pageFetchSize = Math.max(pageSize, 50); // fetch a larger page for client filter
          while (true) {
            const params = { page: fetchedPage, pageSize: pageFetchSize, ...activeFilters };
            console.log('📥 [CardList] Fetching page for client-side filter:', params);
            const r = await fetchData(params);
            const pageItems = r.results || r.data || [];
            fetchedTotal = r.total || fetchedTotal || 0;

            // filter items by selected fields
            const qLower = q.toLowerCase();
            const allowedFields = (searchFields || []).filter((k) => !['type', 'status'].includes(k));
            const matched = pageItems.filter((it) => {
              return allowedFields.some((field) => {
                const val = getFieldValue(it, field) ?? '';
                return String(val).toLowerCase().includes(qLower);
              });
            });

            accumulated.push(...matched);

            // stop when we have at least pageSize items or fetched all pages
            if (accumulated.length >= pageSize || (fetchedPage * pageFetchSize) >= fetchedTotal) {
              break;
            }
            fetchedPage += 1;
          }

          // Use accumulated as the newData for this load
          response = { results: accumulated, total: accumulated.length };
        }
      } else {
        // No search query - normal fetch
        response = await fetchData(baseParams);
        console.log('🔁 [CardList] fetchData (no search) response:', response);
      }
      const newData = response?.results || response?.data || [];
      const total = response?.pagination?.total ?? response?.total ?? (Array.isArray(newData) ? newData.length : 0);
      console.log('🔁 [CardList] derived newData length:', Array.isArray(newData) ? newData.length : 'N/A', 'total:', total);

      if (isRefresh) {
        setData(newData);
        setPage(1);
        setHasMore(newData.length < total);
      } else {
        setData((prevData) => {
          const combined = [...prevData, ...newData];
          setHasMore(combined.length < total);
          return combined;
        });
        setPage(pageNumber);
      }

      setTotalRecords(total);
    } catch (error) {
      console.error('❌ [CardList] Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setHasMore(true);
    loadData(1, true);
  }, [searchQuery, activeFilters]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadData(page + 1, false);
    }
  };

  const handleFilterChange = (filterKey, value) => {
    setActiveFilters((prev) => ({
      ...prev,
      [filterKey]: value
    }));
  };

  const clearFilters = () => {
    setActiveFilters({});
    setSearchQuery('');
  };

  const activeFilterCount = Object.keys(activeFilters).filter(
    (key) => activeFilters[key] !== undefined && activeFilters[key] !== ''
  ).length;

  // Render item wrapper
  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => onItemPress && onItemPress(item)}
      activeOpacity={0.7}
    >
      {renderCard(item)}
    </TouchableOpacity>
  );

  // Render footer (loading indicator)
  const renderFooter = () => {
    if (!loading || refreshing) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.footerText}>Đang tải thêm...</Text>
      </View>
    );
  };

  // Render empty list
  const renderEmpty = () => {
    if (loading && data.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.emptyText}>Đang tải dữ liệu...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
          name="inbox"
          size={64}
          color={theme.colors.disabled}
        />
        <Text style={styles.emptyText}>{emptyMessage}</Text>
        {(searchQuery || activeFilterCount > 0) && (
          <Button mode="outlined" onPress={clearFilters} style={styles.clearButton}>
            Xóa bộ lọc
          </Button>
        )}
      </View>
    );
  };

  // Small helper for parent components to know which fields are active
  // (optional) expose via console when performing search
  useEffect(() => {
    if (searchQuery) {
      console.log('🔎 [CardList] Current search query:', searchQuery, 'fields:', searchFields);
    }
  }, [searchQuery, searchFields]);

  // Open filter dialog and initialize temp filters with current active filters
  const openFilterDialog = () => {
    setTempFilters({ ...activeFilters });
    setFilterDialogVisible(true);
  };

  // Apply filters from dialog
  const applyFilters = () => {
    setActiveFilters({ ...tempFilters });
    setFilterDialogVisible(false);
  };

  // Cancel filter changes
  const cancelFilters = () => {
    setTempFilters({ ...activeFilters });
    setFilterDialogVisible(false);
  };

  // Handle temp filter change in dialog
  const handleTempFilterChange = (key, value) => {
    setTempFilters((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  // Separate filters into dropdown filters (with options) and search fields (without options)
  const dropdownFilters = filters.filter(f => f.options && f.options.length > 0);
  const searchableFilters = filters.filter(f => !f.options);

  return (
    <View style={styles.container}>
      {/* Search Bar with Filter Icon */}
      <Surface style={styles.searchContainer} elevation={1}>
        <Searchbar placeholder={searchPlaceholder} onChangeText={setSearchQuery} value={searchQuery} style={styles.searchbar} iconColor={theme.colors.primary}
          loading={loading}
        />

        {/* Filter Icon Button */}
        {(dropdownFilters.length > 0 || searchableFilters.length > 0) && (
          <IconButton
            icon="filter-variant"
            size={24}
            onPress={openFilterDialog}
            style={styles.filterButton}
          />
        )}
      </Surface>

      {/* Filter Dialog */}
      <Portal>
        <Dialog visible={filterDialogVisible} onDismiss={cancelFilters} style={styles.filterDialog}>
          <Dialog.Title>Bộ lọc</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView>
              {/* Dropdown Filters (type, status, etc) */}
              {dropdownFilters.map((filter) => (
                <View key={filter.key} style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>{filter.label}</Text>
                  {filter.options?.map((option) => (
                    <View key={option.value} style={styles.filterOption}>
                      <Checkbox
                        status={tempFilters[filter.key] === option.value ? 'checked' : 'unchecked'}
                        onPress={() => {
                          // Toggle: if already selected, unselect; otherwise select
                          if (tempFilters[filter.key] === option.value) {
                            handleTempFilterChange(filter.key, undefined);
                          } else {
                            handleTempFilterChange(filter.key, option.value);
                          }
                        }}
                      />
                      <Text style={styles.filterOptionText}>{option.label}</Text>
                    </View>
                  ))}
                  {dropdownFilters.indexOf(filter) < dropdownFilters.length - 1 && (
                    <Divider style={styles.filterDivider} />
                  )}
                </View>
              ))}

              {/* Search Fields Selection (if any) */}
              {searchableFilters.length > 0 && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Tìm kiếm theo</Text>
                  {searchableFilters.map((f) => (
                    <View key={f.key} style={styles.filterOption}>
                      <Checkbox
                        status={searchFields.includes(f.key) ? 'checked' : 'unchecked'}
                        onPress={() => {
                          setSearchFields((prev) => {
                            if (prev.includes(f.key)) return prev.filter((k) => k !== f.key);
                            return [...prev, f.key];
                          });
                        }}
                      />
                      <Text style={styles.filterOptionText}>{f.label}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={cancelFilters}>Hủy</Button>
            <Button onPress={applyFilters}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Active Filters Chips */}
      {activeFilterCount > 0 && (
        <View style={styles.activeFiltersContainer}>
          {Object.keys(activeFilters).map((key) => {
            if (!activeFilters[key] && activeFilters[key] !== 0) return null;
            const filter = filters.find(f => f.key === key);
            const label = filter?.label || key;
            let valueLabel = activeFilters[key];
            if (filter?.options) {
              const option = filter.options.find(o => o.value === activeFilters[key]);
              valueLabel = option?.label || activeFilters[key];
            }
            return (
              <Chip
                key={key}
                mode="outlined"
                onClose={() => handleFilterChange(key, undefined)}
                style={styles.filterChip}
              >
                {`${label}: ${valueLabel}`}
              </Chip>
            );
          })}
          <Button mode="text" onPress={clearFilters} compact>
            Xóa tất cả
          </Button>
        </View>
      )}

      {/* Result Count */}
      <View style={styles.resultCountContainer}>
        <Text style={styles.resultCount}>
          {loading && data.length === 0
            ? 'Đang tải...'
            : `Tổng số: ${totalRecords} bản ghi`}
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  filterDialog: {
    borderRadius: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff'
  },
  searchbar: {
    flex: 1,
    elevation: 0,
    backgroundColor: '#f5f5f5'
  },
  filterButton: {
    marginLeft: 8
  },
  filterSection: {
    marginBottom: 16
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 8,
    paddingHorizontal: 4
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4
  },
  filterOptionText: {
    marginLeft: 8,
    fontSize: 15,
    color: '#262626'
  },
  filterDivider: {
    marginVertical: 12
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: '#fff'
  },
  filterChip: {
    marginRight: 8,
    marginBottom: 8
  },
  resultCountContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  resultCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500'
  },
  listContent: {
    padding: 16,
    flexGrow: 1
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center'
  },
  footerText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center'
  },
  clearButton: {
    marginTop: 16
  }
});

export default React.memo(CardListWithInfiniteScroll);
