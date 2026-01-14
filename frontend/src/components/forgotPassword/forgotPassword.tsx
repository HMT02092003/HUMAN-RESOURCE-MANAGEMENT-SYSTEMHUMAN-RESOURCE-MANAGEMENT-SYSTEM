"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import NextLink from 'next/link';
import { MailOutlined, ArrowLeftOutlined, LoadingOutlined, CheckCircleOutlined } from '@ant-design/icons';
import '@/styles/login.css';

const ThreeBackground = dynamic(() => import('@/components/ui/ThreeBackground'), {
  ssr: false,
});

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const handleReset = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setIsSent(true);
        }, 1500);
    };

    return (
        <div className="auth-container">
            <ThreeBackground />
            
            <div className="auth-card">
                <NextLink href="/login" className="link-back" style={{ marginBottom: '20px', display: 'inline-block' }}>
                    <ArrowLeftOutlined style={{ marginRight: '8px' }} /> Quay lại
                </NextLink>

                {!isSent ? (
                    <>
                        <div className="auth-header" style={{ textAlign: 'left' }}>
                            <h1 className="auth-title">Quên mật khẩu?</h1>
                            <p className="auth-subtitle">
                                Đừng lo, hãy nhập email của bạn. Chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.
                            </p>
                        </div>

                        <form onSubmit={handleReset}>
                            <div className="custom-form-item">
                                <label className="custom-label">Email đăng ký</label>
                                <div className="input-wrapper">
                                    <MailOutlined className="input-icon-left" />
                                    <input
                                        type="email"
                                        className="custom-input"
                                        placeholder="nguyenvan@example.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className={`btn-primary ${loading ? 'btn-loading' : ''}`}
                                disabled={loading}
                            >
                                {loading ? <LoadingOutlined style={{ marginRight: 8 }} /> : 'Gửi yêu cầu'}
                            </button>
                        </form>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <CheckCircleOutlined style={{ fontSize: '48px', color: '#10b981', marginBottom: '16px' }} />
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#334155', marginBottom: '8px' }}>Đã gửi email!</h2>
                        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
                            Vui lòng kiểm tra hộp thư đến <strong>{email}</strong> để lấy lại mật khẩu.
                        </p>
                        <button
                            onClick={() => setIsSent(false)}
                            style={{ background: 'none', border: 'none', color: '#0ea5e9', cursor: 'pointer', fontWeight: 500 }}
                        >
                            Thử lại với email khác
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
