"use client";

import * as React from "react";
import { Button, Checkbox, Col, Input, Row, Typography, Form, message } from "antd";
import "@/src/cssfolder/ForgotPassword.css";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircleOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";
import { authService } from "@/src/service/authService";

const { Title, Text, Link } = Typography;

const ReChangePassword = () => {
    const [form] = Form.useForm();
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    useEffect(() => {
        if (!token) {
            message.error('Token không hợp lệ');
            router.push('/login');
        }
    }, [token, router]);

    const handleResetPassword = async () => {
        try {
            const { newPassword } = await form.getFieldsValue();
            await authService.resetPassword({ token: token!, newPassword });
            message.success('Đặt lại mật khẩu thành công');
            router.push('/login');
        } catch (error: any) {
            message.error(error.response?.data?.error || 'Đặt lại mật khẩu thất bại');
        }
    };

    React.useEffect(() => {
        document.body.style.margin = "0";
    }, []);

    return (
        <div className="login-container">
            <Row style={{ height: "101vh" }} gutter={[16, 0]}>
                <Col span={14} className="login-illustration">
                    <img
                        src="/logo/undraw_dev_focus_re_6iwt.svg"
                        alt="Illustration"
                        className="illustration-image"
                        style={{ width: 700 }}
                    />
                </Col>

                <Col span={10} className="login-form">
                    <Form
                        className="form-content"
                        form={form}
                    >
                        <div style={{ display: "flex", width: "100%", justifyContent: "center", alignItems: "center" }}>
                            <img src="../../../logo/logo.png" alt="" style={{ width: "300px" }} />
                        </div>
                        <br />
                        <div className="form-fields">
                            <Col md={24}>
                                <Form.Item
                                    label="Mật khẩu mới:"
                                    name="newPassword"
                                    labelCol={{ span: 24 }}
                                    rules={[{ required: true, message: 'Vui lòng nhập mật khẩu mới!' }, { message: 'Mật khẩu không hợp lệ!' }]}
                                >
                                    <Input.Password style={{ height:"50px" }} />
                                </Form.Item>
                            </Col>

                            <Col md={24}>
                                <Form.Item
                                    label="Nhập lại mật khẩu mới:"
                                    name="confirmNewPassword"
                                    labelCol={{ span: 24 }}
                                    dependencies={['newPassword']}
                                    rules={[
                                        {
                                            required: true,
                                            message: 'Vui lòng nhập lại mật khẩu mới!',
                                        },
                                        ({ getFieldValue }) => ({
                                            validator(_, value) {
                                                if (!value || getFieldValue('newPassword') === value) {
                                                    return Promise.resolve();
                                                }
                                                return Promise.reject(new Error('Mật khẩu mới không khớp!'));
                                            },
                                        }),
                                    ]}
                                >
                                    <Input.Password style={{ height:"50px" }} />
                                </Form.Item>
                            </Col>
                        </div>

                        <Row>
                            <Col md={12} style={{ padding: "0 5px" }}>
                                <Form.Item>
                                    <Button 
                                        onClick={() => { router.push('/login') }}
                                        className="secondary"
                                    >
                                        Trở lại
                                    </Button>
                                </Form.Item>
                            </Col>

                            <Col md={12} style={{ padding: "0 5px" }}>
                                <Form.Item>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        onClick={handleResetPassword}
                                        className="primary"
                                    >
                                        <CheckCircleOutlined /> Đổi mật khẩu
                                    </Button>
                                </Form.Item>
                            </Col>
                        </Row>
                    </Form>
                </Col>
            </Row>
        </div>
    );
};

export default ReChangePassword;

