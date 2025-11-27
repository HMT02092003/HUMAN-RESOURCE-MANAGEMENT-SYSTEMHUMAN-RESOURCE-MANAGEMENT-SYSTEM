import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ApplicationListScreen from '../../screens/applications/ApplicationListScreen';
// Import other application screens if they exist, e.g., Create, Detail
// Based on the file list, only ListScreen exists for now, but we should prepare the stack.
// If create/edit are modals or not yet implemented, we just have the list.
// But usually there should be a form. Let's assume just List for now if no others found.

const Stack = createNativeStackNavigator();

const ApplicationNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen
                name="ApplicationList"
                component={ApplicationListScreen}
            />
            {/* Add Create/Edit screens here when available */}
        </Stack.Navigator>
    );
};

export default ApplicationNavigator;
