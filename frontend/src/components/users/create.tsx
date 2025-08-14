"use client";

import React, { useState } from "react";
import { Col, Row, Tabs, message } from "antd";
import { useRouter } from "next/navigation";
import UserForm from "./Users/UserForm";
import ContractForm from "./Users/ContractForm"; // Đảm bảo bạn đã có component này
import UserService from "@/src/service/userService";

const { TabPane } = Tabs;

const Create = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeKey, setActiveKey] = React.useState('1');
  const [userData, setUserData] = useState<any>(null); // Để lưu trữ dữ liệu người dùng tạm thời

  // Submit của nút "Tiếp tục" chỉ chuyển tab, không gọi API
  const handleUserFormFinish = async (values: any) => {
    setUserData(values);
    setActiveKey('2');
  };

  // Nút "Hoàn thành" ở Step 1: gọi API lưu user ngay (không hợp đồng)
  const handleCreateUserOnly = async (values: any) => {
    try {
      setLoading(true);
      await UserService.createUser(values);
      message.success("Tạo người dùng thành công!");
      router.push("/user");
    } catch (error: any) {
      const data = error?.response?.data;
      message.destroy();
      message.error(data?.message || data?.error || error.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  // Hàm xử lý khi submit ContractForm và gọi API cuối cùng
  const handleContractFormFinish = async (contractValues: any) => {
    if (!userData) {
      message.error("Vui lòng hoàn thành thông tin người dùng trước.");
      setActiveKey('1'); // Quay lại tab người dùng nếu chưa có dữ liệu
      return;
    }

    try {
      setLoading(true);
      const finalData = {
        ...userData, // Dữ liệu từ UserForm
        ...contractValues, // Dữ liệu từ ContractForm
      };

      console.log("Dữ liệu cuối cùng để gửi:", finalData);
      await UserService.createUser(finalData);
      message.success("Người dùng và hợp đồng đã được tạo thành công!");
      router.push("/user");
    } catch (error: any) {
      const data = error?.response?.data;
      message.destroy();
      message.error(data?.message || data?.error || error.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content">
      <Row>
        <Col xs={24} md={{ span: 16, offset: 4 }}>
          <Tabs defaultActiveKey="1" activeKey={activeKey} onChange={setActiveKey}>
            <TabPane tab="Thông tin người dùng" key="1">
              <UserForm
                onFinish={handleUserFormFinish} // "Tiếp tục" chỉ chuyển tab
                onCreateOnly={handleCreateUserOnly} // "Hoàn thành" lưu ngay user
                isEdit={false}
                onBack={() => router.push("/user")}
                loading={loading}
                initialValues={userData}
              />
            </TabPane>
            <TabPane tab="Thông tin hợp đồng" key="2">
              <ContractForm
                onFinish={handleContractFormFinish} // Hàm cho ContractForm
                onBack={() => setActiveKey('1')} // Quay lại Tab 1
                loading={loading}
                initialValues={null} // Nếu bạn có initialValues cho hợp đồng, hãy truyền vào đây
              />
            </TabPane>
          </Tabs>
        </Col>
      </Row>
    </div>
  );
};

export default Create;