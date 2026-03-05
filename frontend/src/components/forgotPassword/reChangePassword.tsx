"use client";

import * as React from "react";
import { Button, Col, Input, Row, Typography, Form, message, Alert } from "antd";
import { CheckCircleOutlined, LockOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import NextLink from "next/link";
import "@/styles/login.css";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { authService } from "@/service/authService";

const { Title, Text } = Typography;

const ReChangePassword = () => {
    const [form] = Form.useForm();
    const router = useRouter();
    const searchParams = useSearchParams();
    const username = searchParams.get("username");
    const otp = searchParams.get("otp");

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!username || !otp) {
            message.error("Thiếu thông tin xác thực. Vui lòng thử lại.");
            router.push("/forgotPassword");
        }
    }, [username, otp, router]);

    const handleResetPassword = async (values: any) => {
        setLoading(true);
        try {
            const response = await authService.resetPassword({
                username: username!,
                otp: otp!,
                newPassword: values.newPassword,
                confirmPassword: values.confirmNewPassword,
            });

            if (response.success) {
                setSuccess(true);
                message.success("Đặt lại mật khẩu thành công!");

                setTimeout(() => {
                    router.push("/login");
                }, 2000);
            } else {
                message.error(response.message || "Có lỗi xảy ra");
            }
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || error.message || "Đặt lại mật khẩu thất bại";
            message.error(errorMsg);
        } finally {
            setLoading(false);
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
                            <h1 className="welcome-title">Chào mừng trở lại!</h1>
                            <p className="welcome-subtitle">Hệ thống quản lý nhân sự hiện đại và thông minh</p>
                        </div>
                        <div className="illustration-wrapper">
                            <img src="/logo/undraw_in_the_office_re_jtgc.svg" alt="HR Management Illustration" className="illustration-image" />
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
                                <Title level={2} className="login-title">Đặt lại mật khẩu</Title>
                                <Text className="login-subtitle">Tạo mật khẩu mới cho tài khoản của bạn</Text>
                            </div>

                            <Form form={form} onFinish={handleResetPassword} layout="vertical" size="large" className="login-form">
                                {success ? (
                                    <Alert
                                        message="Đặt lại mật khẩu thành công!"
                                        description={
                                            <div>
                                                <p>Bạn có thể đăng nhập với mật khẩu mới.</p>
                                                <p style={{ marginTop: "10px", fontSize: "12px", color: "#52c41a" }}>
                                                    <CheckCircleOutlined /> Chuyển hướng đến trang đăng nhập...
                                                </p>
                                            </div>
                                        }
                                        type="success"
                                        showIcon
                                        style={{ marginBottom: "20px" }}
                                    />
                                ) : (
                                    <>
                                        <div className="form-fields">
                                            <div style={{ marginBottom: 12, color: "#666" }}>
                                                {username && (
                                                    <p>
                                                        Đổi mật khẩu cho tài khoản: <strong>{username}</strong>
                                                    </p>
                                                )}
                                            </div>

                                            <Form.Item
                                                label="Mật khẩu mới"
                                                name="newPassword"
                                                labelCol={{ span: 24 }}
                                                rules={[{ required: true, message: "Vui lòng nhập mật khẩu mới!" }, { min: 8, message: "Mật khẩu phải có ít nhất 8 ký tự!" }, { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/, message: "Mật khẩu phải chứa chữ hoa, chữ thường, số và ký tự đặc biệt" }]}
                                            >
                                                <Input.Password prefix={<LockOutlined className="input-icon" />} placeholder="Nhập mật khẩu mới" className="input-field" autoFocus />
                                            </Form.Item>

                                            <Form.Item
                                                label="Xác nhận mật khẩu"
                                                name="confirmNewPassword"
                                                labelCol={{ span: 24 }}
                                                dependencies={["newPassword"]}
                                                rules={[
                                                    { required: true, message: "Vui lòng nhập lại mật khẩu mới!" },
                                                    ({ getFieldValue }) => ({
                                                        validator(_, value) {
                                                            if (!value || getFieldValue("newPassword") === value) {
                                                                return Promise.resolve();
                                                            }
                                                            return Promise.reject(new Error("Mật khẩu xác nhận không khớp!"));
                                                        },
                                                    }),
                                                ]}
                                            >
                                                <Input.Password prefix={<LockOutlined className="input-icon" />} placeholder="Nhập lại mật khẩu mới" className="input-field" />
                                            </Form.Item>

                                            <Alert message="Lưu ý" description="Mật khẩu nên bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt." type="info" showIcon style={{ marginBottom: "20px", fontSize: "12px" }} />
                                        </div>

                                        <Form.Item style={{ marginBottom: 0 }}>
                                            <Row gutter={[12, 12]}>
                                                <Col xs={24} md={12}>
                                                    <Button onClick={() => router.push('/login')} className="login-button secondary" size="large" block disabled={loading} icon={<ArrowLeftOutlined />}>
                                                        Quay lại đăng nhập
                                                    </Button>
                                                </Col>
                                                <Col xs={24} md={12}>
                                                    <Button type="primary" htmlType="submit" loading={loading} block className="login-button" icon={<CheckCircleOutlined />}>
                                                        Đặt lại mật khẩu
                                                    </Button>
                                                </Col>
                                            </Row>
                                        </Form.Item>
                                    </>
                                )}
                            </Form>

                            <div className="forgot-password-section" style={{ marginTop: 12 }}>
                                <NextLink href="/forgotPassword" className="forgot-password-link">Quay lại gửi mã</NextLink>
                            </div>
                        </div>
                    </div>
                </Col>
            </Row>
        </div>
    );
};

export default ReChangePassword;

