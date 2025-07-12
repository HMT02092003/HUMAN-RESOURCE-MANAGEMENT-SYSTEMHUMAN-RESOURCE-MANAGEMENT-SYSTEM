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

  // Hàm xử lý khi submit UserForm
  const handleUserFormFinish = async (values: any) => {
    try {
      setLoading(true);
      // Lưu trữ dữ liệu người dùng
      setUserData(values);
      message.success("Thông tin người dùng đã được lưu tạm thời. Vui lòng điền thông tin hợp đồng.");
      setActiveKey('2'); // Chuyển sang Tab 2
    } catch (error: any) {
      message.error(error.message || "Có lỗi xảy ra khi xử lý thông tin người dùng.");
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
      await UserService.createUser(finalData); // Giả sử API tạo user cũng nhận dữ liệu hợp đồng
      message.success("Người dùng và hợp đồng đã được tạo thành công!");
      router.push("/admin/users");
    } catch (error: any) {
      message.error(error.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content">
      <Row>
        <Col md={{ span: 16, offset: 4 }}>
          <Tabs defaultActiveKey="1" activeKey={activeKey} onChange={setActiveKey}>
            <TabPane tab="Thông tin người dùng" key="1">
              <UserForm
                onFinish={handleUserFormFinish} // Sử dụng hàm mới cho UserForm
                isEdit={false}
                onBack={() => router.push("/admin/users")}
                loading={loading}
                initialValues={userData} // Truyền dữ liệu tạm thời để hiển thị nếu người dùng quay lại
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