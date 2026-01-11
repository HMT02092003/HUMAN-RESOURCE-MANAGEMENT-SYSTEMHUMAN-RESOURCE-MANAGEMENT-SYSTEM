import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Các loại đơn từ giống web FE
const APPLICATION_TYPES = [
    {
        type: 'leave',
        label: 'Xin nghỉ phép',
        description: 'Đăng ký nghỉ phép có lý do',
        icon: 'calendar-outline',
        emoji: '🏖️',
        color: '#1890ff',
        screen: 'LeaveApplicationCreate',
    },
    {
        type: 'forgot-check',
        label: 'Quên check in/out',
        description: 'Báo cáo quên chấm công vào/ra',
        icon: 'alarm-outline',
        emoji: '📝',
        color: '#eb2f96',
        screen: 'ForgotCheckApplicationCreate',
    },
    {
        type: 'overtime',
        label: 'Làm thêm giờ',
        description: 'Đăng ký làm ngoài giờ',
        icon: 'time-outline',
        emoji: '⏱️',
        color: '#fa8c16',
        screen: 'OvertimeApplicationCreate',
    },
    {
        type: 'business-trip',
        label: 'Công tác',
        description: 'Đăng ký đi công tác',
        icon: 'airplane-outline',
        emoji: '✈️',
        color: '#722ed1',
        screen: 'BusinessTripApplicationCreate',
    },
    {
        type: 'resignation',
        label: 'Thôi việc',
        description: 'Đơn xin thôi việc',
        icon: 'exit-outline',
        emoji: '👋',
        color: '#f5222d',
        screen: 'ResignationApplicationCreate',
    },
];

const SelectApplicationTypeScreen = ({ navigation }) => {
    const handleSelectType = (item) => {
        navigation.navigate(item.screen);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#262626" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chọn loại đơn</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content}>
                <Text style={styles.subtitle}>
                    Vui lòng chọn loại đơn từ bạn muốn tạo
                </Text>

                <View style={styles.typeList}>
                    {APPLICATION_TYPES.map((item) => (
                        <TouchableOpacity
                            key={item.type}
                            style={styles.typeCard}
                            onPress={() => handleSelectType(item)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
                                <Ionicons name={item.icon} size={28} color={item.color} />
                            </View>
                            <View style={styles.typeInfo}>
                                <Text style={styles.typeLabel}>{item.label}</Text>
                                <Text style={styles.typeDescription}>{item.description}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#bfbfbf" />
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#262626',
    },
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    subtitle: {
        fontSize: 14,
        color: '#8c8c8c',
        marginBottom: 20,
        textAlign: 'center',
    },
    typeList: {
        gap: 12,
    },
    typeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    iconContainer: {
        width: 52,
        height: 52,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    typeInfo: {
        flex: 1,
    },
    typeLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#262626',
        marginBottom: 4,
    },
    typeDescription: {
        fontSize: 13,
        color: '#8c8c8c',
    },
});

export default SelectApplicationTypeScreen;
