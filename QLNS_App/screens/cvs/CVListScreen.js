import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import {
  Surface,
  FAB,
  Chip,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import JobService from '../../services/JobService';
import CardListWithInfiniteScroll from '../../components/CardListWithInfiniteScroll';
import apiConfig from '../../services/apiConfig';

// Job Service URL for file download
const getJobServiceBase = () => {
  // Lấy base URL từ api config (chứa url thật hoặc ngrok), loại bỏ '/api' ở đuôi
  const baseUrl = apiConfig.getApiBaseUrl().replace(/\/api\/?$/, '');
  return baseUrl;
};

const CVListScreen = () => {
  const navigation = useNavigation();

  const fetchData = async (params = {}) => {
    try {
      const resp = await JobService.fetchCvs(params);
      const payload = resp?.data ?? resp;
      let dataItems = [];
      if (Array.isArray(payload)) dataItems = payload;
      else if (payload?.data) dataItems = Array.isArray(payload.data) ? payload.data : [payload.data];
      else if (payload?.results) dataItems = payload.results;

      const total = payload?.total ?? payload?.pagination?.total ?? dataItems.length;

      const mapped = (dataItems || []).map((cv) => {
        const cvUser = cv.user || cv.userInfo || null;
        return {
          ...cv,
          id: cv.cv_id || cv.id,
          fullName: cvUser
            ? (cvUser.fullName || [cvUser.firstName, cvUser.lastName].filter(Boolean).join(' ') || cvUser.username || cvUser.email)
            : `User ${cv.user_id}`,
          userEmail: cvUser?.email || '',
          fileName: cv.file_path ? cv.file_path.split('/').pop() : 'CV',
        };
      });

      return { results: mapped, total };
    } catch (error) {
      const status = error?.response?.status;
      const serverMsg = error?.response?.data?.message || error?.response?.data?.error || error?.message;
      if (status === 403 || (serverMsg && serverMsg.toString().toLowerCase().includes('forbidden'))) {
        Alert.alert('Không có quyền', 'Bạn không có quyền truy cập phần quản lý CV. Vui lòng liên hệ quản trị viên.');
      }
      throw error;
    }
  };

  const handleCreate = () => navigation.navigate('Tạo CV');

  const handleDelete = async (cv) => {
    try {
      await JobService.deleteCv(cv.id);
      Alert.alert('Thành công', 'Đã xóa CV');
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể xóa CV');
      throw err;
    }
  };

  const handleView = (cv) => {
    if (!cv.file_path) {
      Alert.alert('Lỗi', 'Không tìm thấy file CV');
      return;
    }
    const normalized = cv.file_path.replace(/\\/g, '/').replace(/^\/+/, '');
    const url = `${getJobServiceBase()}/${normalized}`;
    Linking.openURL(url).catch((err) => {
      console.error('Error opening CV:', err);
      Alert.alert('Lỗi', 'Không thể mở file CV');
    });
  };

  const renderCard = (item) => (
    <Surface style={styles.cvCard} elevation={2}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <MaterialCommunityIcons name="account-circle" size={40} color="#1890ff" />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{item.fullName}</Text>
            {item.userEmail && <Text style={styles.userEmail} numberOfLines={1}>{item.userEmail}</Text>}
          </View>
        </View>
        <Chip icon="file-document" style={styles.fileChip} textStyle={{ fontSize: 11 }}>CV</Chip>
      </View>

      <View style={styles.fileInfo}>
        <View style={styles.fileDetail}>
          <MaterialCommunityIcons name="file-pdf-box" size={18} color="#ff4d4f" />
          <Text style={styles.fileName} numberOfLines={1}>{item.fileName}</Text>
        </View>
        {item.uploaded_at && (
          <View style={styles.dateInfo}>
            <MaterialCommunityIcons name="calendar" size={14} color="#8c8c8c" />
            <Text style={styles.dateText}>{new Date(item.uploaded_at).toLocaleDateString('vi-VN')}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleView(item)}>
          <MaterialCommunityIcons name="eye-outline" size={18} color="#1890ff" />
          <Text style={[styles.actionText, { color: '#1890ff' }]}>Xem</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(item)}>
          <MaterialCommunityIcons name="delete" size={18} color="#ff4d4f" />
          <Text style={[styles.actionText, { color: '#ff4d4f' }]}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </Surface>
  );

  return (
    <View style={styles.container}>
      <CardListWithInfiniteScroll
        fetchData={fetchData}
        renderCard={renderCard}
        searchPlaceholder="Tìm kiếm CV theo tên, email..."
        onItemPress={(item) => handleView(item)}
        pageSize={20}
        emptyMessage="Chưa có CV nào"
      />

      <FAB icon="plus" style={styles.fab} onPress={handleCreate} color="#fff" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  cvCard: { marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 12, backgroundColor: '#fff' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  userDetails: { marginLeft: 12, flex: 1 },
  userName: { fontSize: 16, fontWeight: '600', color: '#262626', marginBottom: 2 },
  userEmail: { fontSize: 13, color: '#8c8c8c' },
  fileChip: { height: 28, backgroundColor: '#e6f7ff' },
  fileInfo: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  fileDetail: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  fileName: { fontSize: 14, color: '#666', marginLeft: 8, flex: 1 },
  dateInfo: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: 12, color: '#8c8c8c', marginLeft: 4 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16 },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 13, fontWeight: '500' },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: '#1890ff' },
});

export default CVListScreen;
