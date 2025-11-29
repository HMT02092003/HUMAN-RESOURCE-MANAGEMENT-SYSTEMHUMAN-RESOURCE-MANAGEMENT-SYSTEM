import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ShiftRegistrationScreen from '../../screens/shifts/ShiftRegistrationScreen';
import ShiftApprovalScreen from '../../screens/shifts/ShiftApprovalScreen';
import ShiftConfigurationScreen from '../../screens/shifts/ShiftConfigurationScreen';

const Stack = createNativeStackNavigator();

// Navigator cho đăng ký ca (Shift Registration)
export const ShiftRegistrationNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen
                name="ShiftRegistrationList"
                component={ShiftRegistrationScreen}
            />
        </Stack.Navigator>
    );
};

// Navigator cho duyệt đăng ký ca (Shift Approval)
export const ShiftApprovalNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen
                name="ShiftApprovalList"
                component={ShiftApprovalScreen}
            />
        </Stack.Navigator>
    );
};

// Navigator cho cấu hình ca (Shift Configuration)
export const ShiftConfigurationNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen
                name="ShiftConfigurationList"
                component={ShiftConfigurationScreen}
            />
        </Stack.Navigator>
    );
};

export default {
    ShiftRegistrationNavigator,
    ShiftApprovalNavigator,
    ShiftConfigurationNavigator
};
