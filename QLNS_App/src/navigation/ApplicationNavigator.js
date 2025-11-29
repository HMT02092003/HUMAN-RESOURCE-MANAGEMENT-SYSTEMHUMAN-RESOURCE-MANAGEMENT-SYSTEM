import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MyApplicationListScreen from '../../screens/applications/MyApplicationListScreen';
import ApplicationManagementScreen from '../../screens/applications/ApplicationManagementScreen';
import SelectApplicationTypeScreen from '../../screens/applications/SelectApplicationTypeScreen';
import LeaveApplicationScreen from '../../screens/applications/LeaveApplicationScreen';
import OvertimeApplicationScreen from '../../screens/applications/OvertimeApplicationScreen';
import ForgotCheckApplicationScreen from '../../screens/applications/ForgotCheckApplicationScreen';
import BusinessTripApplicationScreen from '../../screens/applications/BusinessTripApplicationScreen';
import ResignationApplicationScreen from '../../screens/applications/ResignationApplicationScreen';

const Stack = createNativeStackNavigator();

// Navigator cho đơn từ cá nhân (My Applications)
export const MyApplicationNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen
                name="MyApplicationList"
                component={MyApplicationListScreen}
            />
            <Stack.Screen
                name="SelectApplicationType"
                component={SelectApplicationTypeScreen}
            />
            <Stack.Screen
                name="LeaveApplication"
                component={LeaveApplicationScreen}
            />
            <Stack.Screen
                name="OvertimeApplication"
                component={OvertimeApplicationScreen}
            />
            <Stack.Screen
                name="ForgotCheckApplication"
                component={ForgotCheckApplicationScreen}
            />
            <Stack.Screen
                name="BusinessTripApplication"
                component={BusinessTripApplicationScreen}
            />
            <Stack.Screen
                name="ResignationApplication"
                component={ResignationApplicationScreen}
            />
        </Stack.Navigator>
    );
};

// Navigator cho quản lý đơn từ (Application Management)
export const ApplicationManagementNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen
                name="ApplicationManagementList"
                component={ApplicationManagementScreen}
            />
        </Stack.Navigator>
    );
};

// Default export - đơn từ cá nhân
const ApplicationNavigator = MyApplicationNavigator;

export default ApplicationNavigator;
