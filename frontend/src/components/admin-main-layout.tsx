import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    ShoppingCartOutlined,
    AppstoreOutlined,
    TeamOutlined,
    UserOutlined,
    UnorderedListOutlined,
    GlobalOutlined,
    PieChartOutlined,
    BellOutlined,
    KeyOutlined,
    LogoutOutlined,
    InfoCircleOutlined,
    HomeOutlined,
    CalendarOutlined,
    SettingOutlined,
    FileTextOutlined
} from '@ant-design/icons';

import type { MenuProps } from 'antd';
import { Breadcrumb, Layout, Menu, theme, Avatar, Dropdown, Badge, Modal, Button, Descriptions, message, notification, Popconfirm, Grid } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import TopBarProgress from 'react-topbar-progress-indicator';
import { decodePermissions } from '@/utils/decode-permisison';
import LoadingProgress from '@/components/LoadingProgress';
import { authService } from '@/service/authService';

const { Header, Content, Footer, Sider } = Layout;

// Extend the MenuItem type to include our custom permission property
// Extended type to include our custom permission property
interface ExtendedMenuItem {
    key: React.Key;
    icon?: React.ReactNode;
    children?: ExtendedMenuItem[];
    label: React.ReactNode;
    permission?: string;
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

function getItem(
    label: React.ReactNode,
    key: React.Key,
    icon?: React.ReactNode,
    children?: ExtendedMenuItem[],
    permission?: string,
): ExtendedMenuItem {
    return {
        key,
        icon,
        children,
        label,
        permission,
    };
}

const ColorList = ['#f56a00', '#7265e6', '#ffbf00', '#00a2ae'];

// Cấu hình cho thanh tiến trình
TopBarProgress.config({
    barColors: {
        '0': '#2196f3',
        '1.0': '#1976d2'
    },
    shadowBlur: 5
});

// Define menu items with their required permissions
const menuItemsList: ExtendedMenuItem[] = [
    getItem('Dashboard', 'home', <PieChartOutlined />, undefined, 'home'),
    getItem('Quản lí người dùng', 'users', <UserOutlined />, undefined, 'users'),
    getItem('Quản lí phòng ban', 'departments', <UserOutlined />, undefined, 'departments'),
    getItem('Quản lí chức vụ', 'chevrons', <ShoppingCartOutlined />, undefined, 'chevrons'),
    getItem('Quản lí hợp đồng', 'contractTypes', <AppstoreOutlined />, undefined, 'contractTypes'),
    getItem('Quản lí vai trò', 'roles', <TeamOutlined />, undefined, 'roles'),
    getItem('Quản lí đơn từ', 'applications', <FileTextOutlined />, undefined, 'applications'),
    getItem('Chấm công', 'attendance', <CalendarOutlined />, undefined, ''),
    getItem('Cài đăt hệ thống', 'settings', <SettingOutlined />, undefined, ''),
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

    // Special handling for React elements: consider them equal if both are valid React elements.
    // This prevents deep comparison into dynamically created JSX elements which would always be new references.
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

const AdminMainLayout: React.FC<AdminMainLayoutProps> = ({ children, userData, breadcrumbItems = [], pageTitle, pageDescription, userPermissions = {} }) => {
    const [collapsed, setCollapsed] = useState(false);
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.lg;
    const [isUserModalVisible, setIsUserModalVisible] = useState(false);
    const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
    const [color, setColor] = useState(() => {
        return ColorList[Math.floor(Math.random() * ColorList.length)];
    });
    const [notifications, setNotifications] = useState<{ title: string; description: string }[]>([]);
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

    // Filter menu items based on user permissions
    useEffect(() => {
        console.log("userPermissions=====================", userPermissions);
        if (userPermissions && Object.keys(userPermissions).length > 0) {
            // Filter menu items based on permissions
            const filteredItems = menuItemsList.filter(item => {
                // Always show Dashboard
                if (item.key === 'home') return true;

                // Check if user has permission for this menu item
                const permissionKey = item.permission;
                if (!permissionKey) return true; // If no permission required, show it

                const permissionValue = userPermissions[permissionKey];
                if (!permissionValue) return false; // No permission for this item

                // Check if user has at least read permission
                const decodedPermission = decodePermissions(parseInt(permissionValue));
                return decodedPermission.read === true;
            });

            updateMenuItemsState(filteredItems);
        } else {
            // If no permissions data, only show Dashboard
            updateMenuItemsState([menuItemsList[0]]);
        }
    }, [userPermissions, updateMenuItemsState]);

    useEffect(() => {
        // Mô phỏng có thông báo trong hệ thống
        const fakeDemoNotifications = [
            {
                title: 'Đơn hàng mới',
                description: 'Có đơn hàng mới cần xử lý'
            },
            {
                title: 'Người dùng mới đăng ký',
                description: 'Có người dùng mới đăng ký vào hệ thống'
            },
            {
                title: 'Cảnh báo hệ thống',
                description: 'Dung lượng lưu trữ sắp đầy'
            }
        ];

        // Lưu thông báo demo vào state để hiển thị
        setNotifications(fakeDemoNotifications);
    }, []);

    const handleMenuClick = (e: { key: string }) => {
        // Sử dụng router để chuyển trang
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
            case 'settings':
                router.push('/settings');
                break;
            case 'applications':
                router.push('/applications');
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
        // Giả sử điều hướng đến trang đổi mật khẩu
        router.push('/change-password');
    };

    // Hiển thị menu dropdown cho người dùng
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

    // Hiển thị dropdown thông báo
    const notificationItems = notifications.map((notification, index) => ({
        key: index.toString(),
        label: (
            <div>
                <div style={{ fontWeight: 'bold' }}>{notification.title}</div>
                <div>{notification.description}</div>
            </div>
        )
    }));

    const notificationMenu: MenuProps = {
        items: notificationItems,
    };

    // Lấy initials từ tên người dùng
    const getUserInitials = (name: any) => {
        if (!name) return 'U';
        return name.split(' ').map((word: any) => word[0]).join('').toUpperCase();
    };

    // Convert our custom ExtendedMenuItem items to standard MenuItem type that Ant Design expects
    const convertToAntMenuItems = (items: ExtendedMenuItem[]): MenuProps['items'] => {
        return items.map(item => {
            const { permission, ...restItem } = item;
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
                    style={{
                        backgroundColor: "white",
                        position: isMobile ? 'fixed' : 'relative',
                        height: isMobile ? '100vh' : 'auto',
                        zIndex: 1000,
                        left: isMobile && collapsed ? -200 : 0,
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
                        defaultSelectedKeys={['1']}
                        mode="inline"
                        items={convertToAntMenuItems(menuItems)}
                        onClick={handleMenuClick}
                        selectedKeys={[pathname?.split('/')[1] || 'home']}
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
                        {/* Dynamic Breadcrumb */}
                        <div
                            style={{
                                background: "linear-gradient(to right, #e6f7ff, rgb(106, 218, 255))",
                                padding: isMobile ? "20px 16px" : "20px 50px",
                                height: isMobile ? "160px" : "200px",
                                marginBottom: isMobile ? "-60px" : "-90px",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: isMobile ? "flex-start" : "space-between",
                                    alignItems: "center",
                                    gap: 12,
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
                                        marginTop: isMobile ? "8px" : "12px"
                                    }}>
                                        {pageDescription}
                                    </p>
                                </div>

                                {!isMobile && (
                                    <Breadcrumb style={{ padding: "16px 28px", backgroundColor: "white", borderRadius: "25px", fontWeight: "bold", opacity: 0.6, color: "#595959" }}>
                                        {breadcrumbItems.map((item, index) => (
                                            <Breadcrumb.Item key={index.toString()}>
                                                {item.href ? (
                                                    <Link href={item.href}>{item.title}</Link>
                                                ) : (
                                                    item.title
                                                )}
                                            </Breadcrumb.Item>
                                        ))}
                                    </Breadcrumb>
                                )}
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

                {/* Overlay for mobile menu */}
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

            {/* Modal hiển thị thông tin người dùng */}
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
                    <Descriptions.Item label="Họ và tên">{userData?.user?.lastName || 'N/A'} {userData?.user?.firstName || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Email">{userData?.user?.email || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Ngày tạo">{userData?.user?.birthday ? new Date(userData.user.createdAt).toLocaleDateString() : 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Số điện thoại">{userData?.user?.phone || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Vai trò">{userData?.user?.role || 'N/A'}</Descriptions.Item>
                </Descriptions>
            </Modal>

            {/* Modal xác nhận đổi mật khẩu */}
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