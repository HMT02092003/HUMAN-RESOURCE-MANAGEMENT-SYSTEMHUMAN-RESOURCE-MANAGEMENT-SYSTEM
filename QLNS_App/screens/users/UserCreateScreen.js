import React, { useEffect, useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { ActivityIndicator, Surface, Text } from 'react-native-paper';
import UserFormComponent from '../../components/UserFormComponent';
import RoleService from '../../services/RoleService';
import DepartmentService from '../../services/DepartmentService';
import { ChevronService } from '../../services/ChevronService';
import { ContractTypeService } from '../../services/ContractTypeService';
import UserService from '../../services/UserService';

const UserCreateScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [chevrons, setChevrons] = useState([]);
  const [contractTypes, setContractTypes] = useState([]);

  const toArray = (resp) => {
    if (!resp) return [];
    if (Array.isArray(resp)) return resp;
    if (Array.isArray(resp.data)) return resp.data;
    if (Array.isArray(resp.results)) return resp.results;
    if (resp.data && Array.isArray(resp.data?.data)) return resp.data.data;
    return [];
  };

  useEffect(() => {
    loadDropdowns();
  }, []);

  const loadDropdowns = async () => {
    try {
      setLoading(true);
      console.log('📋 [UserCreateScreen] Loading dropdowns...');
      
      // Load tất cả dropdown song song
      const results = await Promise.allSettled([
        RoleService.getAllRoles(),
        DepartmentService.getAllDepartments(),
        ChevronService.getAllChevrons(),
        ContractTypeService.getAllContractTypes(),
      ]);
      
      // Xử lý kết quả - chỉ set data nếu thành công
      if (results[0].status === 'fulfilled') {
        const arr = toArray(results[0].value);
        setRoles(arr);
        console.log('✅ [UserCreateScreen] Roles loaded:', arr.length || 0);
      } else {
        console.error('❌ [UserCreateScreen] Roles failed:', results[0].reason);
      }
      
      if (results[1].status === 'fulfilled') {
        const arr = toArray(results[1].value);
        setDepartments(arr);
        console.log('✅ [UserCreateScreen] Departments loaded:', arr.length || 0);
      } else {
        console.error('❌ [UserCreateScreen] Departments failed:', results[1].reason);
      }
      
      if (results[2].status === 'fulfilled') {
        const arr = toArray(results[2].value);
        setChevrons(arr);
        console.log('✅ [UserCreateScreen] Chevrons loaded:', arr.length || 0);
      } else {
        console.error('❌ [UserCreateScreen] Chevrons failed:', results[2].reason);
      }
      
      if (results[3].status === 'fulfilled') {
        const arr = toArray(results[3].value);
        setContractTypes(arr);
        console.log('✅ [UserCreateScreen] ContractTypes loaded:', arr.length || 0);
      } else {
        console.error('❌ [UserCreateScreen] ContractTypes failed:', results[3].reason);
        setContractTypes([]);
      }
      
    } catch (err) {
      console.error('❌ [UserCreateScreen] load dropdowns error', err);
      Alert.alert('Lỗi', 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (payload, photo) => {
    try {
      const created = await UserService.createUser(payload);
      // If API returns created object id
      navigation.goBack();
    } catch (err) {
      console.error('create user error', err);
      Alert.alert('Lỗi', err.response?.data?.message || err.message || 'Tạo người dùng thất bại');
      throw err;
    }
  };

  return (
    <Surface style={{ flex: 1 }}>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" />
          <Text>Đang tải...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 12 }}>
          <UserFormComponent
            initialValues={{}}
            isEdit={false}
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

export default UserCreateScreen;
