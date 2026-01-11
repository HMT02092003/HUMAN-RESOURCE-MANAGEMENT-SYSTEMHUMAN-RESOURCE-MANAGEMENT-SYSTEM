// Temporary file to hold view mode rendering code for all application screens
// This will be inserted into each screen

// ============ OVERTIME VIEW MODE ============
if (isViewMode && applicationFullData) {
    const appData = applicationFullData.data || {};
    const STATUS_LABELS = { 0: 'Chờ duyệt', 1: 'Đã duyệt', 2: 'Từ chối' };
    const STATUS_COLORS = { 0: '#fa8c16', 1: '#52c41a', 2: '#ff4d4f' };

    const sections = [
        {
            title: 'Thông tin làm thêm giờ',
            icon: 'clock-plus-outline',
            fields: [
                { label: 'Ngày làm thêm', value: appData.overtimeDate, type: 'date', icon: 'calendar' },
                { label: 'Giờ bắt đầu', value: appData.startTime, icon: 'clock-time-three-outline' },
                { label: 'Số giờ làm thêm', value: `${appData.overtimeHours || 0} giờ`, icon: 'timer-outline' },
                { label: 'Giờ kết thúc (dự kiến)', value: calculateEndTime(), icon: 'clock-end' },
                { label: 'Lý do', value: appData.reason || 'N/A', icon: 'text' }
            ]
        },
        {
            title: 'Trạng thái & Phê duyệt',
            icon: 'information-outline',
            fields: [
                {
                    label: 'Trạng thái',
                    value: STATUS_LABELS[applicationFullData.status] || 'N/A',
                    type: 'chip',
                    chipStyle: { backgroundColor: STATUS_COLORS[applicationFullData.status] + '20' },
                    chipTextStyle: { color: STATUS_COLORS[applicationFullData.status], fontWeight: '600' },
                    icon: 'checkbox-marked-circle-outline'
                },
                ...(applicationFullData.approvedByInfo ? [{
                    label: 'Người duyệt',
                    value: applicationFullData.approvedByInfo.fullName,
                    icon: 'account-check'
                }] : []),
                ...(applicationFullData.approvedDate ? [{
                    label: 'Ngày duyệt',
                    value: applicationFullData.approvedDate,
                    type: 'datetime',
                    icon: 'calendar-check'
                }] : []),
                ...(appData.rejectReason ? [{
                    label: 'Lý do từ chối',
                    value: appData.rejectReason,
                    icon: 'close-circle-outline',
                    valueStyle: { color: '#ff4d4f' }
                }] : []),
                { label: 'Ngày tạo', value: applicationFullData.created_at, type: 'datetime', icon: 'calendar-plus' }
            ]
        }
    ];

    const actions = [
        ...(applicationFullData.status === 0 ? [{
            label: 'Chỉnh sửa đơn',
            icon: 'pencil',
            color: '#1890ff',
            mode: 'contained',
            onPress: () => navigation.replace('OvertimeApplication', { mode: 'edit', applicationId })
        }] : [])
    ];

    return (
        <DetailViewScreen
            title="Chi tiết đơn làm thêm giờ"
            sections={sections}
            actions={actions}
            loading={loading}
            onBack={() => navigation.goBack()}
        />
    );
}

