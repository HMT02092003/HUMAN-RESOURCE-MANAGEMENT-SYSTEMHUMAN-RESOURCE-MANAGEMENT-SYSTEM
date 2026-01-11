import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ChevronListScreen from '../../screens/chevrons/ChevronListScreen';
import ChevronCreateScreen from '../../screens/chevrons/ChevronCreateScreen';
import ChevronEditScreen from '../../screens/chevrons/ChevronEditScreen';
import ChevronFormScreen from '../../screens/chevrons/ChevronFormScreen';

const Stack = createNativeStackNavigator();

const ChevronNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen
                name="ChevronList"
                component={ChevronListScreen}
            />
            <Stack.Screen
                name="ChevronCreate"
                component={ChevronCreateScreen}
            />
            <Stack.Screen
                name="ChevronEdit"
                component={ChevronEditScreen}
            />
            <Stack.Screen
                name="ChevronForm"
                component={ChevronFormScreen}
            />
        </Stack.Navigator>
    );
};

export default ChevronNavigator;
