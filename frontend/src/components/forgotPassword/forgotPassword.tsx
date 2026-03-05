"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import {
    UserOutlined, ArrowLeftOutlined, LoadingOutlined,
    CheckCircleOutlined, LockOutlined, KeyOutlined
} from '@ant-design/icons';
import { message, Input, Button, Form } from 'antd';
import '@/styles/login.css';
import { authService } from '@/service/authService';

const ThreeBackground = dynamic(() => import('@/components/ui/ThreeBackground'), {
    ssr: false,
});

const ForgotPassword = () => {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2>(1);
    const [loading, setLoading] = useState(false);
    const [username, setUsername] = useState('');

    // Step 1: Request OTP
    const handleRequestOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username) {
            message.warning("Vui lòng nhập tên đăng nhập");
            return;
        }

        setLoading(true);
        try {
            const res = await authService.requestPasswordReset(username);
            if (res.success) {
                message.success(res.message);
                setStep(2);
            } else {
                // If service is unavailable or user invalid (but backend returns 200 for security usually, unless 503)
                // If 503 from backend, it will throw in axios and catch below or return status
                message.info(res.message);
                if (res.message.includes("đã được gửi")) {
                    setStep(2);
                }
            }
        } catch (error: any) {
            // Handle specific errors
            const msg = error.response?.data?.message || "Không thể gửi yêu cầu.";
            if (error.response?.status === 503) {
                // Service unavailable
                message.error("Dịch vụ email đang bảo trì. Vui lòng thử lại sau.");
            } else {
                message.error(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Reset Password with OTP
    const handleResetPassword = async (values: any) => {
        setLoading(true);
        try {
            const res = await authService.resetPassword({
                username: username,
                otp: values.otp,
                newPassword: values.newPassword,
                confirmPassword: values.confirmPassword
            });

            if (res.success) {
                message.success("Đặt lại mật khẩu thành công!");
                setTimeout(() => {
                    router.push('/login');
                }, 1500);
            } else {
                message.error(res.message || "Không thể đặt lại mật khẩu");
            }
        } catch (error: any) {
            const msg = error.response?.data?.message || "Lỗi đặt lại mật khẩu";
            message.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <ThreeBackground />

            <div className="auth-card">
                <NextLink href="/login" className="link-back" style={{ marginBottom: '20px', display: 'inline-block' }}>
                    <ArrowLeftOutlined style={{ marginRight: '8px' }} /> Quay lại
                </NextLink>

                {step === 1 ? (
                    <>
                        <div className="auth-header" style={{ textAlign: 'left' }}>
                            <h1 className="auth-title">Quên mật khẩu?</h1>
                            <p className="auth-subtitle">
                                Nhập tên đăng nhập của bạn để nhận mã xác thực (OTP) qua email.
                            </p>
                        </div>

                        <form onSubmit={handleRequestOTP}>
                            <div className="custom-form-item">
                                <label className="custom-label">Tên đăng nhập</label>
                                <div className="input-wrapper">
                                    <UserOutlined className="input-icon-left" />
                                    <input
                                        type="text"
                                        className="custom-input"
                                        placeholder="Nhập username..."
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className={`btn-primary ${loading ? 'btn-loading' : ''}`}
                                disabled={loading}
                            >
                                {loading ? <LoadingOutlined style={{ marginRight: 8 }} /> : 'Gửi mã xác thực'}
                            </button>
                        </form>
                    </>
                ) : (
                    <>
                        <div className="auth-header" style={{ textAlign: 'left' }}>
                            <h1 className="auth-title">Đặt lại mật khẩu</h1>
                            <p className="auth-subtitle">
                                Mã OTP đã được gửi đến email của tài khoản <strong>{username}</strong>.
                            </p>
                        </div>

                        <Form
                            onFinish={handleResetPassword}
                            layout="vertical"
                            size="large"
                            initialValues={{ username }}
                        >
                            <Form.Item
                                name="otp"
                                rules={[{ required: true, message: 'Vui lòng nhập mã OTP!' }]}
                            >
                                <Input
                                    prefix={<KeyOutlined />}
                                    placeholder="Nhập mã OTP (6 số)"
                                    maxLength={6}
                                    style={{ height: '45px' }}
                                />
                            </Form.Item>

                            <Form.Item
                                name="newPassword"
                                rules={[
                                    { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
                                    { min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự' },
                                    { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/, message: 'Mật khẩu phải chứa chữ hoa, chữ thường, số và ký tự đặc biệt' }
                                ]}
                            >
                                <Input.Password
                                    prefix={<LockOutlined />}
                                    placeholder="Mật khẩu mới"
                                    style={{ height: '45px' }}
                                />
                            </Form.Item>

                            <Form.Item
                                name="confirmPassword"
                                dependencies={['newPassword']}
                                rules={[
                                    { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
                                    ({ getFieldValue }) => ({
                                        validator(_, value) {
                                            if (!value || getFieldValue('newPassword') === value) {
                                                return Promise.resolve();
                                            }
                                            return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                                        },
                                    }),
                                ]}
                            >
                                <Input.Password
                                    prefix={<LockOutlined />}
                                    placeholder="Xác nhận mật khẩu"
                                    style={{ height: '45px' }}
                                />
                            </Form.Item>

                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                block
                                style={{
                                    height: '45px',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    border: 'none',
                                    marginTop: '10px'
                                }}
                            >
                                Đặt lại mật khẩu
                            </Button>

                            <Button
                                type="link"
                                onClick={() => setStep(1)}
                                block
                                style={{ marginTop: '10px' }}
                            >
                                Gửi lại mã?
                            </Button>
                        </Form>
                    </>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
