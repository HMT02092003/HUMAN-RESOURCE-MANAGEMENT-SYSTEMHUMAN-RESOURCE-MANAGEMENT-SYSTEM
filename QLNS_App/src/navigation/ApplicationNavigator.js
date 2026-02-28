import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MyApplicationListScreen from '../../screens/applications/MyApplicationListScreen';
import ApplicationManagementScreen from '../../screens/applications/ApplicationManagementScreen';
import SelectApplicationTypeScreen from '../../screens/applications/SelectApplicationTypeScreen';
import LeaveApplicationScreen from '../../screens/applications/LeaveApplicationScreen';
import LeaveApplicationCreateScreen from '../../screens/applications/LeaveApplicationCreateScreen';
import LeaveApplicationEditScreen from '../../screens/applications/LeaveApplicationEditScreen';
import OvertimeApplicationScreen from '../../screens/applications/OvertimeApplicationScreen';
import OvertimeApplicationCreateScreen from '../../screens/applications/OvertimeApplicationCreateScreen';
import ForgotCheckApplicationScreen from '../../screens/applications/ForgotCheckApplicationScreen';
import ForgotCheckApplicationCreateScreen from '../../screens/applications/ForgotCheckApplicationCreateScreen';
import BusinessTripApplicationScreen from '../../screens/applications/BusinessTripApplicationScreen';
import BusinessTripApplicationCreateScreen from '../../screens/applications/BusinessTripApplicationCreateScreen';
import ResignationApplicationScreen from '../../screens/applications/ResignationApplicationScreen';
import ResignationApplicationCreateScreen from '../../screens/applications/ResignationApplicationCreateScreen';
import ShiftApplicationScreen from '../../screens/applications/ShiftApplicationScreen';

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
                name="LeaveApplicationCreate"
                component={LeaveApplicationCreateScreen}
            />
            <Stack.Screen
                name="LeaveApplicationEdit"
                component={LeaveApplicationEditScreen}
            />
            <Stack.Screen
                name="OvertimeApplication"
                component={OvertimeApplicationScreen}
            />
            <Stack.Screen
                name="OvertimeApplicationCreate"
                component={OvertimeApplicationCreateScreen}
            />
            <Stack.Screen
                name="ForgotCheckApplication"
                component={ForgotCheckApplicationScreen}
            />
            <Stack.Screen
                name="ForgotCheckApplicationCreate"
                component={ForgotCheckApplicationCreateScreen}
            />
            <Stack.Screen
                name="BusinessTripApplication"
                component={BusinessTripApplicationScreen}
            />
            <Stack.Screen
                name="BusinessTripApplicationCreate"
                component={BusinessTripApplicationCreateScreen}
            />
            <Stack.Screen
                name="ResignationApplication"
                component={ResignationApplicationScreen}
            />
            <Stack.Screen
                name="ResignationApplicationCreate"
                component={ResignationApplicationCreateScreen}
            />
            <Stack.Screen
                name="ShiftApplicationCreate"
                component={ShiftApplicationScreen}
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
