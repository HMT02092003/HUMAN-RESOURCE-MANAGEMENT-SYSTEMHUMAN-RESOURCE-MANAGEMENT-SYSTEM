import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CVListScreen from '../../screens/cvs/CVListScreen';
import CVCreateScreen from '../../screens/cvs/CVCreateScreen';

const Stack = createNativeStackNavigator();

const CVNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CVList" component={CVListScreen} />
      <Stack.Screen name="Tạo CV" component={CVCreateScreen} />
    </Stack.Navigator>
  );
};

export default CVNavigator;
