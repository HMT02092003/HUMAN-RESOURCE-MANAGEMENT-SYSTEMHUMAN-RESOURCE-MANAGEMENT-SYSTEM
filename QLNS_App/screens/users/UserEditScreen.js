import React, { useEffect, useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { ActivityIndicator, Surface, Text } from 'react-native-paper';
import UserFormComponent from '../../components/UserFormComponent';
import RoleService from '../../services/RoleService';
import DepartmentService from '../../services/DepartmentService';
import ChevronService from '../../services/ChevronService';
import UserService from '../../services/UserService';

const UserEditScreen = ({ route, navigation }) => {
  const { userId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [chevrons, setChevrons] = useState([]);
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
      const [r, d, c, user] = await Promise.all([
        RoleService.getAllRoles(),
        DepartmentService.getAllDepartments(),
        ChevronService.getAllChevrons(),
        UserService.getUserDetail(userId),
      ]);
      setRoles(r || []);
      setDepartments(d || []);
      setChevrons(c || []);
      setInitialValues(user || {});
    } catch (err) {
      console.error('load data error', err);
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
            onSubmit={handleSubmit}
            onCancel={() => navigation.goBack()}
          />
        </ScrollView>
      )}
    </Surface>
  );
};

export default UserEditScreen;