// ============ FORGOT CHECK VIEW MODE ============
if (isViewMode && applicationFullData) {
    const appData = applicationFullData.data || {};
    const STATUS_LABELS = { 0: 'Chờ duyệt', 1: 'Đã duyệt', 2: 'Từ chối' };
    const STATUS_COLORS = { 0: '#fa8c16', 1: '#52c41a', 2: '#ff4d4f' };

    const sections = [
        {
            title: 'Thông tin quên chấm công',
            icon: 'alarm',
            fields: [
                { 
                    label: 'Loại', 
                    value: FORGOT_CHECK_TYPES.find(t => t.value === appData.forgotType)?.label || 'N/A',
                    icon: 'tag-outline' 
                },
                { label: 'Ngày quên', value: appData.forgotDate, type: 'date', icon: 'calendar' },
                { label: 'Giờ quên chấm', value: appData.forgotTime, icon: 'clock-time-three-outline' },
                { label: 'Lý do', value: appData.reason || 'N/A', icon: 'text' }
            ]
        },
        {
            title: 'Trạng thái & Phê duyệt',
            icon: 'information-outline',
            fields: [
                {
                    label: 'Trạng thái',
                    value: STATUS_LABELS[applicationFullData.status] || 'N/A',
                    type: 'chip',
                    chipStyle: { backgroundColor: STATUS_COLORS[applicationFullData.status] + '20' },
                    chipTextStyle: { color: STATUS_COLORS[applicationFullData.status], fontWeight: '600' },
                    icon: 'checkbox-marked-circle-outline'
                },
                ...(applicationFullData.approvedByInfo ? [{
                    label: 'Người duyệt',
                    value: applicationFullData.approvedByInfo.fullName,
                    icon: 'account-check'
                }] : []),
                ...(applicationFullData.approvedDate ? [{
                    label: 'Ngày duyệt',
                    value: applicationFullData.approvedDate,
                    type: 'datetime',
                    icon: 'calendar-check'
                }] : []),
                ...(appData.rejectReason ? [{
                    label: 'Lý do từ chối',
                    value: appData.rejectReason,
                    icon: 'close-circle-outline',
                    valueStyle: { color: '#ff4d4f' }
                }] : []),
                { label: 'Ngày tạo', value: applicationFullData.created_at, type: 'datetime', icon: 'calendar-plus' }
            ]
        }
    ];

    const actions = [
        ...(applicationFullData.status === 0 ? [{
            label: 'Chỉnh sửa đơn',
            icon: 'pencil',
            color: '#1890ff',
            mode: 'contained',
            onPress: () => navigation.replace('ForgotCheckApplication', { mode: 'edit', applicationId })
        }] : [])
    ];

    return (
        <DetailViewScreen
            title="Chi tiết đơn quên chấm công"
            sections={sections}
            actions={actions}
            loading={loading}
            onBack={() => navigation.goBack()}
        />
    );
}

// ============ BUSINESS TRIP VIEW MODE ============
if (isViewMode && applicationFullData) {
    const appData = applicationFullData.data || {};
    const STATUS_LABELS = { 0: 'Chờ duyệt', 1: 'Đã duyệt', 2: 'Từ chối' };
    const STATUS_COLORS = { 0: '#fa8c16', 1: '#52c41a', 2: '#ff4d4f' };

    const sections = [
        {
            title: 'Thông tin công tác',
            icon: 'airplane',
            fields: [
                { label: 'Từ ngày', value: appData.startDate, type: 'date', icon: 'calendar-start' },
                { label: 'Đến ngày', value: appData.endDate, type: 'date', icon: 'calendar-end' },
                { label: 'Số ngày', value: `${calculateDays()} ngày`, icon: 'calendar-clock' },
                { label: 'Địa điểm', value: appData.destination || 'N/A', icon: 'map-marker' },
                { label: 'Mục đích', value: appData.purpose || 'N/A', icon: 'text' },
                { 
                    label: 'Chi phí dự kiến', 
                    value: appData.estimatedCost || 0, 
                    type: 'currency', 
                    icon: 'cash' 
                }
            ]
        },
        {
            title: 'Trạng thái & Phê duyệt',
            icon: 'information-outline',
            fields: [
                {
                    label: 'Trạng thái',
                    value: STATUS_LABELS[applicationFullData.status] || 'N/A',
                    type: 'chip',
                    chipStyle: { backgroundColor: STATUS_COLORS[applicationFullData.status] + '20' },
                    chipTextStyle: { color: STATUS_COLORS[applicationFullData.status], fontWeight: '600' },
                    icon: 'checkbox-marked-circle-outline'
                },
                ...(applicationFullData.approvedByInfo ? [{
                    label: 'Người duyệt',
                    value: applicationFullData.approvedByInfo.fullName,
                    icon: 'account-check'
                }] : []),
                ...(applicationFullData.approvedDate ? [{
                    label: 'Ngày duyệt',
                    value: applicationFullData.approvedDate,
                    type: 'datetime',
                    icon: 'calendar-check'
                }] : []),
                ...(appData.rejectReason ? [{
                    label: 'Lý do từ chối',
                    value: appData.rejectReason,
                    icon: 'close-circle-outline',
                    valueStyle: { color: '#ff4d4f' }
                }] : []),
                { label: 'Ngày tạo', value: applicationFullData.created_at, type: 'datetime', icon: 'calendar-plus' }
            ]
        }
    ];

    const actions = [
        ...(applicationFullData.status === 0 ? [{
            label: 'Chỉnh sửa đơn',
            icon: 'pencil',
            color: '#1890ff',
            mode: 'contained',
            onPress: () => navigation.replace('BusinessTripApplication', { mode: 'edit', applicationId })
        }] : [])
    ];

    return (
        <DetailViewScreen
            title="Chi tiết đơn công tác"
            sections={sections}
            actions={actions}
            loading={loading}
            onBack={() => navigation.goBack()}
        />
    );
}

