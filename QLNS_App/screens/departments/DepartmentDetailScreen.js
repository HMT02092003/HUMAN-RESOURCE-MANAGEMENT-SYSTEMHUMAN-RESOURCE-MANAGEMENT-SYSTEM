import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DepartmentService } from '../../services/DepartmentService';
import dayjs from 'dayjs';

const DepartmentDetailScreen = ({ route, navigation }) => {
  const { departmentId } = route.params;
  const [loading, setLoading] = useState(true);
  const [department, setDepartment] = useState(null);

  useEffect(() => {
    fetchDepartmentDetail();
  }, [departmentId]);

  const fetchDepartmentDetail = async () => {
    try {
      setLoading(true);
      const data = await DepartmentService.getDepartmentDetail(departmentId.toString());
      setDepartment(data);
    } catch (error) {
      console.error('Failed to fetch department:', error);
      const errorCode = error.response?.data?.code || 'Unknown error';
      Alert.alert('Lỗi', `Lỗi: ${errorCode}`, [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return dayjs(date).format('DD/MM/YYYY');
  };

  const handleEdit = () => {
    navigation.navigate('DepartmentEdit', { departmentId });
  };

  const handleDelete = () => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa phòng ban "${department.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
                onPress: async () => {
            try {
              setLoading(true);
              await DepartmentService.deleteDepartment(departmentId.toString());
              Alert.alert('Thành công', 'Xóa phòng ban thành công', [
                {
                  text: 'OK',
                  // navigate explicitly to the department list drawer route
                  onPress: () => navigation.navigate('Quản lý phòng ban'),
                },
              ]);
            } catch (error) {
              console.error('Error deleting department:', error);
              Alert.alert('Lỗi', 'Không thể xóa phòng ban');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1890ff" />
      </View>
    );
  }

  if (!department) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Không tìm thấy thông tin phòng ban</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Department Info Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="business" size={24} color="#1890ff" />
              <Text style={styles.cardTitle}>Thông tin phòng ban</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Tên phòng ban:</Text>
              <Text style={styles.value}>{department.name}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Mô tả:</Text>
              <Text style={styles.value}>
                {department.description || 'Không có mô tả'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Ngày tạo:</Text>
              <Text style={styles.value}>{formatDate(department.created_at)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color="#666" />
          <Text style={styles.backButtonText}>Trở về</Text>
        </TouchableOpacity>

        <View style={styles.rightButtons}>
          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <Ionicons name="create" size={20} color="#fff" />
            <Text style={styles.editButtonText}>Sửa</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Ionicons name="trash" size={20} color="#fff" />
            <Text style={styles.deleteButtonText}>Xóa</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
    marginLeft: 8,
  },
  infoRow: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#8c8c8c',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#262626',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: '#999',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    backgroundColor: '#fff',
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
  },
  rightButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
    backgroundColor: '#1890ff',
    marginRight: 8,
  },
  editButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
    backgroundColor: '#ff4d4f',
  },
  deleteButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default DepartmentDetailScreen;
