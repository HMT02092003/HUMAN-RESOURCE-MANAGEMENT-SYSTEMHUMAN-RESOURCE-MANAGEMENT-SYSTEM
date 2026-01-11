import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ContractTypeListScreen from '../../screens/contractTypes/ContractTypeListScreen';
import ContractTypeCreateScreen from '../../screens/contractTypes/ContractTypeCreateScreen';
import ContractTypeEditScreen from '../../screens/contractTypes/ContractTypeEditScreen';
import ContractTypeFormScreen from '../../screens/contractTypes/ContractTypeFormScreen';

const Stack = createNativeStackNavigator();

const ContractTypeNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen
                name="ContractTypeList"
                component={ContractTypeListScreen}
            />
            <Stack.Screen
                name="ContractTypeCreate"
                component={ContractTypeCreateScreen}
            />
            <Stack.Screen
                name="ContractTypeEdit"
                component={ContractTypeEditScreen}
            />
            <Stack.Screen
                name="ContractTypeForm"
                component={ContractTypeFormScreen}
            />
        </Stack.Navigator>
    );
};

export default ContractTypeNavigator;