// ============ RESIGNATION VIEW MODE ============
if (isViewMode && applicationFullData) {
    const appData = applicationFullData.data || {};
    const STATUS_LABELS = { 0: 'Chờ duyệt', 1: 'Đã duyệt', 2: 'Từ chối' };
    const STATUS_COLORS = { 0: '#fa8c16', 1: '#52c41a', 2: '#ff4d4f' };

    const sections = [
        {
            title: 'Thông tin thôi việc',
            icon: 'exit-run',
            fields: [
                { label: 'Ngày làm việc cuối', value: appData.lastWorkingDate, type: 'date', icon: 'calendar-end' },
                {
                    label: 'Lý do thôi việc',
                    value: RESIGNATION_REASONS.find(r => r.value === appData.resignationReason)?.label || appData.resignationReason || 'N/A',
                    icon: 'tag-outline'
                },
                { label: 'Chi tiết', value: appData.reasonDetail || 'N/A', icon: 'text' }
            ]
        },
        {
            title: 'Bàn giao công việc',
            icon: 'account-switch',
            fields: [
                {
                    label: 'Người nhận bàn giao',
                    value: appData.handoverToName || handoverTo?.fullName || 'Chưa xác định',
                    icon: 'account-arrow-right'
                },
                { label: 'Ghi chú bàn giao', value: appData.handoverNotes || 'Không có', icon: 'note-text' }
            ]
        },
        {
            title: 'Trạng thái & Phê duyệt',
            icon: 'information-outline',
            fields: [
                {
                    label: 'Trạng thái',
                    value: STATUS_LABELS[applicationFullData.status] || 'N/A',
                    type: 'chip',
                    chipStyle: { backgroundColor: STATUS_COLORS[applicationFullData.status] + '20' },
                    chipTextStyle: { color: STATUS_COLORS[applicationFullData.status], fontWeight: '600' },
                    icon: 'checkbox-marked-circle-outline'
                },
                ...(applicationFullData.approvedByInfo ? [{
                    label: 'Người duyệt',
                    value: applicationFullData.approvedByInfo.fullName,
                    icon: 'account-check'
                }] : []),
                ...(applicationFullData.approvedDate ? [{
                    label: 'Ngày duyệt',
                    value: applicationFullData.approvedDate,
                    type: 'datetime',
                    icon: 'calendar-check'
                }] : []),
                ...(appData.rejectReason ? [{
                    label: 'Lý do từ chối',
                    value: appData.rejectReason,
                    icon: 'close-circle-outline',
                    valueStyle: { color: '#ff4d4f' }
                }] : []),
                { label: 'Ngày tạo', value: applicationFullData.created_at, type: 'datetime', icon: 'calendar-plus' }
            ]
        }
    ];

    const actions = [
        ...(applicationFullData.status === 0 ? [{
            label: 'Chỉnh sửa đơn',
            icon: 'pencil',
            color: '#1890ff',
            mode: 'contained',
            onPress: () => navigation.replace('ResignationApplication', { mode: 'edit', applicationId })
        }] : [])
    ];

    return (
        <DetailViewScreen
            title="Chi tiết đơn thôi việc"
            sections={sections}
            actions={actions}
            loading={loading}
            onBack={() => navigation.goBack()}
        />
    );
}
