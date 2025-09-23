"use client";

import * as React from "react";
import { Button, Col, Input, Row, Typography, Form, message } from "antd";
import { UserOutlined, LockOutlined, EyeInvisibleOutlined, EyeOutlined } from "@ant-design/icons";
import NextLink from "next/link";
import "@/styles/login.css";
import { useRouter } from "next/navigation";
import { authService } from "@/service/authService";

const { Title, Text } = Typography;

const Login = () => {
  const [form] = Form.useForm();
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await authService.login(values);
      message.success("Đăng nhập thành công");
      router.push("/home");
    } catch (err: any) {
      message.error(err?.response?.data?.error || 'Đăng nhập thất bại');
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
              <p className="welcome-subtitle">
                Hệ thống quản lý nhân sự hiện đại và thông minh
              </p>
            </div>
            <div className="illustration-wrapper">
              <img
                src="/logo/undraw_in_the_office_re_jtgc.svg"
                alt="HR Management Illustration"
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
                <Title level={2} className="login-title">Đăng nhập</Title>
                <Text className="login-subtitle">
                  Vui lòng đăng nhập vào tài khoản của bạn
                </Text>
              </div>
              
              <Form
                form={form}
                onFinish={onFinish}
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
                    />
                  </Form.Item>

                  <Form.Item
                    name="password"
                    rules={[
                      { required: true, message: 'Vui lòng nhập mật khẩu!' },
                      { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' }
                    ]}
                  >
                    <Input.Password
                      prefix={<LockOutlined className="input-icon" />}
                      placeholder="Mật khẩu"
                      className="input-field"
                      autoComplete="current-password"
                      iconRender={(visible) => (
                        visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
                      )}
                    />
                  </Form.Item>
                </div>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    block
                    className="login-button"
                  >
                    <span className="button-text">
                      {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                    </span>
                  </Button>
                </Form.Item>
              </Form>

              <div className="forgot-password-section">
                <NextLink href="/forgotPassword" className="forgot-password-link">
                  Quên mật khẩu?
                </NextLink>
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Login;