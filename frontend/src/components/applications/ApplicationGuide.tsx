import React, { useState } from 'react';
import { Card, Typography, Steps, Alert, Button, Space, Collapse, Divider } from 'antd';
import {
    InfoCircleOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    FileTextOutlined,
    EyeOutlined,
    EyeInvisibleOutlined,
    ExclamationCircleOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface GuideProps {
    type: 'leave' | 'overtime' | 'shift' | 'business-trip' | 'forgot-checkin' | 'resignation';
}

const ApplicationGuide: React.FC<GuideProps> = ({ type }) => {
    const [visible, setVisible] = useState(false);

    const getGuideContent = () => {
        switch (type) {
            case 'leave':
                return {
                    title: 'Hướng dẫn tạo đơn xin nghỉ phép',
                    icon: <FileTextOutlined style={{ color: '#1890ff' }} />,
                    steps: [
                        {
                            title: 'Chọn loại nghỉ phép',
                            description: 'Lựa chọn loại nghỉ phù hợp: cá nhân, ốm, lễ tết, thai sản hoặc khác',
                            icon: <CheckCircleOutlined />,
                        },
                        {
                            title: 'Chọn ngày nghỉ',
                            description: 'Chọn ngày bắt đầu và kết thúc nghỉ phép. Hệ thống sẽ tự động tính số ngày nghỉ',
                            icon: <ClockCircleOutlined />,
                        },
                        {
                            title: 'Nhập lý do',
                            description: 'Mô tả chi tiết lý do nghỉ phép',
                            icon: <FileTextOutlined />,
                        },
                    ],
                    tips: [
                        'Đơn nghỉ phép cần được gửi trước ít nhất 1 ngày so với ngày nghỉ',
                        'Kiểm tra số ngày phép còn lại trước khi gửi đơn',
                        'Đối với nghỉ ốm có thể gửi đơn trong ngày',
                        'Nghỉ thai sản cần có giấy tờ y tế kèm theo',
                    ],
                };

            case 'overtime':
                return {
                    title: 'Hướng dẫn đăng ký tăng ca',
                    icon: <ClockCircleOutlined style={{ color: '#fa8c16' }} />,
                    steps: [
                        {
                            title: 'Chọn ngày tăng ca',
                            description: 'Chọn ngày muốn đăng ký tăng ca (có thể chọn nhiều ngày)',
                            icon: <CheckCircleOutlined />,
                        },
                        {
                            title: 'Thời gian tăng ca',
                            description: 'Nhập giờ bắt đầu và số giờ tăng ca. Hệ thống sẽ tự động tính giờ kết thúc',
                            icon: <ClockCircleOutlined />,
                        },
                        {
                            title: 'Lý do tăng ca',
                            description: 'Mô tả lý do cần tăng ca và công việc cần hoàn thành',
                            icon: <FileTextOutlined />,
                        },
                    ],
                    tips: [
                        'Đăng ký tăng ca trước ít nhất 2 giờ so với thời gian bắt đầu',
                        'Số giờ tăng ca tối đa 4 tiếng/ngày',
                        'Tăng ca vào cuối tuần và lễ tết được tính lương cao hơn',
                        'Cần có sự phê duyệt của quản lý trực tiếp',
                    ],
                };

            case 'shift':
                return {
                    title: 'Hướng dẫn đăng ký ca làm việc',
                    icon: <ClockCircleOutlined style={{ color: '#52c41a' }} />,
                    steps: [
                        {
                            title: 'Chọn thời gian',
                            description: 'Chọn ngày muốn đăng ký ca làm việc',
                            icon: <ClockCircleOutlined />,
                        },
                        {
                            title: 'Chọn ca làm việc',
                            description: 'Lựa chọn ca làm việc phù hợp',
                            icon: <CheckCircleOutlined />,
                        },
                        {
                            title: 'Lý do đăng ký',
                            description: 'Mô tả lý do cần đăng ký ca làm việc mới',
                            icon: <FileTextOutlined />,
                        },
                    ],
                    tips: [
                        'Đăng ký ca làm việc trước ít nhất 1 ngày',
                    ],
                };

            case 'business-trip':
                return {
                    title: 'Hướng dẫn tạo đơn công tác',
                    icon: <FileTextOutlined style={{ color: '#722ed1' }} />,
                    steps: [
                                            {
                            title: 'Thời gian công tác',
                            description: 'Chọn ngày bắt đầu và kết thúc công tác',
                            icon: <ClockCircleOutlined />,
                        },
                        {
                            title: 'Thông tin địa điểm',
                            description: 'Nhập địa điểm công tác chi tiết và mục đích chuyến đi',
                            icon: <CheckCircleOutlined />,
                        },
                        {
                            title: 'Chi phí dự kiến',
                            description: 'Ước tính chi phí di chuyển, ăn ở và các khoản khác',
                            icon: <FileTextOutlined />,
                        },
                    ],
                    tips: [
                        'Gửi đơn công tác trước ít nhất 3 ngày',
                        'Chuẩn bị đầy đủ giấy tờ cần thiết',
                        'Báo cáo kết quả công tác sau khi về',
                        'Lưu giữ hóa đơn chi tiết để hoàn ứng',
                    ],
                };

            case 'forgot-checkin':
                return {
                    title: 'Hướng dẫn tạo đơn giải trình quên chấm công',
                    icon: <ClockCircleOutlined style={{ color: '#f5222d' }} />,
                    steps: [
                        {
                            title: 'Chọn ngày quên chấm công',
                            description: 'Chọn ngày cụ thể mà bạn đã quên chấm công',
                            icon: <CheckCircleOutlined />,
                        },
                        {
                            title: 'Chọn thời gian',
                            description: 'Nhập thời gian chính xác mà bạn có mặt tại công ty',
                            icon: <ClockCircleOutlined />,
                        },
                        {
                            title: 'Giải thích lý do',
                            description: 'Mô tả lý do vì sao bạn quên chấm công và tình huống xảy ra',
                            icon: <FileTextOutlined />,
                        },
                    ],
                    tips: [
                        'Đơn giải trình cần được gửi trong vòng 48 giờ kể từ khi quên chấm công',
                        'Cung cấp bằng chứng nếu có (email, tin nhắn, ảnh...)',
                        'Liên hệ với đồng nghiệp để làm chứng nếu cần thiết',
                        'Lý do cần rõ ràng và trung thực',
                    ],
                };

            case 'resignation':
                return {
                    title: 'Hướng dẫn tạo đơn xin thôi việc',
                    icon: <ExclamationCircleOutlined style={{ color: '#f5222d' }} />,
                    steps: [
                        {
                            title: 'Lý do thôi việc',
                            description: 'Chọn lý do chính xác và mô tả chi tiết lý do muốn thôi việc',
                            icon: <CheckCircleOutlined />,
                        },
                        {
                            title: 'Ngày làm việc cuối cùng',
                            description: 'Chọn ngày cuối cùng bạn muốn làm việc tại công ty',
                            icon: <ClockCircleOutlined />,
                        },
                        {
                            title: 'Bàn giao công việc',
                            description: 'Lập kế hoạch bàn giao công việc và tài liệu cho người tiếp nhận',
                            icon: <FileTextOutlined />,
                        },
                    ],
                    tips: [
                        'Thông báo thôi việc trước ít nhất 30 ngày (theo hợp đồng lao động)',
                        'Hoàn thành tất cả công việc được giao và bàn giao đầy đủ',
                        'Trả lại tài sản công ty trước ngày nghỉ việc',
                        'Xử lý các thủ tục về bảo hiểm và lương thưởng',
                    ],
                };

            default:
                return {
                    title: 'Hướng dẫn sử dụng',
                    icon: <InfoCircleOutlined style={{ color: '#1890ff' }} />,
                    steps: [],
                    tips: ['Vui lòng điền đầy đủ thông tin', 'Kiểm tra kỹ trước khi gửi đơn'],
                };
        }
    };

    const guide = getGuideContent();

    if (!visible) {
        return (
            <Card
                size="small"
                style={{ marginBottom: '16px', borderColor: '#1890ff' }}
                bodyStyle={{ padding: '12px' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Space>
                        {guide.icon}
                        <Text strong style={{ color: '#1890ff' }}>
                            Cần hướng dẫn cách điền đơn?
                        </Text>
                    </Space>
                    <Button
                        type="link"
                        icon={<EyeOutlined />}
                        onClick={() => setVisible(true)}
                    >
                        Xem hướng dẫn
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <Card
            title={
                <Space>
                    {guide.icon}
                    <span>{guide.title}</span>
                </Space>
            }
            extra={
                <Button
                    type="text"
                    icon={<EyeInvisibleOutlined />}
                    onClick={() => setVisible(false)}
                >
                    Ẩn
                </Button>
            }
            style={{ marginBottom: '24px' }}
        >
            <Steps
                direction="vertical"
                size="small"
                items={guide.steps}
                style={{ marginBottom: '16px' }}
            />

            <Divider orientation="left" orientationMargin="0">
                <Text strong style={{ color: '#fa8c16' }}>💡 Lưu ý quan trọng</Text>
            </Divider>

            <div style={{ backgroundColor: '#fff7e6', padding: '12px', borderRadius: '6px', border: '1px solid #ffd591' }}>
                {guide.tips.map((tip, index) => (
                    <Paragraph key={index} style={{ margin: 0, marginBottom: index < guide.tips.length - 1 ? '8px' : 0 }}>
                        <Text>• {tip}</Text>
                    </Paragraph>
                ))}
            </div>
        </Card>
    );
};

export default ApplicationGuide;
