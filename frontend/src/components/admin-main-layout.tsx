import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    UserOutlined,
    KeyOutlined,
    LogoutOutlined,
    InfoCircleOutlined,
    CalendarOutlined,
    SettingOutlined,
    FileTextOutlined,
    ContainerOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    ApartmentOutlined,
    IdcardOutlined,
    SafetyOutlined,
    ProfileOutlined,
    ReadOutlined,
    DashboardOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined
} from '@ant-design/icons';

import type { MenuProps } from 'antd';
import { Breadcrumb, Layout, Menu, theme, Avatar, Dropdown, Modal, Button, Descriptions, message, Grid } from 'antd';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import TopBarProgress from 'react-topbar-progress-indicator';
import { decodePermissions } from '@/utils/decode-permisison';
import LoadingProgress from '@/components/LoadingProgress';
import { authService } from '@/service/authService';
import { get } from 'lodash';

const { Header, Content, Footer, Sider } = Layout;

// Type cho các loại quyền có thể kiểm tra
type PermissionType = 'read' | 'create' | 'update' | 'delete' | 'approve';

interface ExtendedMenuItem {
    key: React.Key;
    icon?: React.ReactNode;
    children?: ExtendedMenuItem[];
    label: React.ReactNode;
    permission?: string;
    permissions?: string[];
    requireAllPermissions?: boolean;
    requirePermission?: PermissionType; // Thay đổi từ requireApprove thành requirePermission
    type?: 'group' | 'divider';
    danger?: boolean;
    onClick?: () => void;
}

interface BreadcrumbItem {
    title: string;
    href?: string;
}

interface AdminMainLayoutProps {
    children: React.ReactNode;
    userData: any;
    breadcrumbItems?: BreadcrumbItem[];
    pageTitle?: string;
    pageDescription?: string;
    userPermissions?: Record<string, string>;
}

// Hàm getItem linh hoạt với tham số tùy chọn
function getItem(
    label: React.ReactNode,
    key: React.Key,
    icon: React.ReactNode,
    permissionOrChildren?: string | ExtendedMenuItem[],
    requirePermissionOrPermissions?: PermissionType | string[],
    requireAllPermissions?: boolean
): ExtendedMenuItem {
    // Xác định xem tham số thứ 4 là permission hay children
    const isChildren = Array.isArray(permissionOrChildren);

    // Xác định xem tham số thứ 5 là requirePermission hay permissions array
    const isPermissionsArray = Array.isArray(requirePermissionOrPermissions);
    const isPermissionType = typeof requirePermissionOrPermissions === 'string' &&
        ['read', 'create', 'update', 'delete', 'approve'].includes(requirePermissionOrPermissions);

    return {
        key,
        icon,
        label,
        children: isChildren ? permissionOrChildren : undefined,
        permission: !isChildren ? permissionOrChildren : undefined,
        requirePermission: isPermissionType ? requirePermissionOrPermissions as PermissionType : undefined,
        permissions: isPermissionsArray ? requirePermissionOrPermissions as string[] : undefined,
        requireAllPermissions: isPermissionsArray ? requireAllPermissions : undefined,
    };
}

const ColorList = ['#f56a00', '#7265e6', '#ffbf00', '#00a2ae'];

TopBarProgress.config({
    barColors: {
        '0': '#2196f3',
        '1.0': '#1976d2'
    },
    shadowBlur: 5
});

