import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { ContractTypeService } from '../../services/ContractTypeService';
import { Portal, Dialog, Button, Paragraph } from 'react-native-paper';

const ContractTypeListScreen = ({ navigation }) => {
    const [contractTypes, setContractTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchText, setSearchText] = useState('');

    const fetchContractTypes = async () => {
        try {
            const data = await ContractTypeService.getAllContractTypes();
            setContractTypes(data);
        } catch (error) {
            console.error('Error fetching contract types:', error);
            Alert.alert('Lỗi', 'Không thể tải danh sách loại hợp đồng');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchContractTypes();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchContractTypes();
    };

    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState(null);

    const handleDelete = (id) => {
        setDeleteTargetId(id);
        setDeleteDialogVisible(true);
    };

    const confirmDelete = async () => {
        setDeleteDialogVisible(false);
        if (!deleteTargetId) return;
        try {
            await ContractTypeService.deleteContractType(deleteTargetId);
            Alert.alert('Thành công', 'Đã xóa loại hợp đồng');
            fetchContractTypes();
        } catch (error) {
            console.error('Error deleting contract type:', error);
            Alert.alert('Lỗi', 'Không thể xóa loại hợp đồng');
        } finally {
            setDeleteTargetId(null);
        }
    };

    const formatDate = (dateString) => {
        return dayjs(dateString).format('DD/MM/YYYY');
    };

    const filteredContractTypes = contractTypes.filter((item) =>
        item.name.toLowerCase().includes(searchText.toLowerCase())
    );

    const getContractTypeLabel = (type) => {
        const labels = {
            1: 'Hợp đồng Thực tập',
            2: 'Hợp đồng Thử việc',
            3: 'Hợp đồng Lao động (Có thời hạn)',
            4: 'Hợp đồng Lao động (Không thời hạn)',
            5: 'Hợp đồng Đào tạo nghề',
            6: 'Hợp đồng Cộng tác viên (CTV)',
            7: 'Hợp đồng Khoán việc',
        };
        return labels[type] || 'Khác';
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ContractTypeEdit', { contractTypeId: item.id })}
        >
            <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                    <Ionicons name="document-text" size={24} color="#1890ff" />
                </View>
                <View style={styles.info}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.type}>
                        {getContractTypeLabel(item.type)}
                    </Text>
                    <Text style={styles.detail}>Thời hạn: {item.contractTerm ? `${item.contractTerm} tháng` : 'Vô thời hạn'}</Text>
                    <Text style={styles.detail}>Bảo hiểm: {item.insurance ? item.insurance.toLocaleString() : 0} VND</Text>
                    <Text style={styles.description} numberOfLines={2}>
                        {item.description || 'Không có mô tả'}
                    </Text>
                    {item.created_at && (
                        <Text style={styles.date}>Ngày tạo: {formatDate(item.created_at)}</Text>
                    )}
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate('ContractTypeEdit', { contractTypeId: item.id })}
                    >
                        <Ionicons name="create-outline" size={20} color="#1890ff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDelete(item.id)}
                    >
                        <Ionicons name="trash-outline" size={20} color="#ff4d4f" />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header bar like Department */}
            <View style={styles.headerBar}>
                <Text style={styles.totalText}>Tổng số: {filteredContractTypes.length} loại hợp đồng</Text>
                <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('ContractTypeCreate')}>
                    <Ionicons name="add-circle" size={24} color="#fff" />
                    <Text style={styles.addButtonText}>Tạo mới</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainerDept}>
                <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm kiếm loại hợp đồng..."
                    value={searchText}
                    onChangeText={setSearchText}
                />
                {searchText !== '' && (
                    <TouchableOpacity onPress={() => setSearchText('')}>
                        <Ionicons name="close-circle" size={20} color="#999" />
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#1890ff" />
                </View>
            ) : (
                <FlatList
                    data={filteredContractTypes}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>Không có dữ liệu</Text>
                        </View>
                    }
                />
            )}

            <Portal>
                <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
                    <Dialog.Title>Xác nhận xóa</Dialog.Title>
                    <Dialog.Content>
                        <Paragraph>Bạn có chắc chắn muốn xóa loại hợp đồng này?</Paragraph>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setDeleteDialogVisible(false)}>Hủy</Button>
                        <Button onPress={confirmDelete} textColor="#ff4d4f">Xóa</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f7fa' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: '#1890ff',
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    headerBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e8e8e8',
    },
    totalText: { fontSize: 14, color: '#666' },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1890ff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    addButtonText: { color: '#fff', marginLeft: 8, fontWeight: '600' },
    searchContainerDept: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        margin: 12,
        paddingHorizontal: 12,
        borderRadius: 8,
        elevation: 2,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        margin: 16,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d9d9d9',
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, height: 40, fontSize: 16 },
    listContent: { padding: 16 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 12,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    cardContent: { flexDirection: 'row', alignItems: 'flex-start' },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e6f7ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: '600', color: '#262626', marginBottom: 4 },
    type: { fontSize: 14, color: '#1890ff', marginBottom: 4, fontWeight: '500' },
    detail: { fontSize: 13, color: '#595959', marginBottom: 2 },
    description: { fontSize: 13, color: '#8c8c8c', marginBottom: 4, fontStyle: 'italic' },
    date: { fontSize: 12, color: '#8c8c8c' },
    actions: { flexDirection: 'column', justifyContent: 'center', marginLeft: 8 },
    actionButton: { padding: 8 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { alignItems: 'center', marginTop: 40 },
    emptyText: { color: '#8c8c8c', fontSize: 16 },
});

export default ContractTypeListScreen;
