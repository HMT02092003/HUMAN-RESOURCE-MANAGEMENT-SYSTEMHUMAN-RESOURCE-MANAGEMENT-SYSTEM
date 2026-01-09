"use client";

import * as React from "react";
import { Button, Col, Input, Row, Typography, Form, message } from "antd";
import { UserOutlined, SendOutlined, LeftCircleOutlined } from "@ant-design/icons";
import NextLink from "next/link";
import "@/styles/login.css";
import { useRouter } from "next/navigation";
import { authService } from "@/service/authService";

const { Title, Text } = Typography;

const ForgotPassword = () => {
    const [form] = Form.useForm();
    const router = useRouter();
    const [loading, setLoading] = React.useState(false);
    const [otpSent, setOtpSent] = React.useState(false);
    const [username, setUsername] = React.useState('');
    const [verifyingOtp, setVerifyingOtp] = React.useState(false);

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            const response = await authService.requestPasswordReset(values.username);
            if (response && response.success) {
                message.success('Mã xác thực đã được gửi đến email của bạn!');
                setUsername(values.username);
                setOtpSent(true);
            } else {
                message.error(response?.message || 'Có lỗi xảy ra');
            }
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Không thể kết nối đến server.');
        } finally {
            setLoading(false);
        }
    };

    const onVerifyOtp = async (values: any) => {
        setVerifyingOtp(true);
        try {
            const response = await authService.verifyOTP(username, values.otp);
            if (response && response.success) {
                message.success('Xác thực OTP thành công!');
                // Navigate to reset password page with username and OTP in URL
                router.push(`/forgotPassword/reChangePassword?username=${encodeURIComponent(username)}&otp=${encodeURIComponent(values.otp)}`);
            } else {
                message.error(response?.message || 'Mã OTP không chính xác');
            }
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Mã OTP không chính xác');
        } finally {
            setVerifyingOtp(false);
        }
    };

    React.useEffect(() => {
        document.body.style.margin = "0";
    }, []);

    return (
        <div className="login-container">
            <div className="login-background">
                <div className="floating-shapes">
                    <div className="shape shape-1"></div>
                    <div className="shape shape-2"></div>
                    <div className="shape shape-3"></div>
                    <div className="shape shape-4"></div>
                </div>
            </div>

            <Row style={{ height: "100vh", width: "100%" }} gutter={0}>
                <Col xs={0} sm={0} md={12} lg={14} className="login-illustration">
                    <div className="illustration-content">
                        <div className="welcome-text">
                            <h1 className="welcome-title">Quên mật khẩu</h1>
                            <p className="welcome-subtitle">Nhập tên đăng nhập để nhận link đặt lại mật khẩu qua email</p>
                        </div>
                        <div className="illustration-wrapper">
                            <img
                                src="/logo/undraw_in_the_office_re_jtgc.svg"
                                alt="Illustration"
                                className="illustration-image"
                            />
                        </div>
                    </div>
                </Col>

                <Col xs={24} sm={24} md={12} lg={10} className="login-form-section">
                    <div className="login-card">
                        <div className="form-content">
                            <div className="login-header">
                                <div className="login-logo">
                                    <img src="/logo/logo.png" alt="NEXTHR Logo" />
                                </div>
                                <Title level={2} className="login-title">Quên mật khẩu</Title>
                                <Text className="login-subtitle">Nhập tên đăng nhập để nhận link đặt lại mật khẩu</Text>
                            </div>

                            <Form
                                form={form}
                                onFinish={otpSent ? onVerifyOtp : onFinish}
                                layout="vertical"
                                size="large"
                                className="login-form"
                            >
                                <div className="form-fields">
                                    <Form.Item
                                        name="username"
                                        rules={[
                                            { required: true, message: 'Vui lòng nhập tên đăng nhập!' },
                                            { min: 3, message: 'Tên đăng nhập phải có ít nhất 3 ký tự!' }
                                        ]}
                                    >
                                        <Input
                                            prefix={<UserOutlined className="input-icon" />}
                                            placeholder="Tên đăng nhập"
                                            className="input-field"
                                            autoComplete="username"
                                            disabled={otpSent}
                                        />
                                    </Form.Item>

                                    {otpSent && (
                                        <Form.Item
                                            name="otp"
                                            rules={[
                                                { required: true, message: 'Vui lòng nhập mã OTP!' },
                                                { len: 6, message: 'Mã OTP phải có 6 chữ số!' }
                                            ]}
                                        >
                                            <Input
                                                prefix={<SendOutlined className="input-icon" />}
                                                placeholder="Nhập mã OTP (6 chữ số)"
                                                className="input-field"
                                                maxLength={6}
                                                autoFocus
                                            />
                                        </Form.Item>
                                    )}
                                </div>

                                <Form.Item style={{ marginBottom: 0 }}>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        loading={otpSent ? verifyingOtp : loading}
                                        block
                                        className="login-button"
                                    >
                                        <span className="button-text">
                                            {otpSent 
                                                ? (verifyingOtp ? 'Đang xác thực...' : 'Xác thực OTP')
                                                : (loading ? 'Đang gửi...' : 'Gửi mã xác thực')
                                            }
                                        </span>
                                    </Button>
                                </Form.Item>
                            </Form>

                            <div className="forgot-password-section">
                                <NextLink href="/login" className="forgot-password-link">
                                    <LeftCircleOutlined /> Quay lại đăng nhập
                                </NextLink>
                            </div>
                        </div>
                    </div>
                </Col>
            </Row>
        </div>
    );
};

export default ForgotPassword;