// Menu items với cú pháp gọn gàng
const baseMenuItemsList: ExtendedMenuItem[] = [
    // Dashboard
    getItem('Dashboard', 'home', <DashboardOutlined />),

    // Quản lí tài khoản (menu cha với điều kiện OR cho 2 quyền con)
    getItem(
        'Quản lí tài khoản',
        'account_management_parent',
        <UserOutlined />,
        [
            getItem('Quản lí người dùng', 'users', <UserOutlined />, 'users'),
            getItem('Quản lí vai trò', 'roles', <SafetyOutlined />, 'roles'),
        ],
        ['users', 'roles'], // permissions array
        false // requireAllPermissions = false (chỉ cần 1 trong 2)
    ),

    // Quản lí phòng ban
    getItem('Quản lí phòng ban', 'departments', <ApartmentOutlined />, 'departments'),

    // Quản lí chức vụ
    getItem('Quản lí chức vụ', 'chevrons', <IdcardOutlined />, 'chevrons'),

    // Quản lí hợp đồng
    getItem('Quản lí hợp đồng', 'contractTypes', <ContainerOutlined />, 'contractTypes'),

    // Danh sách đơn từ - Thêm Quản lý ca làm việc vào đây
    getItem(
        'Danh sách đơn từ',
        'applications_parent',
        <FileTextOutlined />,
        [
            getItem('Đơn từ cá nhân', 'myApplications', <ProfileOutlined />, 'applications'),
            getItem('Quản lí đơn từ', 'manageApplications', <ReadOutlined />, 'applications', 'approve'),
            getItem('Đăng ký ca', 'shiftRegistration', <CalendarOutlined />),
            getItem('Duyệt đơn đăng ký ca', 'shiftApproval', <CheckCircleOutlined />),
            getItem('Cấu hình ca', 'shiftConfiguration', <SettingOutlined />),
        ],
        ['applications']
    ),

    // Chấm công - menu cha với các submenu
    getItem(
        'Chấm công',
        'attendance_parent',
        <CalendarOutlined />,
        [
            getItem('Bảng chấm công', 'attendance', <CalendarOutlined />, 'timeAttendance'),
            getItem('Duyệt bảng chấm công', 'attendanceApproval', <CheckCircleOutlined />, 'timeAttendance', 'approve'),
        ],
        ['timeAttendance']
    ),

    // Cài đặt hệ thống
    getItem('Cài đặt hệ thống', 'settings', <SettingOutlined />, 'settings'),

    // Quản lý lương
    getItem(
        'Quản lý lương',
        'salary_parent',
        <ProfileOutlined />,
        [
            getItem('Cấu hình phụ cấp', 'salary_allowances', <ContainerOutlined />, 'salary_allowances'),
            getItem('Quản lý bảng lương', 'salaries', <FileTextOutlined />, 'salaries'),
            getItem('Bảng lương', 'personal_salary_info', <FileTextOutlined />, 'personal_salary_info'),
        ],
        ['salary_allowances']
    ),

        getItem(
        'Quản lý công việc',
        'job_management_parent',
        <ProfileOutlined />,
        [
            getItem('Quản lí hồ sơ', 'CV', <FileTextOutlined />),
            getItem('Danh sách dự án', 'projects', <FileTextOutlined />),
        ],
    ),
    
];

const isDeepEqual = (obj1: any, obj2: any): boolean => {
    if (obj1 === obj2) return true;

    if (typeof obj1 !== 'object' || obj1 === null ||
        typeof obj2 !== 'object' || obj2 === null) {
        return false;
    }

    if (Array.isArray(obj1) && Array.isArray(obj2)) {
        if (obj1.length !== obj2.length) return false;
        for (let i = 0; i < obj1.length; i++) {
            if (!isDeepEqual(obj1[i], obj2[i])) return false;
        }
        return true;
    }

    if (React.isValidElement(obj1) && React.isValidElement(obj2)) {
        return true;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
        if (!keys2.includes(key) || !isDeepEqual(obj1[key], obj2[key])) {
            return false;
        }
    }

    return true;
};

