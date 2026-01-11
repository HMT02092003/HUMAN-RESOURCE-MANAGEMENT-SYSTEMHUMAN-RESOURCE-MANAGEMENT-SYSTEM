import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Surface,
  Chip,
  Avatar,
  Divider,
  ActivityIndicator,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import JobService from '../../services/JobService';

const gradeColors = {
  'A': '#52c41a',
  'B': '#73d13d',
  'C': '#1890ff',
  'D': '#faad14',
  'E': '#fa8c16',
  'F': '#ff4d4f',
};

const gradeLabels = {
  'A': 'Xuất sắc',
  'B': 'Giỏi',
  'C': 'Khá',
  'D': 'Trung bình',
  'E': 'Yếu',
  'F': 'Kém',
};

const KpiDetailScreen = ({ route }) => {
  const { userId, userName, month, year } = route.params || {};
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState(null);

  const loadProjectKpi = async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      const response = await JobService.getUserProjectKpiDetails(userId, {
        month,
        year,
      });
      
      const data = response.data?.data || {};
      setProjects(data.projects || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error('[KpiDetail] Error loading:', error);
      Alert.alert('Lỗi', 'Không thể tải chi tiết KPI');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProjectKpi();
  }, [userId, month, year]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadProjectKpi();
  };

  const getGradeColor = (grade) => {
    return gradeColors[grade] || '#8c8c8c';
  };

  const renderSummaryCard = () => {
    if (!summary) return null;

    const gradeColor = getGradeColor(summary.kpi_grade);

    return (
      <Surface style={styles.summaryCard} elevation={2}>
        <View style={styles.summaryHeader}>
          <Avatar.Text 
            size={60} 
            label={userName?.charAt(0) || 'U'}
            style={{ backgroundColor: gradeColor }}
          />
          <View style={styles.summaryInfo}>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.period}>
              Tháng {month}/{year}
            </Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.summaryStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Điểm KPI</Text>
            <Text style={[styles.statValue, { color: gradeColor }]}>
              {summary.kpi_score?.toFixed(1)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Xếp loại</Text>
            <Chip 
              style={[styles.gradeChip, { backgroundColor: gradeColor }]}
              textStyle={styles.gradeChipText}
            >
              {summary.kpi_grade} - {gradeLabels[summary.kpi_grade]}
            </Chip>
          </View>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.taskStats}>
          <View style={styles.taskStatRow}>
            <MaterialCommunityIcons name="checkbox-multiple-marked" size={20} color="#1890ff" />
            <Text style={styles.taskStatLabel}>Tổng tasks:</Text>
            <Text style={styles.taskStatValue}>{summary.total_tasks}</Text>
          </View>
          <View style={styles.taskStatRow}>
            <MaterialCommunityIcons name="clock-check" size={20} color="#52c41a" />
            <Text style={styles.taskStatLabel}>Hoàn thành sớm:</Text>
            <Text style={[styles.taskStatValue, { color: '#52c41a' }]}>
              {summary.early_tasks}
            </Text>
          </View>
          <View style={styles.taskStatRow}>
            <MaterialCommunityIcons name="clock-outline" size={20} color="#1890ff" />
            <Text style={styles.taskStatLabel}>Đúng hạn:</Text>
            <Text style={[styles.taskStatValue, { color: '#1890ff' }]}>
              {summary.on_time_tasks}
            </Text>
          </View>
          <View style={styles.taskStatRow}>
            <MaterialCommunityIcons name="clock-alert" size={20} color="#ff4d4f" />
            <Text style={styles.taskStatLabel}>Trễ hạn:</Text>
            <Text style={[styles.taskStatValue, { color: '#ff4d4f' }]}>
              {summary.late_tasks}
            </Text>
          </View>
          {summary.avg_delay_days !== null && summary.avg_delay_days > 0 && (
            <View style={styles.taskStatRow}>
              <MaterialCommunityIcons name="calendar-alert" size={20} color="#fa8c16" />
              <Text style={styles.taskStatLabel}>Trung bình trễ:</Text>
              <Text style={[styles.taskStatValue, { color: '#fa8c16' }]}>
                {summary.avg_delay_days?.toFixed(1)} ngày
              </Text>
            </View>
          )}
        </View>
      </Surface>
    );
  };

  const renderProjectCard = (project) => {
    const gradeColor = getGradeColor(project.kpi_grade);

    return (
      <Surface key={project.project_id} style={styles.projectCard} elevation={1}>
        <View style={styles.projectHeader}>
          <View style={styles.projectTitleRow}>
            <MaterialCommunityIcons name="folder" size={24} color="#1890ff" />
            <Text style={styles.projectName} numberOfLines={2}>
              {project.project_name}
            </Text>
          </View>
          <Chip 
            style={[styles.projectGradeChip, { backgroundColor: gradeColor }]}
            textStyle={styles.projectGradeText}
          >
            {project.kpi_grade}
          </Chip>
        </View>

        <View style={styles.projectScore}>
          <Text style={styles.scoreLabel}>Điểm KPI:</Text>
          <Text style={[styles.scoreValue, { color: gradeColor }]}>
            {project.kpi_score?.toFixed(1)}
          </Text>
        </View>

        <Divider style={styles.projectDivider} />

        <View style={styles.projectStats}>
          <View style={styles.projectStatItem}>
            <MaterialCommunityIcons name="checkbox-multiple-marked" size={18} color="#595959" />
            <Text style={styles.projectStatLabel}>Tổng: {project.total_tasks}</Text>
          </View>
          <View style={styles.projectStatItem}>
            <MaterialCommunityIcons name="clock-check" size={18} color="#52c41a" />
            <Text style={styles.projectStatLabel}>Sớm: {project.early_tasks}</Text>
          </View>
          <View style={styles.projectStatItem}>
            <MaterialCommunityIcons name="clock-outline" size={18} color="#1890ff" />
            <Text style={styles.projectStatLabel}>Đúng: {project.on_time_tasks}</Text>
          </View>
          <View style={styles.projectStatItem}>
            <MaterialCommunityIcons name="clock-alert" size={18} color="#ff4d4f" />
            <Text style={styles.projectStatLabel}>Trễ: {project.late_tasks}</Text>
          </View>
        </View>

        {project.avg_delay_days !== null && project.avg_delay_days > 0 && (
          <View style={styles.delayInfo}>
            <MaterialCommunityIcons name="information" size={16} color="#fa8c16" />
            <Text style={styles.delayText}>
              Trung bình trễ: {project.avg_delay_days?.toFixed(1)} ngày
            </Text>
          </View>
        )}
      </Surface>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1890ff" />
        <Text style={styles.loadingText}>Đang tải dữ liệu KPI...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#1890ff']}
        />
      }
    >
      {renderSummaryCard()}

      <View style={styles.projectsSection}>
        <Text style={styles.sectionTitle}>
          Chi tiết theo dự án ({projects.length})
        </Text>
        {projects.length === 0 ? (
          <Surface style={styles.emptyCard} elevation={0}>
            <MaterialCommunityIcons name="folder-open" size={48} color="#d9d9d9" />
            <Text style={styles.emptyText}>Chưa có dữ liệu dự án</Text>
          </Surface>
        ) : (
          projects.map(renderProjectCard)
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8c8c8c',
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  summaryInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 4,
  },
  period: {
    fontSize: 14,
    color: '#8c8c8c',
  },
  divider: {
    marginVertical: 12,
    backgroundColor: '#f0f0f0',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#8c8c8c',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  gradeChip: {
    marginTop: 4,
  },
  gradeChipText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  taskStats: {
    gap: 8,
  },
  taskStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskStatLabel: {
    flex: 1,
    fontSize: 14,
    color: '#595959',
  },
  taskStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
  },
  projectsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 12,
  },
  projectCard: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  projectTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  projectName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#262626',
  },
  projectGradeChip: {
    minWidth: 40,
  },
  projectGradeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  projectScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#595959',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  projectDivider: {
    marginVertical: 10,
    backgroundColor: '#f0f0f0',
  },
  projectStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  projectStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: '45%',
  },
  projectStatLabel: {
    fontSize: 13,
    color: '#595959',
  },
  delayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    padding: 8,
    backgroundColor: '#fff7e6',
    borderRadius: 6,
  },
  delayText: {
    fontSize: 12,
    color: '#fa8c16',
    fontWeight: '500',
  },
  emptyCard: {
    padding: 40,
    borderRadius: 8,
    backgroundColor: '#fafafa',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8c8c8c',
  },
});

export default KpiDetailScreen;
