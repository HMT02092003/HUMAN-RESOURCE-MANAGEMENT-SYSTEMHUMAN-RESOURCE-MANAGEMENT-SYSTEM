"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import { UserOutlined, LockOutlined, LoadingOutlined, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import { message } from 'antd';
import '@/styles/login.css';
import { authService } from '@/service/authService';

const ThreeBackground = dynamic(() => import('@/components/ui/ThreeBackground'), {
  ssr: false,
});

const Login = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.login({ username: formData.username, password: formData.password });
      message.success('Đăng nhập thành công');
      router.push('/home');
    } catch (error) {
      message.error('Sai tài khoản hoặc mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <ThreeBackground />

      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Xin chào!</h1>
          <p className="auth-subtitle">Nhập thông tin để truy cập hệ thống quản trị</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="custom-form-item">
            <label className="custom-label">Tài khoản</label>
            <div className="input-wrapper">
              <UserOutlined className="input-icon-left" />
              <input
                type="text"
                className="custom-input"
                placeholder="Nhập tên đăng nhập"
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="custom-form-item">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="custom-label">Mật khẩu</label>
                <NextLink href="/forgotPassword" className="link-forgot">Quên mật khẩu?</NextLink>
            </div>
            
            <div className="input-wrapper">
              <LockOutlined className="input-icon-left" />
              <input
                type={showPass ? "text" : "password"}
                className="custom-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                required
              />
              <div
                style={{ position: 'absolute', right: '16px', cursor: 'pointer', color: '#94a3b8' }}
                onClick={() => setShowPass(!showPass)}
              >
                {showPass ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className={`btn-primary ${loading ? 'btn-loading' : ''}`}
            disabled={loading}
          >
            {loading ? <LoadingOutlined style={{ marginRight: 8 }} /> : 'Đăng nhập'}
          </button>
        </form>
        
        <div className="auth-footer">© 2025 HRM System</div>
      </div>
    </div>
  );
};

export default Login;