"use client";

import * as React from "react";
import { Button, Checkbox, Col, Input, Row, Typography, Form, message, ConfigProvider } from "antd";
import "@/src/cssfolder/LoginPage.css";
import { useRouter } from "next/navigation";
import { authService } from "@/src/service/authService";

const { Title, Text, Link } = Typography;

const Login = () => {
  const [form] = Form.useForm();
  const router = useRouter();

  const onFinish = async (values: any) => {
    try {
      await authService.login(values);
      message.success("Đăng nhập thành công");
      router.push("/home");
    } catch (err: any) {
      message.error(err?.response?.data?.error || 'Đăng nhập thất bại');
    }
  };

  React.useEffect(() => {
    document.body.style.margin = "0";
  }, []);

  return (
    <div className="login-container">
      <Row style={{ height: "101vh" }} gutter={[16, 0]}>
        <Col xs={0} sm={0} md={14} className="login-illustration">
          <img
            src="/logo/undraw_in_the_office_re_jtgc.svg"
            alt="Illustration"
            className="illustration-image"
            style={{ width: "100%", maxWidth: 700 }}
          />
        </Col>

        <Col xs={24} sm={24} md={10} className="login-form" style={{ backgroundColor: 'white', boxShadow: "0px 0px 15px rgba(0, 0, 0, 0.1)" }}>
          <Form
            className="form-content"
            onFinish={onFinish}
          >
            <div style={{ display: "flex", width: "100%", justifyContent: "center", alignItems: "center", }}>
              <img src="../../../logo/logo.png" alt="" style={{ width: "min(300px, 80%)" }} />
            </div>
            <br />
            <div className="form-fields">
              <Form.Item
                name="username"
                label="Tên đăng nhập"
                labelCol={{ span: 24 }}
                rules={[
                  { required: true, message: 'Tên đăng nhập không được để trống!' },
                ]}
              >
                <Input
                  placeholder="Nhập tên đăng nhập"
                  className="input-field"
                  style={{ height: '50px', borderRadius: '10px' }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="Mật khẩu"
                labelCol={{ span: 24 }}
                rules={[
                  { required: true, message: 'Mật khẩu không được để trống!' },
                  {
                    pattern: /^(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{6,}$/,
                    message:
                      'Mật khẩu phải có ít nhất 6 ký tự và chứa ít nhất 1 ký tự đặc biệt!',
                  },
                ]}
              >
                <Input.Password
                  placeholder="Nhập mật khẩu"
                  className="input-field"
                  style={{ height: '50px', borderRadius: '10px' }}
                />
              </Form.Item>
            </div>

            <div className="form-options">
              <Checkbox>Ghi nhớ đăng nhập</Checkbox>
              <Link className="forgot-password" href="/forgotPassword">Quên mật khẩu?</Link>
            </div>
            <Button type="primary" htmlType="submit" block className="login-button" style={{ height: '50px', marginTop: "20px" }}>
              Đăng nhập
            </Button>
            <div className="register-link">
              <Text style={{ fontSize: "15px" }}>
                Chưa có tài khoản? <Link href="../../register">Đăng ký</Link>
              </Text>
            </div>
            <br />
            <div className="register-link">
              <Text style={{ fontSize: "15px" }}>
                Quay trở lại trang chủ? <Link href="../home" style={{ fontSize: "15px" }}>Trang chủ</Link>
              </Text>
            </div>
          </Form>
        </Col>
      </Row>
    </div>
  );
};

export default Login;