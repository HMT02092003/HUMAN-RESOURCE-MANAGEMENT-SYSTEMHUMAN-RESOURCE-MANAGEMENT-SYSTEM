import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Surface,
  TextInput,
  Button,
  ActivityIndicator,
  Avatar,
  Chip,
  Portal,
  Modal,
  Checkbox,
  Divider,
  HelperText,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import JobService from '../../services/JobService';
import UserService from '../../services/UserService';

const statusOptions = [
  { key: 'planning', label: 'Đang lên kế hoạch', color: '#1890ff' },
  { key: 'active', label: 'Đang thực hiện', color: '#52c41a' },
  { key: 'on_hold', label: 'Tạm dừng', color: '#faad14' },
  { key: 'completed', label: 'Hoàn thành', color: '#722ed1' },
  { key: 'cancelled', label: 'Đã hủy', color: '#ff4d4f' },
];

const ProjectFormScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { projectId, project: initialProject } = route.params || {};
  const isEditing = !!projectId;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('planning');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [budget, setBudget] = useState('');
  const [customer, setCustomer] = useState('');
  const [managerId, setManagerId] = useState(null);
  const [memberIds, setMemberIds] = useState([]);

  // UI state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);

  // Validation
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadUsers();
    if (isEditing) {
      loadProjectData();
    }
  }, [projectId]);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await UserService.getAllUsersForSelect({ scope: 'projects' });
      const list = Array.isArray(response) ? response : (response?.results || response?.data || []);
      const mapped = list.map((u) => ({
        id: u.id || u.user_id,
        name: u.fullName || u.full_name || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email,
        avatar: u.avatar || u.identificationPhoto || null,
        chevron: u.chevron?.name || u.position || '',
      }));
      setUsers(mapped);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadProjectData = async () => {
    setLoading(true);
    try {
      let projectData = initialProject;
      if (!projectData) {
        const response = await JobService.getProjectById(projectId);
        projectData = response?.data ?? response;
      }

      if (projectData) {
        setName(projectData.name || '');
        setDescription(projectData.description || '');
        setStatus(projectData.status || 'planning');
        setCustomer(projectData.customer || '');
        setBudget(projectData.budget ? String(projectData.budget) : '');

        if (projectData.startDate || projectData.start_date) {
          setStartDate(new Date(projectData.startDate || projectData.start_date));
        }
        if (projectData.endDate || projectData.end_date) {
          setEndDate(new Date(projectData.endDate || projectData.end_date));
        }

        const mgr = projectData.manager || projectData.manager_id;
        if (mgr) {
          setManagerId(typeof mgr === 'object' ? mgr.id : mgr);
        }

        if (Array.isArray(projectData.members)) {
          const ids = projectData.members.map((m) => {
            const raw = m.user_id ?? m;
            return typeof raw === 'object' ? raw.id : raw;
          });
          setMemberIds(ids);
        }
      }
    } catch (error) {
      console.error('Error loading project:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin dự án');
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Vui lòng nhập tên dự án';
    }

    if (startDate >= endDate) {
      newErrors.date = 'Ngày kết thúc phải sau ngày bắt đầu';
    }

    if (budget && isNaN(Number(budget))) {
      newErrors.budget = 'Ngân sách phải là số';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        status,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        budget: budget ? Number(budget) : null,
        customer: customer.trim() || null,
        manager_id: managerId,
        members: memberIds.map((id) => {
          const user = users.find((u) => u.id === id);
          return { user_id: id, role: user?.chevron || 'Member' };
        }),
      };

      if (!isEditing) {
        // Generate project_id for new projects
        payload.project_id = `PRJ${Date.now()}`;
      }

      if (isEditing) {
        await JobService.updateProject(projectId, payload);
        Alert.alert('Thành công', 'Đã cập nhật dự án');
      } else {
        await JobService.createProject(payload);
        Alert.alert('Thành công', 'Đã tạo dự án mới');
      }

      // Navigate về màn danh sách dự án thay vì goBack
      navigation.navigate('Dự án');
    } catch (error) {
      console.error('Error saving project:', error);
      Alert.alert('Lỗi', isEditing ? 'Không thể cập nhật dự án' : 'Không thể tạo dự án');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getInitials = (name) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const selectedManager = users.find((u) => u.id === managerId);
  const selectedMembers = users.filter((u) => memberIds.includes(u.id));
  const selectedStatus = statusOptions.find((s) => s.key === status);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1890ff" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Project Name */}
        <Surface style={styles.section} elevation={1}>
          <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
          
          <TextInput
            label="Tên dự án *"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
            error={!!errors.name}
          />
          {errors.name && <HelperText type="error">{errors.name}</HelperText>}

          <TextInput
            label="Mô tả"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
          />

          <TextInput
            label="Khách hàng"
            value={customer}
            onChangeText={setCustomer}
            mode="outlined"
            style={styles.input}
          />
        </Surface>

        {/* Status */}
        <Surface style={styles.section} elevation={1}>
          <Text style={styles.sectionTitle}>Trạng thái</Text>
          <TouchableOpacity onPress={() => setShowStatusModal(true)}>
            <View style={styles.selectorContainer}>
              <View style={styles.selectorContent}>
                <View style={[styles.statusDot, { backgroundColor: selectedStatus?.color || '#1890ff' }]} />
                <Text style={styles.selectorText}>
                  {selectedStatus?.label || 'Chọn trạng thái'}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-down" size={24} color="#8c8c8c" />
            </View>
          </TouchableOpacity>
        </Surface>

        {/* Dates */}
        <Surface style={styles.section} elevation={1}>
          <Text style={styles.sectionTitle}>Thời gian</Text>
          
          <View style={styles.dateRow}>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Ngày bắt đầu</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <MaterialCommunityIcons name="calendar" size={20} color="#1890ff" />
                <Text style={styles.dateText}>{formatDate(startDate)}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Ngày kết thúc</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <MaterialCommunityIcons name="calendar" size={20} color="#ff4d4f" />
                <Text style={styles.dateText}>{formatDate(endDate)}</Text>
              </TouchableOpacity>
            </View>
          </View>
          {errors.date && <HelperText type="error">{errors.date}</HelperText>}
        </Surface>

        {/* Budget */}
        <Surface style={styles.section} elevation={1}>
          <Text style={styles.sectionTitle}>Ngân sách</Text>
          <TextInput
            label="Ngân sách (VND)"
            value={budget}
            onChangeText={setBudget}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
            left={<TextInput.Icon icon="cash" />}
            error={!!errors.budget}
          />
          {errors.budget && <HelperText type="error">{errors.budget}</HelperText>}
        </Surface>

        {/* Manager */}
        <Surface style={styles.section} elevation={1}>
          <Text style={styles.sectionTitle}>Quản lý dự án</Text>
          <TouchableOpacity onPress={() => setShowManagerModal(true)}>
            <View style={styles.selectorContainer}>
              {selectedManager ? (
                <View style={styles.selectorContent}>
                  <Avatar.Text 
                    size={32} 
                    label={getInitials(selectedManager.name)}
                    style={styles.selectorAvatar}
                  />
                  <View style={styles.selectorInfo}>
                    <Text style={styles.selectorText}>{selectedManager.name}</Text>
                    {selectedManager.chevron && (
                      <Text style={styles.selectorSubtext}>{selectedManager.chevron}</Text>
                    )}
                  </View>
                </View>
              ) : (
                <Text style={styles.selectorPlaceholder}>Chọn quản lý</Text>
              )}
              <MaterialCommunityIcons name="chevron-down" size={24} color="#8c8c8c" />
            </View>
          </TouchableOpacity>
        </Surface>

        {/* Members */}
        <Surface style={styles.section} elevation={1}>
          <Text style={styles.sectionTitle}>Thành viên ({selectedMembers.length})</Text>
          <TouchableOpacity onPress={() => setShowMembersModal(true)}>
            <View style={styles.selectorContainer}>
              {selectedMembers.length > 0 ? (
                <View style={styles.membersPreview}>
                  <View style={styles.avatarGroup}>
                    {selectedMembers.slice(0, 4).map((m, index) => (
                      <Avatar.Text 
                        key={m.id}
                        size={28} 
                        label={getInitials(m.name)}
                        style={[styles.memberAvatar, { marginLeft: index > 0 ? -10 : 0 }]}
                      />
                    ))}
                    {selectedMembers.length > 4 && (
                      <View style={[styles.memberAvatar, styles.moreMembers, { marginLeft: -10 }]}>
                        <Text style={styles.moreMembersText}>+{selectedMembers.length - 4}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ) : (
                <Text style={styles.selectorPlaceholder}>Chọn thành viên</Text>
              )}
              <MaterialCommunityIcons name="chevron-down" size={24} color="#8c8c8c" />
            </View>
          </TouchableOpacity>
        </Surface>

        {/* Submit Button */}
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
          style={styles.submitButton}
          contentStyle={styles.submitButtonContent}
        >
          {isEditing ? 'Cập nhật dự án' : 'Tạo dự án'}
        </Button>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowStartDatePicker(false);
            if (date) setStartDate(date);
          }}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowEndDatePicker(false);
            if (date) setEndDate(date);
          }}
        />
      )}

      {/* Status Modal */}
      <Portal>
        <Modal
          visible={showStatusModal}
          onDismiss={() => setShowStatusModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>Chọn trạng thái</Text>
          <Divider style={{ marginBottom: 12 }} />
          {statusOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={styles.modalOption}
              onPress={() => {
                setStatus(option.key);
                setShowStatusModal(false);
              }}
            >
              <View style={styles.modalOptionLeft}>
                <View style={[styles.statusDot, { backgroundColor: option.color }]} />
                <Text style={styles.modalOptionText}>{option.label}</Text>
              </View>
              {status === option.key && (
                <MaterialCommunityIcons name="check" size={20} color="#1890ff" />
              )}
            </TouchableOpacity>
          ))}
        </Modal>
      </Portal>

      {/* Manager Modal */}
      <Portal>
        <Modal
          visible={showManagerModal}
          onDismiss={() => setShowManagerModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>Chọn quản lý</Text>
          <Divider style={{ marginBottom: 12 }} />
          <ScrollView style={{ maxHeight: 400 }}>
            {usersLoading ? (
              <ActivityIndicator size="small" color="#1890ff" />
            ) : (
              users.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={styles.modalOption}
                  onPress={() => {
                    setManagerId(user.id);
                    setShowManagerModal(false);
                  }}
                >
                  <View style={styles.modalOptionLeft}>
                    <Avatar.Text 
                      size={36} 
                      label={getInitials(user.name)}
                      style={styles.modalAvatar}
                    />
                    <View style={styles.modalUserInfo}>
                      <Text style={styles.modalOptionText}>{user.name}</Text>
                      {user.chevron && (
                        <Text style={styles.modalOptionSubtext}>{user.chevron}</Text>
                      )}
                    </View>
                  </View>
                  {managerId === user.id && (
                    <MaterialCommunityIcons name="check" size={20} color="#1890ff" />
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </Modal>
      </Portal>

      {/* Members Modal */}
      <Portal>
        <Modal
          visible={showMembersModal}
          onDismiss={() => setShowMembersModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>Chọn thành viên ({memberIds.length})</Text>
          <Divider style={{ marginBottom: 12 }} />
          <ScrollView style={{ maxHeight: 400 }}>
            {usersLoading ? (
              <ActivityIndicator size="small" color="#1890ff" />
            ) : (
              users.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={styles.modalOption}
                  onPress={() => {
                    setMemberIds((prev) => {
                      if (prev.includes(user.id)) {
                        return prev.filter((id) => id !== user.id);
                      }
                      return [...prev, user.id];
                    });
                  }}
                >
                  <View style={styles.modalOptionLeft}>
                    <Checkbox
                      status={memberIds.includes(user.id) ? 'checked' : 'unchecked'}
                      color="#1890ff"
                    />
                    <Avatar.Text 
                      size={36} 
                      label={getInitials(user.name)}
                      style={styles.modalAvatar}
                    />
                    <View style={styles.modalUserInfo}>
                      <Text style={styles.modalOptionText}>{user.name}</Text>
                      {user.chevron && (
                        <Text style={styles.modalOptionSubtext}>{user.chevron}</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
          <Button
            mode="contained"
            onPress={() => setShowMembersModal(false)}
            style={{ marginTop: 12 }}
          >
            Xong ({memberIds.length} thành viên)
          </Button>
        </Modal>
      </Portal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 12,
    color: '#8c8c8c',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 12,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  selectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f5f7fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectorAvatar: {
    backgroundColor: '#1890ff',
    marginRight: 10,
  },
  selectorInfo: {
    flex: 1,
  },
  selectorText: {
    fontSize: 14,
    color: '#262626',
  },
  selectorSubtext: {
    fontSize: 12,
    color: '#8c8c8c',
    marginTop: 2,
  },
  selectorPlaceholder: {
    fontSize: 14,
    color: '#8c8c8c',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 13,
    color: '#8c8c8c',
    marginBottom: 6,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f5f7fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#262626',
  },
  membersPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    backgroundColor: '#1890ff',
    borderWidth: 2,
    borderColor: '#fff',
  },
  moreMembers: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreMembersText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
  },
  submitButton: {
    marginTop: 8,
    backgroundColor: '#1890ff',
    borderRadius: 8,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  modalContainer: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 12,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalOptionText: {
    fontSize: 14,
    color: '#262626',
  },
  modalOptionSubtext: {
    fontSize: 12,
    color: '#8c8c8c',
  },
  modalAvatar: {
    backgroundColor: '#1890ff',
    marginRight: 10,
  },
  modalUserInfo: {
    flex: 1,
  },
});

export default ProjectFormScreen;
