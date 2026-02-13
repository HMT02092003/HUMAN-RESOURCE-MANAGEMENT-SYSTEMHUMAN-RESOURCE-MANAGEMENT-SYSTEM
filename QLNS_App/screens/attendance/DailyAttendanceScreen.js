import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { TextInput, Button, Card, Chip, Badge, ActivityIndicator, Searchbar } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import AttendanceService from '../../services/AttendanceService';
import { useNavigation } from '@react-navigation/native';

const DailyAttendanceScreen = () => {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(false);
    const [attendanceData, setAttendanceData] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [searchName, setSearchName] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    // Filter defaults - showing for a single day for mobile simplicity initially, 
    // but can expand to range matching web if needed. 
    // Web uses range but often people check "today". 
    // Let's stick to single day selector for now to keep UI simple or maybe a "from-to" if necessary.
    // The web version uses a range. Let's try to support range if possible, or just single day.
    // Let's do Date Range similar to web.

    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    const PERMISSION_KEY = 'dailyAttendance';

    const fetchAttendance = useCallback(async (isRefresh = false) => {
        if (loading) return;
        setLoading(true);
        try {
            const start = dayjs(startDate).format('YYYY-MM-DD');
            const end = dayjs(endDate).format('YYYY-MM-DD');

            const params = {
                permissionKey: PERMISSION_KEY,
                start,
                end,
                page: isRefresh ? 1 : page,
                pageSize: 20,
                fullName: searchName
            };

            const response = await AttendanceService.getDailyAttendanceByScope(params);

            if (response && response.results) {
                if (isRefresh) {
                    setAttendanceData(response.results);
                } else {
                    // Filter duplicates to prevent "same key" warning
                    setAttendanceData(prev => {
                        const existingIds = new Set(prev.map(item => item.id));
                        const newItems = response.results.filter(item => !existingIds.has(item.id));
                        return [...prev, ...newItems];
                    });
                }
                setTotalPages(Math.ceil(response.total / 20)); // Assuming pageSize 20
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [startDate, endDate, searchName, page]);

    useEffect(() => {
        fetchAttendance(true);
    }, [startDate, endDate]);

    const handleRefresh = () => {
        setRefreshing(true);
        setPage(1);
        fetchAttendance(true);
    };

    const handleLoadMore = () => {
        if (page < totalPages) {
            setPage(prev => prev + 1);
        }
    };

    useEffect(() => {
        if (page > 1) {
            fetchAttendance();
        }
    }, [page]);

    const formatTime = (time) => {
        if (!time) return '--:--';
        return dayjs(time).format('HH:mm');
    };

    const getStatusColor = (item) => {
        if (!item.checkInTime) return '#f5222d'; // Absent/No checkin
        if (item.lateMinutes > 0 || item.earlyDepartureMinutes > 0) return '#fa8c16'; // Warning
        return '#52c41a'; // Good
    };

    const renderItem = ({ item }) => {
        return (
            <Card style={styles.card}>
                <Card.Content>
                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={styles.name}>{item.fullName}</Text>
                            <Text style={styles.department}>{item.department?.name}</Text>
                        </View>
                        <Chip textStyle={{ color: '#fff', fontSize: 10 }} style={{ backgroundColor: getStatusColor(item) }}>
                            {dayjs(item.date).format('DD/MM')}
                        </Chip>
                    </View>

                    <View style={styles.detailsRow}>
                        <View style={styles.timeBlock}>
                            <Text style={styles.label}>Vào</Text>
                            <Text style={styles.timeValue}>{formatTime(item.checkInTime)}</Text>
                        </View>
                        <View style={styles.timeBlock}>
                            <Text style={styles.label}>Ra</Text>
                            <Text style={styles.timeValue}>{formatTime(item.checkOutTime)}</Text>
                        </View>
                        <View style={styles.timeBlock}>
                            <Text style={styles.label}>Ca</Text>
                            <Text style={styles.smallText}>{item.shiftName || 'HC'}</Text>
                        </View>
                    </View>

                    {(item.lateMinutes > 0 || item.earlyDepartureMinutes > 0) && (
                        <View style={styles.warningRow}>
                            {item.lateMinutes > 0 && <Text style={styles.warningText}>Muộn: {item.lateMinutes}p</Text>}
                            {item.earlyDepartureMinutes > 0 && <Text style={styles.warningText}> Sớm: {item.earlyDepartureMinutes}p</Text>}
                        </View>
                    )}

                    <View style={styles.footerRow}>
                        <Text style={{ fontSize: 12 }}>Tổng công: <Text style={{ fontWeight: 'bold' }}>{item.totalWorkingUnit}</Text></Text>
                        {item.overtimeHours > 0 && <Text style={{ fontSize: 12, color: 'blue' }}>OT: {item.overtimeHours}h</Text>}
                    </View>
                </Card.Content>
            </Card>
        );
    };

    const onSearch = () => {
        setPage(1);
        fetchAttendance(true);
    };

    return (
        <View style={styles.container}>
            <View style={styles.filterSection}>
                <Searchbar
                    placeholder="Tìm tên nhân viên..."
                    onChangeText={setSearchName}
                    value={searchName}
                    onSubmitEditing={onSearch}
                    style={styles.searchBar}
                />
                <View style={styles.dateRow}>
                    <TouchableOpacity onPress={() => setShowStartPicker(true)} style={styles.dateInput}>
                        <Text>Từ: {dayjs(startDate).format('DD/MM/YYYY')}</Text>
                    </TouchableOpacity>
                    <Text>-</Text>
                    <TouchableOpacity onPress={() => setShowEndPicker(true)} style={styles.dateInput}>
                        <Text>Đến: {dayjs(endDate).format('DD/MM/YYYY')}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {(showStartPicker || showEndPicker) && (
                <DateTimePicker
                    value={showStartPicker ? startDate : endDate}
                    mode="date"
                    display="default"
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
                data={attendanceData}
                renderItem={renderItem}
                keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>Không có dữ liệu</Text>}
            />
        </View>
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
        borderColor: '#1890ff'
    },
    listContent: {
        padding: 10,
    },
    card: {
        marginBottom: 10,
        backgroundColor: '#fff',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    name: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    department: {
        fontSize: 12,
        color: '#666',
    },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    timeBlock: {
        alignItems: 'center',
    },
    label: {
        fontSize: 10,
        color: '#888',
    },
    timeValue: {
        fontWeight: 'bold',
        fontSize: 14,
        color: '#1890ff',
    },
    smallText: {
        fontSize: 12,
    },
    warningRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    warningText: {
        color: '#fa8c16',
        fontSize: 12,
        marginRight: 10,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    }
});

export default DailyAttendanceScreen;
