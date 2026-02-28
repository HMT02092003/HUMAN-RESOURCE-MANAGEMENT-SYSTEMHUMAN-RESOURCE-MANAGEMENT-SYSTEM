import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import RoleService from '../../services/RoleService';

// Permission bit flags
const PERMISSION_FLAGS = {
  delete: 1,
  update: 2,
  read: 4,
  create: 8,
  approve: 16,
};

const PERMISSION_LABELS = [
  { key: 'create', flag: 8, label: 'Tạo mới', color: '#52c41a' },
  { key: 'read', flag: 4, label: 'Xem', color: '#1890ff' },
  { key: 'update', flag: 2, label: 'Chỉnh sửa', color: '#faad14' },
  { key: 'delete', flag: 1, label: 'Xóa', color: '#ff4d4f' },
  { key: 'approve', flag: 16, label: 'Duyệt', color: '#722ed1' },
];

const SCOPE_OPTIONS = [
  { value: 1, label: 'Toàn cục' },
  { value: 2, label: 'Phòng ban' },
  { value: 3, label: 'Cá nhân' },
];

const RoleDecentralizationScreen = ({ navigation, route }) => {
  const { roleId, roleName } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [permissionValues, setPermissionValues] = useState({});
  const [scopeValues, setScopeValues] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});

  useEffect(() => {
    fetchPermissions();
  }, [roleId]);

  const fetchPermissions = async () => {
    if (!roleId) {
      Alert.alert('Lỗi', 'Thiếu ID vai trò');
      navigation.goBack();
      return;
    }
    setLoading(true);
    try {
      const data = await RoleService.getRolePermissions(roleId);
      const cats = Array.isArray(data) ? data : data?.data ?? [];

      const initPerms = {};
      const initScopes = {};
      cats.forEach((cat) => {
        (cat.permissions || []).forEach((perm) => {
          initPerms[perm.key] = perm.currentValue ? parseInt(perm.currentValue) : 0;
          initScopes[perm.key] = perm.scope ? parseInt(perm.scope) : 1;
        });
        // Default expand all categories
        expandedCategories[cat.id] = true;
      });

      setCategories(cats);
      setPermissionValues(initPerms);
      setScopeValues(initScopes);
      // Expand all by default
      const expanded = {};
      cats.forEach((c) => { expanded[c.id] = true; });
      setExpandedCategories(expanded);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      Alert.alert('Lỗi', 'Không thể tải dữ liệu phân quyền');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await RoleService.updateRolePermissions(roleId, permissionValues, scopeValues);
      Alert.alert('Thành công', 'Đã cập nhật phân quyền', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Lỗi', error?.response?.data?.error || 'Không thể cập nhật phân quyền');
    } finally {
      setSaving(false);
    }
  };

  const toggleFlag = (permKey, flag, isAvailable) => {
    if (!isAvailable) return;
    setPermissionValues((prev) => {
      const current = prev[permKey] || 0;
      const hasFlag = (current & flag) === flag;
      const newVal = hasFlag ? current & ~flag : current | flag;
      return { ...prev, [permKey]: newVal };
    });
  };

  const setScope = (permKey, scopeVal) => {
    setScopeValues((prev) => ({ ...prev, [permKey]: scopeVal }));
  };

  const toggleCategory = (catId) => {
    setExpandedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1890ff" />
        <Text style={styles.loadingText}>Đang tải phân quyền...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1890ff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Phân quyền</Text>
          {roleName ? <Text style={styles.headerSub}>{roleName}</Text> : null}
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="content-save" size={16} color="#fff" />
              <Text style={styles.saveBtnText}>Lưu</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Legend */}
        <View style={styles.legend}>
          {PERMISSION_LABELS.map((p) => (
            <View key={p.key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: p.color }]} />
              <Text style={styles.legendText}>{p.label}</Text>
            </View>
          ))}
        </View>

        {categories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="shield-off-outline" size={48} color="#bfbfbf" />
            <Text style={styles.emptyText}>Không có dữ liệu quyền</Text>
          </View>
        ) : (
          categories.map((category) => {
            const isExpanded = expandedCategories[category.id];
            return (
              <View key={category.id} style={styles.categoryBlock}>
                <TouchableOpacity
                  style={styles.categoryHeader}
                  onPress={() => toggleCategory(category.id)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="shield-account"
                    size={18}
                    color="#1890ff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <MaterialCommunityIcons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#8c8c8c"
                  />
                </TouchableOpacity>

                {isExpanded && (category.permissions || []).map((perm) => {
                  const currentValue = permissionValues[perm.key] || 0;
                  const currentScope = scopeValues[perm.key] || 1;

                  return (
                    <View key={perm.key} style={styles.permRow}>
                      <Text style={styles.permName} numberOfLines={1}>{perm.name}</Text>

                      {/* Permission flags row */}
                      <View style={styles.flagsRow}>
                        {PERMISSION_LABELS.map(({ key, flag, label, color }) => {
                          const isAvailable = (perm.value & flag) === flag;
                          const isChecked = (currentValue & flag) === flag;
                          return (
                            <TouchableOpacity
                              key={key}
                              style={[
                                styles.flagBtn,
                                isAvailable && isChecked && { backgroundColor: color, borderColor: color },
                                !isAvailable && styles.flagBtnDisabled,
                              ]}
                              onPress={() => toggleFlag(perm.key, flag, isAvailable)}
                              disabled={!isAvailable}
                              activeOpacity={0.7}
                            >
                              {isAvailable && isChecked ? (
                                <MaterialCommunityIcons name="check" size={10} color="#fff" />
                              ) : (
                                <MaterialCommunityIcons
                                  name="circle-outline"
                                  size={10}
                                  color={isAvailable ? color : '#d9d9d9'}
                                />
                              )}
                              <Text style={[
                                styles.flagBtnText,
                                isAvailable && isChecked && { color: '#fff' },
                                !isAvailable && { color: '#bfbfbf' },
                              ]}>{label}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* Scope row */}
                      <View style={styles.scopeRow}>
                        <Text style={styles.scopeLabel}>Phạm vi:</Text>
                        <View style={styles.scopeOptions}>
                          {SCOPE_OPTIONS.map((scope) => (
                            <TouchableOpacity
                              key={scope.value}
                              style={[
                                styles.scopeBtn,
                                currentScope === scope.value && styles.scopeBtnActive,
                              ]}
                              onPress={() => setScope(perm.key, scope.value)}
                            >
                              <Text style={[
                                styles.scopeBtnText,
                                currentScope === scope.value && styles.scopeBtnTextActive,
                              ]}>{scope.label}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#8c8c8c',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
    elevation: 2,
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#262626',
  },
  headerSub: {
    fontSize: 12,
    color: '#1890ff',
    marginTop: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1890ff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#595959',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    color: '#8c8c8c',
    fontSize: 14,
  },
  categoryBlock: {
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    overflow: 'hidden',
    elevation: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f0f5ff',
    borderBottomWidth: 1,
    borderBottomColor: '#d6e4ff',
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1890ff',
  },
  permRow: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  permName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 8,
  },
  flagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  flagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    backgroundColor: '#fafafa',
  },
  flagBtnDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e8e8e8',
  },
  flagBtnText: {
    fontSize: 10,
    color: '#595959',
    fontWeight: '500',
  },
  scopeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scopeLabel: {
    fontSize: 11,
    color: '#8c8c8c',
    minWidth: 50,
  },
  scopeOptions: {
    flexDirection: 'row',
    gap: 4,
  },
  scopeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    backgroundColor: '#fafafa',
  },
  scopeBtnActive: {
    borderColor: '#1890ff',
    backgroundColor: '#e6f4ff',
  },
  scopeBtnText: {
    fontSize: 11,
    color: '#595959',
  },
  scopeBtnTextActive: {
    color: '#1890ff',
    fontWeight: '600',
  },
});

export default RoleDecentralizationScreen;
