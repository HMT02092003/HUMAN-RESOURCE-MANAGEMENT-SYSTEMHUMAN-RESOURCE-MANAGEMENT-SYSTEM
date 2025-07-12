"use client";

import * as React from "react";
import { Button, Checkbox, Col, Input, Row, Typography, Form, message } from "antd";
import "@/src/cssfolder/ForgotPassword.css";
import { useRouter } from "next/navigation";
import { SendOutlined, LeftCircleOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";
import { authService } from "@/src/service/authService";

const { Title, Text, Link } = Typography;

const ForgotPassword = () => {
    const [form] = Form.useForm();
    const router = useRouter();
    const [step, setStep] = useState<'email' | 'otp' | 'newPassword'>('email');
    const [countdown, setCountdown] = useState<number>(0);

    const handleSendOTP = async () => {
        try {
            const { email } = form.getFieldsValue();
            await authService.requestPasswordReset(email);
            message.success('Link đổi mật khẩu đã được gửi đến email của bạn');
            setStep('otp');
            setCountdown(30);
        } catch (error: any) {
            message.error(error.response?.data?.error || 'Có lỗi xảy ra khi gửi link đổi mật khẩu');
        }
    };

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (countdown > 0) {
            timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
        }
        return () => clearTimeout(timer);
    }, [countdown]);

    React.useEffect(() => {
        document.body.style.margin = "0";
    }, []);

    return (
        <div className="login-container">
            <Row style={{ height: "101vh" }} gutter={[16, 0]}>
                <Col span={14} className="login-illustration">
                    <img
                        src="/logo/undraw_code_thinking_re_gka2.svg"
                        alt="Illustration"
                        className="illustration-image"
                    />
                </Col>

                <Col span={10} className="login-form">
                    <Form
                        className="form-content"
                        form={form}
                    >
                        <div className="form-header">
                            <img src="../../../logo/logo.png" alt="" />
                        </div>
                        <br />
                        <div className="form-fields">
                            <Form.Item
                                name="email"
                                label="Email"
                                labelCol={{ span: 24 }}
                                rules={[{ required: true, message: 'Vui lòng nhập email!' }, { type: 'email', message: 'Email không hợp lệ!' }]}
                            >
                                <Input
                                    placeholder="Email"
                                    className="input-field"
                                />
                            </Form.Item>
                        </div>

                        <Row>
                            <Col md={12} style={{ padding: "0 5px" }}>
                                <Form.Item>
                                    <Button 
                                        onClick={() => { router.push('/login') }}
                                        className="secondary"
                                    >
                                        <LeftCircleOutlined /> Trở lại
                                    </Button>
                                </Form.Item>
                            </Col>

                            <Col md={12} style={{ padding: "0 5px" }}>
                                <Form.Item>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        onClick={handleSendOTP}
                                        disabled={countdown > 0}
                                        className="primary"
                                    >
                                        {countdown > 0 ? (
                                            <div>{`${countdown}s`}</div>
                                        ) : (
                                            <div>
                                                <SendOutlined /> Gửi link đổi mật khẩu
                                            </div>
                                        )}
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

export default ForgotPassword;
