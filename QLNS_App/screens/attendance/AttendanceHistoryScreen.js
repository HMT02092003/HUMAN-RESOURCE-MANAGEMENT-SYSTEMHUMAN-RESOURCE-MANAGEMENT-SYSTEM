import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Image, Modal, ScrollView } from 'react-native';
import { TextInput, Button, Card, Chip, Searchbar, IconButton } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import AiService from '../../services/AiService';
import { useAuth } from '../../services/AuthContext';
import apiConfig from '../../services/apiConfig';

// Helper to get image URL safely
const getImageUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/150';

    let cleanPath = url;

    // Handle localhost/127.0.0.1 urls by stripping the domain (effectively treating as relative)
    // This fixes issues where backend saves "http://localhost:8000/uploads/..." which is unreachable on mobile
    if (cleanPath.startsWith('http://localhost') || cleanPath.startsWith('http://127.0.0.1')) {
        cleanPath = cleanPath.replace(/^http:\/\/[^/]+/, '');
    }

    // If it's still an absolute HTTP url (and not localhost), return it
    if (cleanPath.startsWith('http')) return cleanPath;

    // Normalize path: remove /ai/ or ai/ prefix if present
    if (cleanPath.startsWith('/ai/')) cleanPath = cleanPath.substring(3);
    else if (cleanPath.startsWith('ai/')) cleanPath = cleanPath.substring(2);

    // Ensure leading slash for consistency
    if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;

    // Get Base URL and strip /api (handling optional trailing slash)
    const baseUrl = apiConfig.getApiBaseUrl().replace(/\/api\/?$/, '');

    // Final URL: Base + /api/ai + Path
    const finalUrl = `${baseUrl}/api/ai${cleanPath}`;
    // console.log('🖼️ Image URL:', finalUrl);
    return finalUrl;
};

