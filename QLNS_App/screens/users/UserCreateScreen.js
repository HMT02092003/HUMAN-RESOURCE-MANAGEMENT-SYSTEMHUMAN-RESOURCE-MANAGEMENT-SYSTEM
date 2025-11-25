import React, { useEffect, useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { ActivityIndicator, Surface, Text } from 'react-native-paper';
import UserFormComponent from '../../components/UserFormComponent';
import RoleService from '../../services/RoleService';
import DepartmentService from '../../services/DepartmentService';
import ChevronService from '../../services/ChevronService';
import UserService from '../../services/UserService';

const UserCreateScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [chevrons, setChevrons] = useState([]);

  useEffect(() => {
    loadDropdowns();
  }, []);

  const loadDropdowns = async () => {
    try {
      setLoading(true);
      const [r, d, c] = await Promise.all([
        RoleService.getAllRoles(),
        DepartmentService.getAllDepartments(),
        ChevronService.getAllChevrons(),
      ]);
      setRoles(r || []);
      setDepartments(d || []);
      setChevrons(c || []);
    } catch (err) {
      console.error('load dropdowns error', err);
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
            onSubmit={handleSubmit}
            onCancel={() => navigation.goBack()}
          />
        </ScrollView>
      )}
    </Surface>
  );
};

export default UserCreateScreen;