const AdminMainLayout: React.FC<AdminMainLayoutProps> = ({
    children,
    userData,
    breadcrumbItems = [],
    pageTitle,
    pageDescription,
    userPermissions = {}
}) => {
    const [collapsed, setCollapsed] = useState(false);
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.lg;
    const [isUserModalVisible, setIsUserModalVisible] = useState(false);
    const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
    const [color, setColor] = useState(() => {
        return ColorList[Math.floor(Math.random() * ColorList.length)];
    });
    const [menuItems, setMenuItems] = useState<ExtendedMenuItem[]>([]);
    const pathname = usePathname();

    const menuItemsRef = useRef(menuItems);

    useEffect(() => {
        menuItemsRef.current = menuItems;
    }, [menuItems]);

    const updateMenuItemsState = useCallback((newMenuItems: ExtendedMenuItem[]) => {
        if (!isDeepEqual(menuItemsRef.current, newMenuItems)) {
            setMenuItems(newMenuItems);
        }
    }, []);

    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    const router = useRouter();

    const filterMenuItems = useCallback((items: ExtendedMenuItem[]): ExtendedMenuItem[] => {
        console.log('🔍 [FILTER-MENU] Starting menu filter...');
        
        return items.flatMap(item => {
            console.log(`\n📌 [FILTER-MENU] Checking item: "${item.label}" (key: ${item.key})`);
            
            // Hàm helper để kiểm tra permissions
            const hasPermissionAccess = (permissionKeys: string[], requireAll: boolean = false) => {
                if (!permissionKeys || permissionKeys.length === 0) return false;

                const permissionChecks = permissionKeys.map(key => {
                    const permissionValue = userPermissions[key];
                    console.log(`  🔑 Permission key "${key}":`, permissionValue);
                    
                    // ✅ Kiểm tra kỹ hơn: value phải tồn tại và không phải null/undefined
                    if (permissionValue === undefined || permissionValue === null || permissionValue === '') {
                        console.log(`  ❌ Permission "${key}" is undefined/null/empty`);
                        return false;
                    }
                    
                    try {
                        const hasRead = decodePermissions(parseInt(permissionValue)).read;
                        console.log(`  📖 Has read permission for "${key}":`, hasRead);
                        return hasRead;
                    } catch (e) {
                        console.warn(`  ⚠️ Failed to decode permission for key: ${key}`, e);
                        return false;
                    }
                });

                const result = requireAll ?
                    permissionChecks.every(check => check) :
                    permissionChecks.some(check => check);
                
                console.log(`  📊 Permission check result (requireAll=${requireAll}):`, result);
                return result;
            };

            // Xử lý các mục con trước (nếu có)
            if (item.children) {
                const filteredChildren = filterMenuItems(item.children);

                if (filteredChildren.length > 0) {
                    return [{ ...item, children: filteredChildren }];
                }

                if (item.permissions && item.permissions.length > 0) {
                    const requireAll = item.requireAllPermissions || false;
                    if (hasPermissionAccess(item.permissions, requireAll)) {
                        return [{ ...item, children: filteredChildren }];
                    }
                    return [];
                }

                const parentPermissionKey = item.permission;
                const hasParentPermission = !parentPermissionKey ||
                    (userPermissions[parentPermissionKey] && 
                     userPermissions[parentPermissionKey] !== null && 
                     userPermissions[parentPermissionKey] !== '' &&
                     decodePermissions(parseInt(userPermissions[parentPermissionKey])).read);

                if (hasParentPermission) {
                    return [{ ...item, children: filteredChildren }];
                }

                return [];
            }

            // Xử lý các mục đơn lẻ (không có children)

            // ✅ Kiểm tra quyền cụ thể (approve, create, update, delete) nếu requirePermission được set
            if (item.requirePermission) {
                const permKey = item.permission;
                if (!permKey) return [];

                const permVal = userPermissions[permKey];
                // ✅ Kiểm tra kỹ hơn
                if (permVal === undefined || permVal === null || permVal === '') return [];

                try {
                    const decoded = decodePermissions(parseInt(permVal));
                    // Phải có cả quyền READ và quyền được yêu cầu (approve/create/update/delete)
                    if (!decoded.read || !decoded[item.requirePermission]) return [];
                    return [item];
                } catch (e) {
                    console.warn(`Failed to decode permission for requirePermission check, key: ${permKey}`, e);
                    return [];
                }
            }

            // Kiểm tra permissions array trước
            if (item.permissions && item.permissions.length > 0) {
                const requireAll = item.requireAllPermissions || false;
                return hasPermissionAccess(item.permissions, requireAll) ? [item] : [];
            }

            // Fallback - Kiểm tra single permission
            const permissionKey = item.permission;
            if (!permissionKey) {
                console.log(`  ✅ No permission required for "${item.label}" - allowing access`);
                return [item];
            }

            const permissionValue = userPermissions[permissionKey];
            console.log(`  🔑 Single permission check for "${permissionKey}":`, permissionValue);
            
            // ✅ Kiểm tra kỹ hơn
            if (permissionValue === undefined || permissionValue === null || permissionValue === '') {
                console.log(`  ❌ Permission value is undefined/null/empty - denying access`);
                return [];
            }

            try {
                const decodedPermission = decodePermissions(parseInt(permissionValue));
                const hasReadPermission = decodedPermission.read === true;
                console.log(`  📖 Has read permission:`, hasReadPermission);
                console.log(`  ${hasReadPermission ? '✅ ALLOWED' : '❌ DENIED'}`);
                return hasReadPermission ? [item] : [];
            } catch (e) {
                console.warn(`Failed to decode permission for key: ${permissionKey}`, e);
                return [];
            }
        });
    }, [userPermissions]);

    // Cập nhật Menu Items khi Permissions thay đổi
    useEffect(() => {
        console.log('🎨 [ADMIN-LAYOUT] ===== FILTERING MENU ITEMS =====');
        console.log('🔒 User permissions received:', userPermissions);
        console.log('📊 Permissions count:', userPermissions ? Object.keys(userPermissions).length : 0);
        
        if (userPermissions && Object.keys(userPermissions).length > 0) {
            console.log('✅ [ADMIN-LAYOUT] User has permissions - filtering menu...');
            const filteredItems = filterMenuItems(baseMenuItemsList);
            console.log('📋 Filtered menu items count:', filteredItems.length);
            console.log('📝 Filtered menu keys:', filteredItems.map(item => item.key));
            updateMenuItemsState(filteredItems);
        } else {
            console.warn('⚠️ [ADMIN-LAYOUT] No permissions found - showing only dashboard');
            const dashboardItem = baseMenuItemsList.find(item => item.key === 'home');
            updateMenuItemsState(dashboardItem ? [dashboardItem] : []);
        }
        console.log('==============================================');
    }, [userPermissions, updateMenuItemsState, filterMenuItems]);

    // Function to get current selected menu keys based on pathname
    const getSelectedKeys = () => {
        if (!pathname) return ['home'];

        if (pathname === '/applications/me') return ['myApplications'];
        if (pathname === '/applications') return ['manageApplications'];
        if (pathname.startsWith('/applications')) return ['applications_parent'];

        if (pathname === '/attendance/approval') return ['attendanceApproval'];
        if (pathname === '/attendance') return ['attendance'];
        if (pathname.startsWith('/attendance')) return ['attendance_parent'];

    if (pathname === '/user') return ['users'];
    if (pathname === '/roles') return ['roles'];
    if (pathname.startsWith('/salary/allowances')) return ['salary_allowances'];
    if (pathname === '/salary/management') return ['salaries'];
    if (pathname.startsWith('/salary')) return ['salary_parent'];

        const pathSegment = pathname.split('/')[1];
        return [pathSegment || 'home'];
    };

    const handleMenuClick = (e: { key: string }) => {
        switch (e.key) {
            case 'users':
                router.push('/user');
                break;
            case 'home':
                router.push('/home');
                break;
            case 'attendance':
                router.push('/attendance');
                break;
            case 'attendanceApproval':
                router.push('/attendance/approval');
                break;
            case 'departments':
                router.push('/departments');
                break;
            case 'chevrons':
                router.push('/chevrons');
                break;
            case 'contractTypes':
                router.push('/contractTypes');
                break;
            case 'roles':
                router.push('/roles');
                break;
            case 'jobs':
                router.push('/jobs');
                break;
            case 'settings':
                router.push('/settings');
                break;
            case 'manageApplications':
                router.push('/applications');
                break;
            case 'myApplications':
                router.push('/applications/me');
                break;
            case 'shiftConfiguration':
                router.push('/shifts/configuration');
                break;
            case 'shiftRegistration':
                router.push('/shifts/registration');
                break;
            case 'shiftApproval':
                router.push('/shifts/approval');
                break;
            case 'salary_allowances':
                router.push('/salary/allowances');
                break;
            case 'salaries':
                router.push('/salary/management');
                break;
            case 'personal_salary_info':
                router.push('/salary/personal');
                break;
            case 'CV':
                router.push('/CV');
                break;
            case 'projects':
                router.push('/projects');
                break;
            default:
                break;
        }
    };

    const logoutHandler = async () => {
        try {
            await authService.logout();
            message.success('Đăng xuất thành công');
            router.push('/login');
        } catch (err) {
            message.error('Đăng xuất thất bại');
        }
    };

    const changePasswordHandler = async () => {
        setIsPasswordModalVisible(false);
        router.push('/change-password');
    };

    const userMenuItems: MenuProps['items'] = [
        {
            key: '1',
            label: 'Thông tin tài khoản',
            icon: <InfoCircleOutlined />,
            onClick: () => setIsUserModalVisible(true),
        },
        {
            key: '2',
            label: 'Đổi mật khẩu',
            icon: <KeyOutlined />,
            onClick: () => setIsPasswordModalVisible(true),
        },
        {
            type: 'divider',
        },
        {
            key: '3',
            label: 'Đăng xuất',
            icon: <LogoutOutlined />,
            danger: true,
            onClick: () => Modal.confirm({
                title: 'Xác nhận đăng xuất',
                content: 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?',
                okText: 'Đăng xuất',
                cancelText: 'Hủy',
                onOk: logoutHandler
            }),
        },
    ];

    const getUserInitials = (name: any) => {
        if (!name) return 'U';
        return name.split(' ').map((word: any) => word[0]).join('').toUpperCase();
    };

    const convertToAntMenuItems = (items: ExtendedMenuItem[]): MenuProps['items'] => {
        return items.map(item => {
            const { permission, permissions, requireAllPermissions, requirePermission, ...restItem } = item;
            const menuItem: any = {
                ...restItem,
                children: item.children ? convertToAntMenuItems(item.children) : undefined
            };
            return menuItem;
        });
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <LoadingProgress>
                <Sider
                    width={220}
                    style={{
                        backgroundColor: "white",
                        position: isMobile ? 'fixed' : 'relative',
                        height: isMobile ? '100vh' : 'auto',
                        zIndex: 1000,
                        left: isMobile && collapsed ? -220 : 0,
                        transition: 'left 0.2s'
                    }}
                    collapsible={!isMobile}
                    collapsed={collapsed}
                    onCollapse={(value) => setCollapsed(value)}
                    theme="light"
                    breakpoint="lg"
                    collapsedWidth={0}
                    trigger={null}
                >
                    <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "50px" }}>
                        <img src="/logo/logo.png" alt="" style={{ width: "200px" }} />
                    </div>
                    <Menu
                        theme="light"
                        mode="inline"
                        items={convertToAntMenuItems(menuItems)}
                        onClick={handleMenuClick}
                        selectedKeys={getSelectedKeys()}
                        // Ensure salary section is open on initial load in addition to other defaults
                        defaultOpenKeys={[ 'applications_parent', 'account_management_parent', 'attendance_parent', 'shifts_parent', 'salary_parent', 'job_management_parent', pathname && pathname.startsWith('/salary') ? 'salary_parent' : '' ].filter(Boolean)}
                    />
                </Sider>

                <Layout>
                    <Header style={{
                        paddingLeft: isMobile ? "16px" : "10px",
                        paddingRight: isMobile ? "16px" : "50px",
                        background: colorBgContainer,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        position: 'sticky',
                        top: 0,
                        zIndex: 999
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Button
                                type="text"
                                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                                onClick={() => setCollapsed(!collapsed)}
                                aria-label="Toggle menu"
                            />
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: isMobile ? '8px' : '16px',
                            flexWrap: 'wrap'
                        }}>
                            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
                                <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <Avatar style={{ backgroundColor: color, verticalAlign: 'middle' }} size="default">
                                        {getUserInitials(userData?.user?.username || 'User')}
                                    </Avatar>
                                    <span style={{ marginLeft: 8, display: isMobile ? 'none' : 'inline' }}>
                                        Hi, {userData?.user?.username || 'User'}
                                    </span>
                                </div>
                            </Dropdown>
                        </div>
                    </Header>

                    <Content style={{ flex: 1 }}>
                        <div
                            style={{
                                background: "linear-gradient(to right, #e6f7ff, rgb(106, 218, 255))",
                                padding: isMobile ? "20px 16px" : "20px 50px",
                                height: isMobile ? "200px" : "250px",
                                marginBottom: isMobile ? "-60px" : "-80px",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    flexWrap: 'wrap'
                                }}
                            >
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                    <h1 style={{
                                        color: "#91caff",
                                        margin: 0,
                                        fontSize: isMobile ? "24px" : "32px",
                                        fontWeight: "bold",
                                        lineHeight: isMobile ? "1.2" : "1.4"
                                    }}>
                                        {pageTitle}
                                    </h1>
                                    <p style={{
                                        color: "#8c8c8c",
                                        margin: 0,
                                        fontSize: isMobile ? "14px" : "16px",
                                        marginTop: isMobile ? "8px" : "12px",
                                    }}>
                                        {pageDescription}
                                    </p>
                                </div>

                                <Breadcrumb
                                    style={{
                                        padding: isMobile ? "8px 16px" : "16px 28px",
                                        backgroundColor: "white",
                                        borderRadius: "25px",
                                        fontWeight: "bold",
                                        opacity: 0.6,
                                        color: "#595959",
                                        fontSize: isMobile ? "12px" : "14px",
                                        marginTop: isMobile ? "12px" : "0"
                                    }}
                                >
                                    {breadcrumbItems.map((item, index) => (
                                        <Breadcrumb.Item key={index.toString()}>
                                            {item.href ? (
                                                <Link href={item.href} style={{ fontSize: isMobile ? "12px" : "14px" }}>
                                                    {item.title}
                                                </Link>
                                            ) : (
                                                <span style={{ fontSize: isMobile ? "12px" : "14px" }}>
                                                    {item.title}
                                                </span>
                                            )}
                                        </Breadcrumb.Item>
                                    ))}
                                </Breadcrumb>
                            </div>
                        </div>

                        <div
                            style={{
                                padding: isMobile ? 16 : 24,
                                background: colorBgContainer,
                                borderRadius: borderRadiusLG,
                                margin: isMobile ? "0" : "0 24px",
                                maxWidth: isMobile ? "100%" : "none",
                                width: isMobile ? "100%" : "auto"
                            }}
                        >
                            {children}
                        </div>
                    </Content>

                    <Footer style={{ textAlign: 'center' }}>
                        QLNS ©{new Date().getFullYear()} Created by Hoàng Mạnh Toàn
                    </Footer>
                </Layout>

                {isMobile && !collapsed && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            zIndex: 999,
                        }}
                        onClick={() => setCollapsed(true)}
                    />
                )}
            </LoadingProgress>

            <Modal
                title="Thông tin tài khoản"
                open={isUserModalVisible}
                onCancel={() => setIsUserModalVisible(false)}
                footer={[
                    <Button key="back" onClick={() => setIsUserModalVisible(false)}>
                        Đóng
                    </Button>
                ]}
            >
                <Descriptions column={1}>
                    <Descriptions.Item label="Tên đăng nhập">{userData?.user?.username || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Họ và tên">{userData?.user?.fullName || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Email">{userData?.user?.email || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Ngày tạo">{userData?.user?.createdAt ? new Date(userData.user.createdAt).toLocaleDateString() : 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Số điện thoại">{userData?.user?.phone || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Vai trò">{userData?.user?.role || 'N/A'}</Descriptions.Item>
                </Descriptions>
            </Modal>

            <Modal
                title="Đổi mật khẩu"
                open={isPasswordModalVisible}
                onCancel={() => setIsPasswordModalVisible(false)}
                footer={[
                    <Button key="back" onClick={() => setIsPasswordModalVisible(false)}>
                        Hủy
                    </Button>,
                    <Button key="submit" type="primary" onClick={changePasswordHandler}>
                        Đồng ý
                    </Button>,
                ]}
            >
                <p>Bạn có chắc chắn muốn đổi mật khẩu không?</p>
            </Modal>
        </Layout>
    );
};

export default AdminMainLayout;