import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import AppLayout from './src/components/AppLayout';

// Minimal App entry that mounts the existing AppLayout inside NavigationContainer
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <AppLayout />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
