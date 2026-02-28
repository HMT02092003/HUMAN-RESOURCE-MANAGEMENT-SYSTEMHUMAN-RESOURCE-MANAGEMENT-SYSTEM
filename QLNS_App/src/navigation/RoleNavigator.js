import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RoleListScreen from '../../screens/roles/RoleListScreen';
import RoleCreateScreen from '../../screens/roles/RoleCreateScreen';
import RoleEditScreen from '../../screens/roles/RoleEditScreen';
import RoleDecentralizationScreen from '../../screens/roles/RoleDecentralizationScreen';

const Stack = createNativeStackNavigator();

const RoleNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RoleList" component={RoleListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="RoleCreate" component={RoleCreateScreen} options={{ headerShown: false }} />
      <Stack.Screen name="RoleEdit" component={RoleEditScreen} options={{ headerShown: false }} />
      <Stack.Screen name="RoleDecentralization" component={RoleDecentralizationScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};

export default RoleNavigator;
