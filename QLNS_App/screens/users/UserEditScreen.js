import React, { useEffect, useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { ActivityIndicator, Surface, Text } from 'react-native-paper';
import UserFormComponent from '../../components/UserFormComponent';
import RoleService from '../../services/RoleService';
import DepartmentService from '../../services/DepartmentService';
import { ChevronService } from '../../services/ChevronService';
import { ContractTypeService } from '../../services/ContractTypeService';
import UserService from '../../services/UserService';

const UserEditScreen = ({ route, navigation }) => {
  const { userId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [chevrons, setChevrons] = useState([]);
  const [contractTypes, setContractTypes] = useState([]);
  const [initialValues, setInitialValues] = useState({});

  useEffect(() => {
    if (!userId) {
      Alert.alert('Lỗi', 'Thiếu userId');
      navigation.goBack();
      return;
    }
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('📋 [UserEditScreen] Loading data for userId:', userId);
      
      // Load tất cả data song song với Promise.allSettled
      const results = await Promise.allSettled([
        RoleService.getAllRoles(),
        DepartmentService.getAllDepartments(),
        ChevronService.getAllChevrons(),
        ContractTypeService.getAllContractTypes(),
        UserService.getUserDetail(userId),
      ]);
      
      // Xử lý kết quả
      if (results[0].status === 'fulfilled') {
        setRoles(results[0].value || []);
        console.log('✅ [UserEditScreen] Roles loaded:', results[0].value?.length || 0);
      } else {
        console.error('❌ [UserEditScreen] Roles failed:', results[0].reason);
      }
      
      if (results[1].status === 'fulfilled') {
        setDepartments(results[1].value || []);
        console.log('✅ [UserEditScreen] Departments loaded:', results[1].value?.length || 0);
      } else {
        console.error('❌ [UserEditScreen] Departments failed:', results[1].reason);
      }
      
      if (results[2].status === 'fulfilled') {
        setChevrons(results[2].value || []);
        console.log('✅ [UserEditScreen] Chevrons loaded:', results[2].value?.length || 0);
      } else {
        console.error('❌ [UserEditScreen] Chevrons failed:', results[2].reason);
      }
      
      if (results[3].status === 'fulfilled') {
        setContractTypes(results[3].value || []);
        console.log('✅ [UserEditScreen] ContractTypes loaded:', results[3].value?.length || 0);
      } else {
        console.error('❌ [UserEditScreen] ContractTypes failed:', results[3].reason);
        setContractTypes([]);
      }
      
      if (results[4].status === 'fulfilled') {
        setInitialValues(results[4].value || {});
        console.log('✅ [UserEditScreen] User loaded:', results[4].value?.username);
      } else {
        console.error('❌ [UserEditScreen] User failed:', results[4].reason);
        Alert.alert('Lỗi', 'Không thể tải dữ liệu người dùng');
      }
      
    } catch (err) {
      console.error('❌ [UserEditScreen] load data error', err);
      Alert.alert('Lỗi', 'Không thể tải dữ liệu người dùng');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (payload, photo) => {
    try {
      await UserService.updateUser(userId, payload);
      navigation.goBack();
    } catch (err) {
      console.error('update user error', err);
      Alert.alert('Lỗi', err.response?.data?.message || err.message || 'Cập nhật thất bại');
      throw err;
    }
  };

  return (
    <Surface style={{ flex: 1 }}>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" />
          <Text>Đang tải dữ liệu...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 12 }}>
          <UserFormComponent
            initialValues={initialValues}
            isEdit={true}
            roles={roles}
            departments={departments}
            chevrons={chevrons}
            contractTypes={contractTypes}
            onSubmit={handleSubmit}
            onCancel={() => navigation.goBack()}
          />
        </ScrollView>
      )}
    </Surface>
  );
};

export default UserEditScreen;
