import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DepartmentListScreen from '../../screens/departments/DepartmentListScreen';
import DepartmentCreateScreen from '../../screens/departments/DepartmentCreateScreen';
import DepartmentEditScreen from '../../screens/departments/DepartmentEditScreen';
import DepartmentDetailScreen from '../../screens/departments/DepartmentDetailScreen';
import DepartmentFormScreen from '../../screens/departments/DepartmentFormScreen';

const Stack = createNativeStackNavigator();

const DepartmentNavigator = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false, // Headers are handled by the screens or AppLayout if needed, but usually Stack screens might want their own header or inherit. 
                // In this app, AppLayout provides the Drawer header. 
                // However, for nested stack screens (Create/Edit), we usually want a back button.
                // The current AppLayout logic hides the drawer header for some screens.
                // Let's keep headerShown: false for now and let the screens define their headers or use the one from AppLayout if they are direct children (which they aren't anymore).
                // Wait, if we nest Stack inside Drawer, the Drawer header stays on top unless we hide it.
                // But for Create/Edit screens, we usually want to hide the Drawer header and show a Stack header with Back button.
                // Or we can keep the Drawer header and just use the content.
                // The user's previous code had `headerShown: true` in Drawer screens.
                // Let's try `headerShown: false` here and let the specific screens or the parent Drawer manage it?
                // Actually, standard pattern:
                // Drawer -> Stack -> List (Drawer header visible)
                //                 -> Create (Drawer header hidden, Stack header visible with Back)
            }}
        >
            <Stack.Screen
                name="DepartmentList"
                component={DepartmentListScreen}
                options={{ headerShown: false }} // List screen uses Drawer header
            />
            <Stack.Screen
                name="DepartmentCreate"
                component={DepartmentCreateScreen}
                options={{ headerShown: false }} // Create screen has its own custom header in the component
            />
            <Stack.Screen
                name="DepartmentEdit"
                component={DepartmentEditScreen}
                options={{ headerShown: false }} // Edit screen has its own custom header
            />
            <Stack.Screen
                name="DepartmentDetail"
                component={DepartmentDetailScreen}
                options={{ headerShown: false }} // Detail screen has its own custom header
            />
            <Stack.Screen
                name="DepartmentForm"
                component={DepartmentFormScreen}
                options={{ headerShown: false }} // Form screen has its own custom header
            />
        </Stack.Navigator>
    );
};

export default DepartmentNavigator;
