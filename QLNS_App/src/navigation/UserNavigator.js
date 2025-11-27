import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import UserManagementScreen from '../../screens/users/UserManagementScreen';
import UserCreateScreen from '../../screens/users/UserCreateScreen';
import UserEditScreen from '../../screens/users/UserEditScreen';
import UserDetailScreen from '../../screens/users/UserDetailScreen';
import UserFormScreen from '../../screens/users/UserFormScreen';

const Stack = createNativeStackNavigator();

const UserNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen
                name="UserList"
                component={UserManagementScreen}
            />
            <Stack.Screen
                name="UserCreate"
                component={UserCreateScreen}
            />
            <Stack.Screen
                name="UserEdit"
                component={UserEditScreen}
            />
            <Stack.Screen
                name="UserDetail"
                component={UserDetailScreen}
            />
            <Stack.Screen
                name="UserForm"
                component={UserFormScreen}
            />
        </Stack.Navigator>
    );
};

export default UserNavigator;
