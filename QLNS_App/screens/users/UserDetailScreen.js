import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  TouchableOpacity,
  Linking,
} from 'react-native';
import {
  Surface,
  Text,
  Card,
  Avatar,
  Chip,
  Divider,
  useTheme,
  ActivityIndicator,
  IconButton,
  List,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import UserService from '../../services/UserService';
import SalaryService from '../../services/SalaryService';

const UserDetailScreen = ({ route, navigation }) => {
  const { userId } = route.params;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info'); // 'info' or 'contract'
  const [contractSalaries, setContractSalaries] = useState({});
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadUserDetail();
  }, [userId]);

  const loadUserDetail = async () => {
    try {
      setLoading(true);
      // Convert userId to number if it's a string
      const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
      console.log('📥 [UserDetail] Loading user detail with ID:', numericUserId, 'Type:', typeof numericUserId);

      const response = await UserService.getUserDetail(numericUserId);
      setUser(response);
      console.log('✅ [UserDetail] Loaded:', response);

      // Fetch salaries for contracts if present
      if (response && response.contracts && response.contracts.length > 0) {
        fetchContractSalaries(response.contracts);
      }
    } catch (error) {
      console.error('❌ [UserDetail] Error loading:', error);
      Alert.alert(
        'Lỗi',
        error.response?.data?.message || 'Không thể tải thông tin người dùng',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchContractSalaries = async (contracts) => {
    try {
      const salaryMap = {};
      for (const contract of contracts) {
        if (contract.id) {
          const profile = await SalaryService.getEmployeeSalaryProfile(contract.userId);
          if (profile && profile.salary) {
            salaryMap[contract.id] = profile.salary;
          }
        }
      }
      setContractSalaries(salaryMap);
    } catch (err) {
      console.log('Error fetching contract salaries:', err);
    }
  };

  const getStatusColor = (status) => {
    if (status === '1' || status === 'active') return '#52c41a';
    return '#ff4d4f';
  };

  const getStatusText = (status) => {
    if (status === '1' || status === 'active') return 'Hoạt động';
    return 'Ngưng hoạt động';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Không xác định';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  const getGenderText = (gender) => {
    return gender === 1 ? 'Nam' : gender === 2 ? 'Nữ' : 'Khác';
  };

  const getRelationshipText = (relationship) => {
    const map = {
      'father': 'Cha',
      'mother': 'Mẹ',
      'spouse': 'Vợ/Chồng',
      'child': 'Con',
      'sibling': 'Anh/Chị/Em',
      'other': 'Khác',
    };
    return map[relationship] || relationship;
  };

  if (loading) {
    return (
      <Surface style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Đang tải thông tin...</Text>
        </View>
      </Surface>
    );
  }

  if (!user) {
    return (
      <Surface style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="account-off" size={80} color="#d9d9d9" />
          <Text style={styles.emptyText}>Không tìm thấy thông tin</Text>
        </View>
      </Surface>
    );
  }

  // Parse family members safely
  let familyMembers = [];
  if (user && user.profileFamily) {
    if (typeof user.profileFamily === 'string') {
      try {
        familyMembers = JSON.parse(user.profileFamily);
      } catch (e) { console.error('Error parsing family:', e); }
    } else {
      familyMembers = user.profileFamily;
    }
  }

  const renderInfoTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Avatar & Basic Info */}
      <Card style={styles.card}>
        <Card.Content style={styles.headerSection}>
          <View style={styles.avatarContainer}>
            {user.identificationPhoto ? (
              <Image
                source={{
                  uri: user.identificationPhoto.startsWith('/')
                    ? `${process.env.EXPO_PUBLIC_API_GATEWAY_URL}${user.identificationPhoto}`
                    : user.identificationPhoto,
                }}
                style={styles.avatarImage}
              />
            ) : (
              <Avatar.Text
                size={100}
                label={user.fullName?.substring(0, 2).toUpperCase() || 'NA'}
                style={{ backgroundColor: '#1890ff' }}
              />
            )}
            <Chip
              icon="check-circle"
              style={[styles.statusChip, { backgroundColor: getStatusColor(user.status) }]}
              textStyle={{ color: '#fff', fontWeight: '600' }}
            >
              {getStatusText(user.status)}
            </Chip>
          </View>
          <Text style={styles.fullName}>{user.fullName}</Text>
          <Text style={styles.username}>@{user.username}</Text>
        </Card.Content>
      </Card>

      {/* Contact Information */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>
          <Divider style={styles.divider} />

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="email" size={20} color="#1890ff" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${user.email}`)}>
              <MaterialCommunityIcons name="open-in-new" size={20} color="#1890ff" />
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="phone" size={20} color="#52c41a" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Số điện thoại</Text>
              <Text style={styles.infoValue}>{user.phone || 'N/A'}</Text>
            </View>
            {user.phone && (
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${user.phone}`)}>
                <MaterialCommunityIcons name="phone-dial" size={20} color="#52c41a" />
              </TouchableOpacity>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* Personal Information */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          <Divider style={styles.divider} />

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="calendar" size={20} color="#fa8c16" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Ngày sinh</Text>
              <Text style={styles.infoValue}>{formatDate(user.birthday)}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name={user.gender === 1 ? 'gender-male' : 'gender-female'}
              size={20}
              color={user.gender === 1 ? '#1890ff' : '#eb2f96'}
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Giới tính</Text>
              <Text style={styles.infoValue}>{getGenderText(user.gender)}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="calendar-start" size={20} color="#722ed1" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Ngày bắt đầu làm việc</Text>
              <Text style={styles.infoValue}>{formatDate(user.startDate)}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Work Information */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Thông tin công việc</Text>
          <Divider style={styles.divider} />

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="shield-account" size={20} color="#722ed1" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Vai trò</Text>
              <Text style={styles.infoValue}>{user.role?.name || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="office-building" size={20} color="#52c41a" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phòng ban</Text>
              <Text style={styles.infoValue}>{user.department?.name || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="badge-account" size={20} color="#fa8c16" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Chức vụ</Text>
              <Text style={styles.infoValue}>{user.chevron?.name || 'N/A'}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Family Information */}
      {familyMembers && familyMembers.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Thông tin gia đình</Text>
            <Divider style={styles.divider} />
            {familyMembers.map((member, index) => (
              <View key={index} style={styles.familyMember}>
                <View style={styles.familyHeader}>
                  <MaterialCommunityIcons name="account-circle" size={24} color="#1890ff" />
                  <Text style={styles.familyName}>{member.name || member.fullName || `Người thân ${index + 1}`}</Text>
                </View>
                <View style={styles.familyDetails}>
                  <Text style={styles.familyInfo}>
                    Quan hệ: <Text style={styles.familyValue}>{getRelationshipText(member.relationship)}</Text>
                  </Text>
                  <Text style={styles.familyInfo}>
                    Ngày sinh: <Text style={styles.familyValue}>{formatDate(member.birthday)}</Text>
                  </Text>
                </View>
                {index < familyMembers.length - 1 && <Divider style={styles.familyDivider} />}
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );

  const renderContractTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Action buttons */}
      <View style={styles.contractActionRow}>
        <TouchableOpacity
          style={styles.contractActionBtn}
          onPress={() => navigation.navigate('CreateContract', { userId })}
        >
          <MaterialCommunityIcons name="file-plus" size={18} color="#1890ff" />
          <Text style={styles.contractActionBtnText}>Tạo hợp đồng</Text>
        </TouchableOpacity>
      </View>

      {user.contracts && user.contracts.length > 0 ? (
        user.contracts.map((contract, index) => (
          <Card key={index} style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Hợp đồng #{index + 1}</Text>
              <Divider style={styles.divider} />

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="file-document" size={20} color="#1890ff" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Loại hợp đồng</Text>
                  <Text style={styles.infoValue}>{contract.contractType?.name || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar-start" size={20} color="#52c41a" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Ngày bắt đầu</Text>
                  <Text style={styles.infoValue}>{formatDate(contract.startDate)}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar-end" size={20} color="#ff4d4f" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Ngày kết thúc</Text>
                  <Text style={styles.infoValue}>{formatDate(contract.endDate)}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar-check" size={20} color="#fa8c16" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Ngày hiệu lực</Text>
                  <Text style={styles.infoValue}>{formatDate(contract.activeDay)}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="cash" size={20} color="#52c41a" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Lương cơ bản</Text>
                  <Text style={styles.infoValue}>
                    {contractSalaries[contract.id] ? `${contractSalaries[contract.id].toLocaleString('vi-VN')} VNĐ` : (contract.salary ? `${contract.salary.toLocaleString('vi-VN')} VNĐ` : 'Chưa có thông tin')}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        ))
      ) : (
        <Card style={styles.card}>
          <Card.Content style={styles.emptyCardContent}>
            <MaterialCommunityIcons name="file-document-outline" size={60} color="#d9d9d9" />
            <Text style={styles.emptyCardText}>Chưa có hợp đồng nào</Text>
          </Card.Content>
        </Card>
      )}
      <View style={{ height: 24 }} />
    </ScrollView>
  );

  return (
    <Surface style={styles.container}>
      <StatusBar style="dark" />

      {/* Header with back button */}
      <View style={[styles.header, { paddingTop: Math.max(insets?.top || 0, 24) + 8 }]}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>Chi tiết người dùng</Text>
        <IconButton
          icon="pencil"
          size={24}
          onPress={() => navigation.navigate('UserForm', { userId, mode: 'edit' })}
        />
      </View>

      {/* Tab Selector */}
      <View style={styles.tabSelector}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'info' && styles.activeTab]}
          onPress={() => setActiveTab('info')}
        >
          <MaterialCommunityIcons
            name="account"
            size={20}
            color={activeTab === 'info' ? '#1890ff' : '#8c8c8c'}
          />
          <Text style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}>
            Thông tin cá nhân
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'contract' && styles.activeTab]}
          onPress={() => setActiveTab('contract')}
        >
          <MaterialCommunityIcons
            name="file-document"
            size={20}
            color={activeTab === 'contract' ? '#1890ff' : '#8c8c8c'}
          />
          <Text style={[styles.tabText, activeTab === 'contract' && styles.activeTabText]}>
            Hợp đồng
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'info' ? renderInfoTab() : renderContractTab()}
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#1890ff',
  },
  tabText: {
    fontSize: 14,
    color: '#8c8c8c',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#1890ff',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  headerSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  statusChip: {
    position: 'absolute',
    bottom: 0,
    right: -8,
  },
  fullName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#262626',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    color: '#8c8c8c',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#8c8c8c',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#262626',
    fontWeight: '500',
  },
  familyMember: {
    marginBottom: 16,
  },
  familyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  familyName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#262626',
  },
  familyDetails: {
    paddingLeft: 32,
    gap: 4,
  },
  familyInfo: {
    fontSize: 13,
    color: '#595959',
  },
  familyValue: {
    fontWeight: '500',
    color: '#262626',
  },
  familyDivider: {
    marginTop: 16,
    backgroundColor: '#f0f0f0',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#8c8c8c',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#8c8c8c',
    fontWeight: '500',
  },
  emptyCardContent: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  emptyCardText: {
    fontSize: 14,
    color: '#8c8c8c',
  },
  contractActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  contractActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#e6f4ff',
    borderWidth: 1,
    borderColor: '#91caff',
  },
  salaryActionBtn: {
    backgroundColor: '#f6ffed',
    borderColor: '#b7eb8f',
  },
  contractActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1890ff',
  },
});

export default UserDetailScreen;