const AttendanceHistoryScreen = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    // Filters
    const [searchName, setSearchName] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    // Modal
    const [selectedLog, setSelectedLog] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    const fetchLogs = useCallback(async (isRefresh = false) => {
        if (loading) return;
        setLoading(true);
        try {
            const params = {
                page: isRefresh ? 1 : page,
                page_size: 20,
                start_date: dayjs(startDate).format('YYYY-MM-DD'),
                end_date: dayjs(endDate).format('YYYY-MM-DD'),
                // If user is regular employee (roleId 2), backend might enforce viewing only own logs, 
                // but we pass user_id if needed or handle logic similar to frontend
                user_id: user?.roleId === 2 ? user.id : undefined,
                search_name: searchName
            };

            const response = await AiService.getAttendanceLogs(params);

            if (response && response.success) {
                if (isRefresh) {
                    setLogs(response.data);
                } else {
                    setLogs(prev => {
                        const newLogs = response.data.filter(newLog => !prev.some(log => log.id === newLog.id));
                        return [...prev, ...newLogs];
                    });
                }
                setTotalPages(Math.ceil(response.total / 20));
            }
        } catch (error) {
            console.error('Fetch logs error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [startDate, endDate, searchName, page, user]);

    useEffect(() => {
        fetchLogs(true);
    }, [startDate, endDate]);

    const handleRefresh = () => {
        setRefreshing(true);
        setPage(1);
        fetchLogs(true);
    };

    const handleLoadMore = () => {
        if (page < totalPages) {
            setPage(prev => prev + 1);
        }
    };

    useEffect(() => {
        if (page > 1) fetchLogs();
    }, [page]);

    const renderItem = ({ item }) => (
        <AttendanceCard item={item} onPress={() => { setSelectedLog(item); setModalVisible(true); }} />
    );

    return (
        <View style={styles.container}>
            <View style={styles.filterSection}>
                <Searchbar
                    placeholder="Tìm tên nhân viên..."
                    onChangeText={setSearchName}
                    value={searchName}
                    onSubmitEditing={() => { setPage(1); fetchLogs(true); }}
                    style={styles.searchBar}
                />
                <View style={styles.dateRow}>
                    <TouchableOpacity onPress={() => setShowStartPicker(true)} style={styles.dateInput}>
                        <Text>{dayjs(startDate).format('DD/MM/YYYY')}</Text>
                    </TouchableOpacity>
                    <Text>-</Text>
                    <TouchableOpacity onPress={() => setShowEndPicker(true)} style={styles.dateInput}>
                        <Text>{dayjs(endDate).format('DD/MM/YYYY')}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {(showStartPicker || showEndPicker) && (
                <DateTimePicker
                    value={showStartPicker ? startDate : endDate}
                    mode="date"
                    display="spinner"
                    onChange={(event, selectedDate) => {
                        if (showStartPicker) {
                            setShowStartPicker(false);
                            if (selectedDate) setStartDate(selectedDate);
                        } else {
                            setShowEndPicker(false);
                            if (selectedDate) setEndDate(selectedDate);
                        }
                    }}
                />
            )}

            <FlatList
                data={logs}
                renderItem={renderItem}
                keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>Không có dữ liệu</Text>}
            />

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ScrollView>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Chi tiết chấm công</Text>
                                <IconButton icon="close" onPress={() => setModalVisible(false)} />
                            </View>

                            {selectedLog && (
                                <View>
                                    <Image
                                        source={{ uri: getImageUrl(selectedLog.image_snapshot_url) }}
                                        style={styles.fullImage}
                                        resizeMode="contain"
                                    />

                                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Nhân viên:</Text><Text style={styles.detailValue}>{selectedLog.fullName || selectedLog.username}</Text></View>
                                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Mã NV:</Text><Text style={styles.detailValue}>{selectedLog.user_id}</Text></View>
                                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Thời gian:</Text><Text style={styles.detailValue}>{dayjs(selectedLog.checkin_time).format('DD/MM/YYYY HH:mm:ss')}</Text></View>
                                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Trạng thái:</Text><Text style={{ ...styles.detailValue, color: getStatusColor(selectedLog.status) }}>{selectedLog.status}</Text></View>
                                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Độ tương đồng:</Text><Text style={styles.detailValue}>{(selectedLog.similarity_score * 100).toFixed(2)}%</Text></View>
                                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Loại khớp:</Text><Text style={styles.detailValue}>{selectedLog.matched_by_type}</Text></View>
                                    {selectedLog.notes && <View style={styles.detailRow}><Text style={styles.detailLabel}>Ghi chú:</Text><Text style={styles.detailValue}>{selectedLog.notes}</Text></View>}
                                </View>
                            )}
                        </ScrollView>
                        <Button mode="contained" onPress={() => setModalVisible(false)} style={{ marginTop: 10 }}>Đóng</Button>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// Helper for status color
const getStatusColor = (status) => {
    switch (status) {
        case 'recognized':
        case 'success':
        case 'confirmed':
            return '#52c41a'; // Green
        case 'unrecognized':
        case 'validation_failed':
        case 'unknown_face':
            return '#f5222d'; // Red
        case 'spoof':
            return '#fa8c16'; // Orange
        default:
            return '#d9d9d9'; // Grey
    }
};

// Sub-component for individual card with image error handling
const AttendanceCard = ({ item, onPress }) => {
    const [imgError, setImgError] = useState(false);

    return (
        <Card style={styles.card} onPress={onPress}>
            <View style={styles.cardRow}>
                <Image
                    source={
                        imgError
                            ? { uri: 'https://via.placeholder.com/150?text=No+Image' }
                            : { uri: getImageUrl(item.image_snapshot_url) }
                    }
                    style={styles.thumbnail}
                    onError={(e) => {
                        // console.log('Image Error:', e.nativeEvent.error);
                        setImgError(true);
                    }}
                />
                <View style={styles.cardInfo}>
                    <Text style={styles.name}>{item.fullName || item.username}</Text>
                    <Text style={styles.subText}>{item.department?.name || '---'}</Text>
                    <Text style={styles.timeText}>{dayjs(item.checkin_time).format('DD/MM HH:mm:ss')}</Text>

                    <View style={styles.statusRow}>
                        <Chip textStyle={{ fontSize: 11, color: '#fff' }} style={{ backgroundColor: getStatusColor(item.status) }}>
                            {item.status}
                        </Chip>
                        {item.similarity_score > 0 && (
                            <Text style={styles.score}>Sim: {(item.similarity_score * 100).toFixed(0)}%</Text>
                        )}
                    </View>
                </View>
            </View>
        </Card>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    filterSection: {
        padding: 10,
        backgroundColor: '#fff',
        elevation: 2,
    },
    searchBar: {
        marginBottom: 10,
        elevation: 0,
        backgroundColor: '#f0f0f0'
    },
    dateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateInput: {
        padding: 8,
        backgroundColor: '#e6f7ff',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#1890ff',
        width: '45%',
        alignItems: 'center'
    },
    listContent: {
        padding: 10,
    },
    card: {
        marginBottom: 10,
        backgroundColor: '#fff',
    },
    cardRow: {
        flexDirection: 'row',
        padding: 12, // Increased padding
    },
    thumbnail: {
        width: 110, // Increased size
        height: 110, // Increased size
        borderRadius: 8, // Softer corners
        backgroundColor: '#eee'
    },
    cardInfo: {
        flex: 1,
        marginLeft: 12, // More spacing
        justifyContent: 'space-between',
        paddingVertical: 2 // Tiny padding
    },
    name: {
        fontWeight: 'bold',
        fontSize: 15,
    },
    subText: {
        fontSize: 12,
        color: '#666',
    },
    timeText: {
        fontSize: 13,
        fontWeight: '500',
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4
    },
    score: {
        fontSize: 11,
        color: '#666'
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        maxHeight: '90%'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold'
    },
    fullImage: {
        width: '100%',
        height: 300,
        backgroundColor: '#000',
        borderRadius: 8,
        marginBottom: 15,
        resizeMode: 'contain'
    },
    detailRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    detailLabel: {
        width: 100,
        fontWeight: '600',
        color: '#555'
    },
    detailValue: {
        flex: 1,
    }
});

export default AttendanceHistoryScreen;
