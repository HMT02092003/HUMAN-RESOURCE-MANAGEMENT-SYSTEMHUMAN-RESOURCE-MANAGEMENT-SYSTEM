import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';

const HolidayScreen = () => {
    const theme = useTheme();

    return (
        <View style={styles.container}>
            <Surface style={styles.content} elevation={2}>
                <Text variant="headlineMedium" style={{ color: theme.colors.primary, marginBottom: 8 }}>
                    Quản lý ngày lễ
                </Text>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                    Tính năng đang được phát triển...
                </Text>
            </Surface>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f5f7fa',
    },
    content: {
        padding: 24,
        borderRadius: 12,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
    },
});

export default HolidayScreen;
