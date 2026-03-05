import React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import {
  Card,
  Avatar,
  Text,
  IconButton,
  useTheme,
  Menu,
  Divider,
  FAB,
  Chip,
  Badge
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CardListWithInfiniteScroll from '../../components/CardListWithInfiniteScroll';
import CheckPermission from '../../components/CheckPermission';

// TODO: Create ContractService.js when real API is available
const ContractService = {
  getAllContracts: async () => {
    // Fake data for now - replace with real API call
    return [
      { id: 1, employee: 'Nguyễn Văn A', employeeId: 1, type: 'Chính thức', startDate: '2023-01-01', endDate: '2025-12-31', status: 'active' },
      { id: 2, employee: 'Trần Thị B', employeeId: 2, type: 'Thử việc', startDate: '2024-10-01', endDate: '2024-12-31', status: 'active' },
      { id: 3, employee: 'Lê Văn C', employeeId: 3, type: 'Hợp đồng', startDate: '2024-01-01', endDate: '2024-06-30', status: 'expired' },
      { id: 4, employee: 'Phạm Thị D', employeeId: 4, type: 'Chính thức', startDate: '2022-05-01', endDate: '2026-04-30', status: 'active' },
      { id: 5, employee: 'Hoàng Văn E', employeeId: 5, type: 'Thực tập', startDate: '2024-11-01', endDate: '2025-02-28', status: 'active' },
    ];
  },
  deleteContract: async (id) => {
    console.log('Delete contract:', id);
    return { success: true };
  }
};

const ContractListScreen = ({ navigation }) => {
  const theme = useTheme();
  const [visibleMenuId, setVisibleMenuId] = React.useState(null);

  // Fetch data function for CardList
  const fetchContracts = async (params) => {
    try {
      console.log('📄 [ContractList] Fetching contracts with params:', params);

      // Get all contracts (replace with paginated API when available)
      const allContracts = await ContractService.getAllContracts();

      // Client-side search
      let filtered = allContracts;
      if (params.search) {
        const searchLower = params.search.toLowerCase();
        filtered = allContracts.filter(contract =>
          contract.employee?.toLowerCase().includes(searchLower) ||
          contract.type?.toLowerCase().includes(searchLower)
        );
      }

      // Client-side pagination
      const start = (params.page - 1) * params.pageSize;
      const end = start + params.pageSize;
      const results = filtered.slice(start, end);

      return {
        results,
        total: filtered.length
      };
    } catch (error) {
      console.error(' [ContractList] Error fetching contracts:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách hợp đồng');
      return { results: [], total: 0 };
    }
  };

  // Delete contract handler
  const handleDeleteContract = (contractId, employeeName) => {
    Alert.alert(
      '🗑️ Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa hợp đồng của "${employeeName}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await ContractService.deleteContract(contractId);
              Alert.alert(' Thành công', 'Đã xóa hợp đồng');
            } catch (error) {
              console.error(' [ContractList] Delete failed:', error);
              Alert.alert('Lỗi', 'Không thể xóa hợp đồng');
            }
          }
        }
      ]
    );
  };

  // Utility functions
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#52c41a';
      case 'expired':
        return '#ff4d4f';
      case 'pending':
        return '#fa8c16';
      default:
        return '#8c8c8c';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Còn hiệu lực';
      case 'expired':
        return 'Hết hạn';
      case 'pending':
        return 'Chờ duyệt';
      default:
        return 'Không xác định';
    }
  };

  const getContractTypeColor = (type) => {
    const colorMap = {
      'Chính thức': '#1890ff',
      'Thử việc': '#fa8c16',
      'Thực tập': '#722ed1',
      'Hợp đồng': '#52c41a'
    };
    return colorMap[type] || '#8c8c8c';
  };

  const getDaysRemaining = (endDate) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Render contract card
  const renderContractCard = (item, index) => {
    const daysRemaining = getDaysRemaining(item.endDate);
    const isExpiringSoon = daysRemaining <= 30 && daysRemaining > 0;

    return (
      <Card style={styles.card} mode="elevated" elevation={2}>
        <Card.Content style={styles.cardContent}>
          {/* ROW 1: ICON + INFO + ACTIONS */}
          <View style={styles.topRow}>
            {/* Contract Icon with Status Badge */}
            <View style={styles.iconWrapper}>
              <Avatar.Icon
                size={56}
                icon="file-document"
                style={{ backgroundColor: getContractTypeColor(item.type) }}
              />
              <Badge
                size={14}
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(item.status) }
                ]}
              />
            </View>

            {/* Contract Info */}
            <View style={styles.infoSection}>
              <Text style={styles.employeeName} numberOfLines={1}>
                {item.employee || 'N/A'}
              </Text>

              {/* Contract Type */}
              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name="briefcase"
                  size={14}
                  color={getContractTypeColor(item.type)}
                />
                <Text style={styles.infoText}>{item.type}</Text>
              </View>

              {/* Date Range */}
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar-range" size={14} color="#1890ff" />
                <Text style={styles.infoText}>
                  {formatDate(item.startDate)} → {formatDate(item.endDate)}
                </Text>
              </View>

              {/* Status */}
              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name={item.status === 'active' ? 'check-circle' : 'close-circle'}
                  size={14}
                  color={getStatusColor(item.status)}
                />
                <Text style={[styles.infoText, { color: getStatusColor(item.status) }]}>
                  {getStatusText(item.status)}
                </Text>
              </View>
            </View>

            {/* Actions Menu */}
            <View style={styles.actionsColumn}>
              <Menu
                visible={visibleMenuId === item.id}
                onDismiss={() => setVisibleMenuId(null)}
                anchor={
                  <IconButton
                    icon="dots-vertical"
                    size={24}
                    iconColor="#595959"
                    onPress={() => setVisibleMenuId(item.id)}
                  />
                }
              >
                <TouchableOpacity
                  style={styles.menuItemRow}
                  onPress={() => {
                    setVisibleMenuId(null);
                    Alert.alert('Chức năng', 'Xem chi tiết hợp đồng');
                  }}
                >
                  <MaterialCommunityIcons name="eye-outline" size={18} color="#595959" style={styles.menuIcon} />
                  <Text style={styles.menuItemText}>Xem chi tiết</Text>
                </TouchableOpacity>

                <CheckPermission permissionKey="contracts" requiredType="update">
                  <TouchableOpacity
                    style={styles.menuItemRow}
                    onPress={() => {
                      setVisibleMenuId(null);
                      Alert.alert('Chức năng', 'Chỉnh sửa hợp đồng');
                    }}
                  >
                    <MaterialCommunityIcons name="pencil-outline" size={18} color="#595959" style={styles.menuIcon} />
                    <Text style={styles.menuItemText}>Chỉnh sửa</Text>
                  </TouchableOpacity>
                </CheckPermission>

                <CheckPermission permissionKey="contracts" requiredType="update">
                  {item.status === 'active' && (
                    <TouchableOpacity
                      style={styles.menuItemRow}
                      onPress={() => {
                        setVisibleMenuId(null);
                        Alert.alert('Chức năng', 'Gia hạn hợp đồng');
                      }}
                    >
                      <MaterialCommunityIcons name="refresh" size={18} color="#52c41a" style={styles.menuIcon} />
                      <Text style={[styles.menuItemText, { color: '#52c41a' }]}>Gia hạn</Text>
                    </TouchableOpacity>
                  )}
                </CheckPermission>

                <CheckPermission permissionKey="contracts" requiredType="delete">
                  <>
                    <Divider />
                    <TouchableOpacity
                      style={styles.menuItemRow}
                      onPress={() => {
                        setVisibleMenuId(null);
                        handleDeleteContract(item.id, item.employee);
                      }}
                    >
                      <MaterialCommunityIcons name="delete-outline" size={18} color="#ff4d4f" style={styles.menuIcon} />
                      <Text style={[styles.menuItemText, { color: '#ff4d4f' }]}>Xóa</Text>
                    </TouchableOpacity>
                  </>
                </CheckPermission>
              </Menu>
            </View>
          </View>

          {/* ROW 2: WARNING/INFO CHIPS */}
          {(isExpiringSoon || item.status === 'expired') && (
            <View style={styles.warningRow}>
              {isExpiringSoon && (
                <Chip
                  icon="alert"
                  mode="flat"
                  style={styles.warningChip}
                  textStyle={styles.warningChipText}
                >
                  Còn {daysRemaining} ngày hết hạn
                </Chip>
              )}
              {item.status === 'expired' && (
                <Chip
                  icon="close-circle"
                  mode="flat"
                  style={styles.expiredChip}
                  textStyle={styles.expiredChipText}
                >
                  Đã hết hạn
                </Chip>
              )}
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  // Item press handler
  const handleItemPress = (item) => {
    Alert.alert('Chi tiết', `Xem chi tiết hợp đồng của ${item.employee}`);
  };

  return (
    <View style={styles.container}>
      <CardListWithInfiniteScroll
        fetchData={fetchContracts}
        renderCard={renderContractCard}
        searchPlaceholder="Tìm theo tên nhân viên, loại hợp đồng..."
        onItemPress={handleItemPress}
        pageSize={10}
        emptyMessage="Không tìm thấy hợp đồng nào"
        keyExtractor={(item) => item.id?.toString()}
      />

      {/* FAB - Add Contract */}
      <CheckPermission permissionKey="contracts" requiredType="create">
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => Alert.alert('Chức năng', 'Thêm hợp đồng mới')}
          color="#fff"
        />
      </CheckPermission>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff'
  },
  cardContent: {
    padding: 16
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  iconWrapper: {
    position: 'relative',
    marginRight: 12
  },
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: '#fff'
  },
  infoSection: {
    flex: 1,
    justifyContent: 'center'
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 6
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  infoText: {
    fontSize: 13,
    color: '#595959',
    marginLeft: 6,
    flex: 1
  },
  actionsColumn: {
    marginLeft: 8
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  menuIcon: {
    marginRight: 12
  },
  menuItemText: {
    fontSize: 14,
    color: '#262626'
  },
  warningRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  warningChip: {
    height: 28,
    backgroundColor: '#fff7e6'
  },
  warningChipText: {
    fontSize: 12,
    color: '#fa8c16',
    marginVertical: 0
  },
  expiredChip: {
    height: 28,
    backgroundColor: '#fff1f0'
  },
  expiredChipText: {
    fontSize: 12,
    color: '#ff4d4f',
    marginVertical: 0
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#52c41a'
  }
});

export default ContractListScreen;
