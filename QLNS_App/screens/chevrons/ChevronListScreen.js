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
  Chip
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CardListWithInfiniteScroll from '../../components/CardListWithInfiniteScroll';
import { ChevronService } from '../../services/ChevronService';
import CheckPermission from '../../components/CheckPermission';

const ChevronListScreen = ({ navigation }) => {
  const theme = useTheme();
  const [visibleMenuId, setVisibleMenuId] = React.useState(null);

  // Fetch data function for CardList
  const fetchChevrons = async (params) => {
    try {
      console.log('👔 [ChevronList] Fetching chevrons with params:', params);

      const response = await ChevronService.getAllChevrons({
        page: params.page,
        limit: params.pageSize,
        search: params.search
      });

      return {
        results: response.data || [],
        total: response.pagination?.total || response.total || 0
      };
    } catch (error) {
      console.error('❌ [ChevronList] Error fetching chevrons:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải danh sách chức vụ');
      return { results: [], total: 0 };
    }
  };

  // Delete chevron handler
  const handleDeleteChevron = (chevronId, chevronName) => {
    Alert.alert(
      '🗑️ Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa chức vụ "${chevronName}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await ChevronService.deleteChevron(chevronId);
              Alert.alert('✅ Thành công', 'Đã xóa chức vụ');
            } catch (error) {
              console.error('❌ [ChevronList] Delete failed:', error);
              Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xóa chức vụ');
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

  const getRandomColor = (index) => {
    const colors = ['#722ed1', '#fa8c16', '#1890ff', '#52c41a', '#eb2f96', '#13c2c2'];
    return colors[index % colors.length];
  };

  // Render chevron card
  const renderChevronCard = (item, index) => (
    <Card style={styles.card} mode="elevated" elevation={2}>
      <Card.Content style={styles.cardContent}>
        {/* ROW 1: ICON + INFO + ACTIONS */}
        <View style={styles.topRow}>
          {/* Chevron Icon */}
          <View style={styles.iconWrapper}>
            <Avatar.Icon
              size={56}
              icon="badge-account"
              style={{ backgroundColor: getRandomColor(index) }}
            />
          </View>

          {/* Chevron Info */}
          <View style={styles.infoSection}>
            <Text style={styles.chevronName} numberOfLines={1}>
              {item.name || 'N/A'}
            </Text>

            {/* Description */}
            {item.description && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="text" size={14} color="#8c8c8c" />
                <Text style={styles.infoText} numberOfLines={2}>
                  {item.description}
                </Text>
              </View>
            )}

            {/* Created Date */}
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="calendar" size={14} color="#722ed1" />
              <Text style={styles.infoText}>
                Tạo: {formatDate(item.createdAt)}
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
              <CheckPermission permissionKey="chevrons" requiredType="update">
                <TouchableOpacity
                  style={styles.menuItemRow}
                  onPress={() => {
                    console.log('🔀 [ChevronList] Edit pressed for', item.id);
                    setVisibleMenuId(null);
                    try {
                      navigation.navigate('ChevronForm', { mode: 'edit', chevronId: item.id });
                    } catch (e) {
                      console.error('Navigation error to ChevronForm:', e);
                      navigation.navigate('ChevronEdit', { chevronId: item.id });
                    }
                  }}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={18} color="#595959" style={styles.menuIcon} />
                  <Text style={styles.menuItemText}>Chỉnh sửa</Text>
                </TouchableOpacity>
              </CheckPermission>

              <CheckPermission permissionKey="chevrons" requiredType="delete">
                <>
                  <Divider />
                  <TouchableOpacity
                    style={styles.menuItemRow}
                    onPress={() => {
                      setVisibleMenuId(null);
                      handleDeleteChevron(item.id, item.name);
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

        {/* ROW 2: ADDITIONAL INFO */}
        {(item.level || item.salary_coefficient) && (
          <View style={styles.statsRow}>
            {item.level && (
              <Chip
                icon="chevron-triple-up"
                mode="outlined"
                style={styles.statChip}
                textStyle={styles.statChipText}
              >
                Cấp bậc: {item.level}
              </Chip>
            )}
            {item.salary_coefficient && (
              <Chip
                icon="currency-usd"
                mode="outlined"
                style={styles.statChip}
                textStyle={styles.statChipText}
              >
                Hệ số: {item.salary_coefficient}
              </Chip>
            )}
          </View>
        )}
      </Card.Content>
    </Card>
  );

  // Item press handler
  const handleItemPress = (item) => {
    navigation.navigate('ChevronEdit', { chevronId: item.id });
  };

  return (
    <View style={styles.container}>
      <CardListWithInfiniteScroll
        fetchData={fetchChevrons}
        renderCard={renderChevronCard}
        searchPlaceholder="Tìm theo tên chức vụ, mô tả..."
        onItemPress={handleItemPress}
        pageSize={10}
        emptyMessage="Không tìm thấy chức vụ nào"
        keyExtractor={(item) => item.id?.toString()}
      />

      {/* FAB - Add Chevron */}
      <CheckPermission permissionKey="chevrons" requiredType="create">
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => navigation.navigate('ChevronForm', { mode: 'create' })}
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
    marginRight: 12
  },
  infoSection: {
    flex: 1,
    justifyContent: 'center'
  },
  chevronName: {
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
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  statChip: {
    height: 28,
    backgroundColor: '#f5f5f5'
  },
  statChipText: {
    fontSize: 12,
    marginVertical: 0
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#722ed1'
  }
});

export default ChevronListScreen;
