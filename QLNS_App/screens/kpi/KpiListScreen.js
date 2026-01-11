import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import {
  Surface,
  Chip,
  Avatar,
  Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import JobService from '../../services/JobService';
import CardListWithInfiniteScroll from '../../components/CardListWithInfiniteScroll';

const gradeColors = {
  A: '#52c41a',
  B: '#73d13d',
  C: '#1890ff',
  D: '#faad14',
  E: '#ff7a45',
  F: '#ff4d4f',
};

const gradeLabels = {
  A: 'Xuất sắc',
  B: 'Tốt',
  C: 'Khá',
  D: 'Trung bình',
  E: 'Yếu',
  F: 'Kém',
};

const KpiListScreen = () => {
  const navigation = useNavigation();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Generate years (current year +/- 5 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  const months = [
    { value: 1, label: 'Tháng 1' }, { value: 2, label: 'Tháng 2' }, 
    { value: 3, label: 'Tháng 3' }, { value: 4, label: 'Tháng 4' },
    { value: 5, label: 'Tháng 5' }, { value: 6, label: 'Tháng 6' },
    { value: 7, label: 'Tháng 7' }, { value: 8, label: 'Tháng 8' },
    { value: 9, label: 'Tháng 9' }, { value: 10, label: 'Tháng 10' },
    { value: 11, label: 'Tháng 11' }, { value: 12, label: 'Tháng 12' },
  ];

  const fetchData = async (params = {}) => {
    try {
      const resp = await JobService.getAllUsersKpi({
        month: selectedMonth,
        year: selectedYear,
        ...params,
      });
      
      const payload = resp?.data ?? resp;
      let dataItems = [];
      
      if (payload?.success && payload?.data) {
        dataItems = Array.isArray(payload.data) ? payload.data : [payload.data];
      } else if (Array.isArray(payload)) {
        dataItems = payload;
      }

      const total = dataItems.length;

      return { results: dataItems, total };
    } catch (error) {
      const status = error?.response?.status;
      const serverMsg = error?.response?.data?.message || error?.response?.data?.error || error?.message;
      if (status === 403 || (serverMsg && serverMsg.toString().toLowerCase().includes('forbidden'))) {
        Alert.alert('Không có quyền', 'Bạn không có quyền truy cập phần quản lý KPI. Vui lòng liên hệ quản trị viên.');
      }
      throw error;
    }
  };

  const handleMonthChange = (month) => {
    setSelectedMonth(month);
    setShowMonthPicker(false);
    setRefreshKey(prev => prev + 1);
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
    setShowYearPicker(false);
    setRefreshKey(prev => prev + 1);
  };

  const handleViewDetail = (user) => {
    navigation.navigate('Chi tiết KPI', { 
      userId: user.user_id,
      userName: user.user_name,
      month: selectedMonth,
      year: selectedYear,
    });
  };

  const renderStatRow = (icon, label, value, color = '#666') => (
    <View style={styles.statRow}>
      <View style={styles.statLabel}>
        <MaterialCommunityIcons name={icon} size={16} color={color} />
        <Text style={[styles.statLabelText, { color }]}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );

  const renderCard = (item) => (
    <Surface style={styles.kpiCard} elevation={2}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <Avatar.Text 
            size={48} 
            label={item.user_name?.charAt(0)?.toUpperCase() || 'U'}
            style={{ backgroundColor: gradeColors[item.kpi_grade] || '#1890ff' }}
          />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{item.user_name}</Text>
            <Text style={styles.userId}>ID: {item.user_id}</Text>
          </View>
        </View>
        <View style={styles.gradeContainer}>
          <Chip
            style={[styles.gradeChip, { backgroundColor: gradeColors[item.kpi_grade] + '20' }]}
            textStyle={{ 
              color: gradeColors[item.kpi_grade], 
              fontSize: 20, 
              fontWeight: 'bold' 
            }}
          >
            {item.kpi_grade}
          </Chip>
          <Text style={[styles.gradeLabel, { color: gradeColors[item.kpi_grade] }]}>
            {gradeLabels[item.kpi_grade]}
          </Text>
        </View>
      </View>

      <Divider style={styles.divider} />

      <View style={styles.scoreSection}>
        <View style={styles.scoreCircle}>
          <Text style={styles.scoreValue}>{item.kpi_score}</Text>
          <Text style={styles.scoreLabel}>Điểm KPI</Text>
        </View>
      </View>

      <Divider style={styles.divider} />

      <View style={styles.statsSection}>
        {renderStatRow('clipboard-list', 'Tổng công việc', item.total_tasks, '#1890ff')}
        {renderStatRow('clock-check', 'Hoàn thành sớm', item.early_tasks, '#52c41a')}
        {renderStatRow('clock', 'Đúng hạn', item.on_time_tasks, '#faad14')}
        {renderStatRow('clock-alert', 'Trễ hạn', item.late_tasks, '#ff4d4f')}
        {item.avg_delay_days !== null && renderStatRow(
          'calendar-alert', 
          'Trung bình trễ', 
          `${item.avg_delay_days.toFixed(1)} ngày`, 
          '#ff7a45'
        )}
      </View>

      <TouchableOpacity 
        style={styles.detailButton} 
        onPress={() => handleViewDetail(item)}
      >
        <MaterialCommunityIcons name="chart-box" size={18} color="#1890ff" />
        <Text style={styles.detailButtonText}>Xem chi tiết theo dự án</Text>
      </TouchableOpacity>
    </Surface>
  );

  return (
    <View style={styles.container}>
      {/* Month/Year Filter Bar */}
      <View style={styles.filterBar}>
        <Text style={styles.filterLabel}>Chọn kỳ:</Text>
        <TouchableOpacity 
          style={styles.pickerButton}
          onPress={() => setShowMonthPicker(true)}
        >
          <MaterialCommunityIcons name="calendar-month" size={20} color="#1890ff" />
          <Text style={styles.pickerButtonText}>Tháng {selectedMonth}</Text>
          <MaterialCommunityIcons name="chevron-down" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.pickerButton}
          onPress={() => setShowYearPicker(true)}
        >
          <MaterialCommunityIcons name="calendar" size={20} color="#1890ff" />
          <Text style={styles.pickerButtonText}>{selectedYear}</Text>
          <MaterialCommunityIcons name="chevron-down" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <CardListWithInfiniteScroll
        key={refreshKey}
        fetchData={fetchData}
        renderCard={renderCard}
        pageSize={20}
        emptyMessage="Chưa có dữ liệu KPI"
        onItemPress={(item) => handleViewDetail(item)}
        hideSearch={true}
      />

      {/* Month Picker Modal */}
      <Modal
        visible={showMonthPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn tháng</Text>
              <TouchableOpacity onPress={() => setShowMonthPicker(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#262626" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerScroll}>
              {months.map(month => (
                <TouchableOpacity
                  key={month.value}
                  style={[
                    styles.pickerItem,
                    selectedMonth === month.value && styles.pickerItemActive
                  ]}
                  onPress={() => handleMonthChange(month.value)}
                >
                  <Text style={[
                    styles.pickerItemText,
                    selectedMonth === month.value && styles.pickerItemTextActive
                  ]}>
                    {month.label}
                  </Text>
                  {selectedMonth === month.value && (
                    <MaterialCommunityIcons name="check" size={20} color="#1890ff" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Year Picker Modal */}
      <Modal
        visible={showYearPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowYearPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn năm</Text>
              <TouchableOpacity onPress={() => setShowYearPicker(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#262626" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerScroll}>
              {years.map(year => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.pickerItem,
                    selectedYear === year && styles.pickerItemActive
                  ]}
                  onPress={() => handleYearChange(year)}
                >
                  <Text style={[
                    styles.pickerItemText,
                    selectedYear === year && styles.pickerItemTextActive
                  ]}>
                    Năm {year}
                  </Text>
                  {selectedYear === year && (
                    <MaterialCommunityIcons name="check" size={20} color="#1890ff" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  kpiCard: { 
    marginHorizontal: 16, 
    marginBottom: 12, 
    padding: 16, 
    borderRadius: 12, 
    backgroundColor: '#fff' 
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1,
  },
  userDetails: { marginLeft: 12, flex: 1 },
  userName: { fontSize: 16, fontWeight: '600', color: '#262626' },
  userId: { fontSize: 12, color: '#8c8c8c', marginTop: 2 },
  gradeContainer: { alignItems: 'center' },
  gradeChip: { 
    height: 44, 
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeLabel: { 
    fontSize: 11, 
    fontWeight: '600', 
    marginTop: 4 
  },
  divider: { marginVertical: 12 },
  scoreSection: { 
    alignItems: 'center', 
    paddingVertical: 8,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1890ff15',
    borderWidth: 3,
    borderColor: '#1890ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: '#1890ff' 
  },
  scoreLabel: { 
    fontSize: 12, 
    color: '#666', 
    marginTop: 4 
  },
  statsSection: { gap: 8 },
  statRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  statLabel: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  statLabelText: { fontSize: 14 },
  statValue: { 
    fontSize: 14, 
    fontWeight: '600' 
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#e6f7ff',
  },
  detailButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1890ff',
  },
});

export default KpiListScreen;
