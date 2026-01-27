"use client";

import React, { useState, useCallback } from 'react';
import { Row, Col, DatePicker, Button, message, Space, Tag, Typography } from 'antd';
import { SearchOutlined, DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ServerSideTable } from '@/components/common/ServerSideTable';
import type { ServerSideColumnType, TableQueryParams } from '@/components/common/ServerSideTable';
import { useExcelExport } from '@/components/common/ExcelExport';
import { attendanceService } from '@/service/attendanceService';
import { useAuth } from '@/hooks/useAuth';

const { RangePicker } = DatePicker;
const { Title } = Typography;

const DailyAttendanceMonitor: React.FC = () => {
    const { user } = useAuth(); // Removed permissions
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs(), dayjs()]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const { exportToExcel, isExporting } = useExcelExport();

    // Permission key for this feature
    const PERMISSION_KEY = 'dailyAttendance';

    // Format utility
    const formatTime = (timeStr: string | null) => {
        if (!timeStr) return '-';
        return dayjs(timeStr).format('HH:mm');
    };

    // Columns for checking daily attendance
    const columns: ServerSideColumnType<any>[] = [
        {
            title: 'Mã NV',
            dataIndex: 'userId',
            key: 'userId',
            width: 80,
            sortable: true,
            fixed: 'left',
        },
        {
            title: 'Họ và tên',
            dataIndex: 'fullName',
            key: 'fullName',
            width: 180,
            searchField: 'fullName',
            sortable: true,
            fixed: 'left',
        },
        {
            title: 'Phòng ban',
            dataIndex: ['department', 'name'],
            key: 'departmentName',
            width: 150,
            searchField: 'departmentName',
            sortable: true,
            render: (_: any, record: any) => record.department?.name || '-',
        },
        {
            title: 'Ngày',
            dataIndex: 'date',
            key: 'date',
            width: 110,
            render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
            sortable: true,
        },
        {
            title: 'Ca làm việc',
            dataIndex: 'shiftName',
            key: 'shiftName',
            width: 120,
            render: (name: string) => name || 'Hành chính',
        },
        {
            title: 'Giờ vào',
            dataIndex: 'checkInTime',
            key: 'checkInTime',
            width: 90,
            render: (time: any) => time ? <Tag color="blue">{formatTime(time)}</Tag> : '-',
        },
        {
            title: 'Giờ ra',
            dataIndex: 'checkOutTime',
            key: 'checkOutTime',
            width: 90,
            render: (time: any) => time ? <Tag color="blue">{formatTime(time)}</Tag> : '-',
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 140,
            render: (_: any, record: any) => {
                // Determine status logic based on fields
                let color = 'default';
                let text = 'Chưa chấm công';

                // Prioritize calculation results
                if (record.checkInTime && record.checkOutTime) {
                    if (record.lateMinutes > 0 && record.earlyDepartureMinutes > 0) {
                        return <Tag color="volcano">Muộn & Sớm</Tag>;
                    }
                    if (record.lateMinutes > 0) return <Tag color="warning">Đi muộn</Tag>;
                    if (record.earlyDepartureMinutes > 0) return <Tag color="warning">Về sớm</Tag>;
                    return <Tag color="success">Đúng giờ</Tag>;
                } else if (record.checkInTime) {
                    return <Tag color="processing">Đang làm việc</Tag>;
                } else {
                    // Could be absent or future
                    // Simple check: if date < today -> Absent
                    return <Tag color="default">Chưa chấm công</Tag>;
                }
            }
        },
        {
            title: 'Làm thêm (h)',
            dataIndex: 'overtimeHours',
            key: 'overtimeHours',
            width: 100,
            render: (val: number) => val > 0 ? <span style={{ color: 'green', fontWeight: 'bold' }}>{val}h</span> : '-',
        },
        {
            title: 'Công OT',
            dataIndex: 'otWorkingUnit',
            key: 'otWorkingUnit',
            width: 100,
            render: (val: number) => val > 0 ? <span style={{ color: 'green' }}>{val}</span> : '-',
        },
        {
            title: 'Tổng công',
            dataIndex: 'totalWorkingUnit',
            key: 'totalWorkingUnit',
            width: 100,
            render: (val: number) => <strong>{val}</strong>,
        },
    ];

    // Excel export columns definition
    const excelColumns = [
        { title: 'Mã NV', dataIndex: 'userId', width: 10 },
        { title: 'Họ và tên', dataIndex: 'fullName', width: 25 },
        { title: 'Phòng ban', dataIndex: ['department', 'name'], width: 20 },
        { title: 'Chức vụ', dataIndex: 'position', width: 20 },
        { title: 'Ngày', dataIndex: 'date', width: 15, render: (val: any) => val ? dayjs(val).format('DD/MM/YYYY') : '' },
        { title: 'Ca làm việc', dataIndex: 'shiftName', width: 15 },
        { title: 'Giờ vào', dataIndex: 'checkInTime', width: 15, render: (t: any) => t ? dayjs(t).format('HH:mm') : '-' },
        { title: 'Giờ ra', dataIndex: 'checkOutTime', width: 15, render: (t: any) => t ? dayjs(t).format('HH:mm') : '-' },
        { title: 'Số phút muộn', dataIndex: 'lateMinutes', width: 15 },
        { title: 'Số phút về sớm', dataIndex: 'earlyDepartureMinutes', width: 15 },
        { title: 'Giờ OT', dataIndex: 'overtimeHours', width: 10 },
        { title: 'Công chuẩn', dataIndex: 'dailyWorkingUnit', width: 10 },
        { title: 'Công OT', dataIndex: 'otWorkingUnit', width: 10 },
        { title: 'Tổng công', dataIndex: 'totalWorkingUnit', width: 10 },
    ];

    const fetchData = useCallback(async (params: TableQueryParams) => {
        try {
            if (!dateRange || !dateRange[0] || !dateRange[1]) {
                return { data: [], total: 0 };
            }

            const start = dateRange[0].format('YYYY-MM-DD');
            const end = dateRange[1].format('YYYY-MM-DD');

            const res = await attendanceService.getDailyAttendanceByScope({
                ...params,
                permissionKey: PERMISSION_KEY,
                start,
                end,
            });

            return {
                data: res.results || [],
                total: res.total || 0,
            };
        } catch (error) {
            message.error('Không thể tải dữ liệu chấm công');
            return { data: [], total: 0 };
        }
    }, [dateRange]);

    const handleRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    const handleExportClick = async () => {
        try {
            const start = dateRange[0].format('YYYY-MM-DD');
            const end = dateRange[1].format('YYYY-MM-DD');

            // Fetch ALL data for export
            const res = await attendanceService.getDailyAttendanceByScope({
                permissionKey: PERMISSION_KEY,
                start,
                end,
                page: 1,
                pageSize: 5000 // Limit for export
            });

            if (res.results && res.results.length > 0) {
                exportToExcel({
                    data: res.results,
                    columns: excelColumns,
                    fileName: 'BangChamCongHangNgay',
                    title: `BẢNG CHẤM CÔNG HÀNG NGÀY (${start} - ${end})`,
                    description: `Xuất bởi: ${user?.fullName || user?.username} - Ngày: ${dayjs().format('DD/MM/YYYY HH:mm')}`
                });
            } else {
                message.info('Không có dữ liệu để xuất');
            }
        } catch (e) {
            message.error('Lỗi khi tải dữ liệu xuất Excel');
        }
    };

    return (
        <div style={{ padding: 24, background: '#fff', borderRadius: 8 }}>
            <Row gutter={[16, 24]}>
                <Col span={24} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <Title level={4} style={{ margin: 0 }}>Chấm công hàng ngày</Title>
                    <Space wrap>
                        <RangePicker
                            value={dateRange}
                            onChange={(dates) => {
                                if (dates) {
                                    setDateRange([dates[0]!, dates[1]!]);
                                    setRefreshTrigger(prev => prev + 1);
                                }
                            }}
                            format="DD/MM/YYYY"
                        />
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={handleRefresh}
                        >
                            Làm mới
                        </Button>
                        <Button
                            type="primary"
                            icon={<DownloadOutlined />}
                            loading={isExporting}
                            onClick={handleExportClick}
                            style={{ backgroundColor: '#217ca3' }}
                        >
                            Xuất Excel
                        </Button>
                    </Space>
                </Col>

                <Col span={24}>
                    <ServerSideTable
                        columns={columns}
                        fetchData={fetchData}
                        rowKey="id"
                        refreshTrigger={refreshTrigger}
                        scroll={{ x: 1300 }}
                    />
                </Col>
            </Row>
        </div>
    );
};

export default DailyAttendanceMonitor;
