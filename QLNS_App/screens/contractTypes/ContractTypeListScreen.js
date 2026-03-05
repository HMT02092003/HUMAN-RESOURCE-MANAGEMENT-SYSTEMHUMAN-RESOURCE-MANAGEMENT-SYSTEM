import React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
import { ContractTypeService } from '../../services/ContractTypeService';

const ContractTypeListScreen = ({ navigation }) => {
  const theme = useTheme();
  const [visibleMenuId, setVisibleMenuId] = React.useState(null);
  const listRef = React.useRef(null);

  // Refresh list when screen gains focus (e.g., after create/edit)
  useFocusEffect(
    React.useCallback(() => {
      if (listRef.current?.refresh) {
        listRef.current.refresh();
      }
    }, [])
  );

  // Fetch data function for CardList
  const fetchContractTypes = async (params) => {
    try {
      console.log('📜 [ContractTypeList] Fetching with params:', params);
      
      const response = await ContractTypeService.getAllContractTypes({
        page: params.page,
        limit: params.pageSize,
        search: params.search
      });

      return { 
        results: response.data || [], 
        total: response.pagination?.total || response.total || 0
      };
    } catch (error) {
      console.error(' [ContractTypeList] Error:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách loại hợp đồng');
      return { results: [], total: 0 };
    }
  };

  // Delete handler
  const handleDelete = (id, name) => {
    Alert.alert(
      '🗑️ Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa loại hợp đồng "${name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await ContractTypeService.deleteContractType(id);
              Alert.alert(' Thành công', 'Đã xóa loại hợp đồng');
              if (listRef.current?.refresh) listRef.current.refresh();
            } catch (error) {
              console.error(' Delete failed:', error);
              Alert.alert('Lỗi', 'Không thể xóa loại hợp đồng');
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

  const getContractTypeLabel = (type) => {
    const labels = {
      1: 'Thực tập',
      2: 'Thử việc',
      3: 'Có thời hạn',
      4: 'Không thời hạn',
      5: 'Đào tạo nghề',
      6: 'CTV',
      7: 'Khoán việc',
    };
    return labels[type] || 'Khác';
  };

  const getTypeColor = (type) => {
    const colors = {
      1: '#722ed1',
      2: '#fa8c16',
      3: '#1890ff',
      4: '#52c41a',
      5: '#13c2c2',
      6: '#eb2f96',
      7: '#f5222d',
    };
    return colors[type] || '#8c8c8c';
  };

  // Render card
  const renderCard = (item, index) => (
    <Card style={styles.card} mode="elevated" elevation={2}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.topRow}>
          {/* Icon */}
          <View style={styles.iconWrapper}>
            <Avatar.Icon
              size={56}
              icon="file-document-edit"
              style={{ backgroundColor: getTypeColor(item.type) }}
            />
          </View>

          {/* Info */}
          <View style={styles.infoSection}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name || 'N/A'}
            </Text>
            
            {/* Type */}
            <View style={styles.infoRow}>
              <MaterialCommunityIcons 
                name="tag" 
                size={14} 
                color={getTypeColor(item.type)} 
              />
              <Text style={styles.infoText}>
                {getContractTypeLabel(item.type)}
              </Text>
            </View>

            {/* Contract Term */}
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="clock-outline" size={14} color="#1890ff" />
              <Text style={styles.infoText}>
                {item.contractTerm ? `${item.contractTerm} tháng` : 'Vô thời hạn'}
              </Text>
            </View>

            {/* Insurance */}
            {item.insurance > 0 && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="shield-check" size={14} color="#52c41a" />
                <Text style={styles.infoText}>
                  BH: {item.insurance?.toLocaleString()} VND
                </Text>
              </View>
            )}
          </View>

          {/* Actions */}
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
                  console.log('🔀 [ContractTypeList] Edit pressed for', item.id);
                  setVisibleMenuId(null);
                  try {
                    navigation.navigate('ContractTypeForm', { mode: 'edit', contractTypeId: item.id });
                  } catch (e) {
                    console.error('Navigation error to ContractTypeForm:', e);
                    navigation.navigate('ContractTypeEdit', { contractTypeId: item.id });
                  }
                }}
              >
                <MaterialCommunityIcons name="pencil-outline" size={18} color="#595959" style={styles.menuIcon} />
                <Text style={styles.menuItemText}>Chỉnh sửa</Text>
              </TouchableOpacity>

              <Divider />

              <TouchableOpacity
                style={styles.menuItemRow}
                onPress={() => {
                  setVisibleMenuId(null);
                  handleDelete(item.id, item.name);
                }}
              >
                <MaterialCommunityIcons name="delete-outline" size={18} color="#ff4d4f" style={styles.menuIcon} />
                <Text style={[styles.menuItemText, { color: '#ff4d4f' }]}>Xóa</Text>
              </TouchableOpacity>
            </Menu>
          </View>
        </View>

        {/* Description */}
        {item.description && (
          <View style={styles.descriptionRow}>
            <Text style={styles.descriptionText} numberOfLines={2}>
              {item.description}
            </Text>
          </View>
        )}

        {/* Created Date */}
        {item.created_at && (
          <View style={styles.footerRow}>
            <MaterialCommunityIcons name="calendar" size={12} color="#8c8c8c" />
            <Text style={styles.footerText}>
              Tạo: {formatDate(item.created_at)}
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  const handleItemPress = (item) => {
    navigation.navigate('ContractTypeEdit', { contractTypeId: item.id });
  };

  return (
    <View style={styles.container}>
      <CardListWithInfiniteScroll
        ref={listRef}
        fetchData={fetchContractTypes}
        renderCard={renderCard}
        searchPlaceholder="Tìm loại hợp đồng..."
        onItemPress={handleItemPress}
        pageSize={10}
        emptyMessage="Không tìm thấy loại hợp đồng nào"
        keyExtractor={(item) => item.id?.toString()}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('ContractTypeForm', { mode: 'create' })}
        color="#fff"
      />
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
  name: {
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
  descriptionRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  descriptionText: {
    fontSize: 13,
    color: '#8c8c8c',
    lineHeight: 18
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  footerText: {
    fontSize: 12,
    color: '#8c8c8c',
    marginLeft: 6
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#1890ff'
  }
});

export default ContractTypeListScreen;
