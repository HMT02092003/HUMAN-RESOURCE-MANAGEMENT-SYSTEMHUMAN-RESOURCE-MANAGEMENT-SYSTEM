"use client";

import React, { useEffect, useState } from "react";
import { Form, Input, Row, Col, Select, Button, Card, DatePicker, message } from "antd";
import { LeftCircleFilled, DeleteFilled, LockOutlined, PlusOutlined, SaveFilled, MinusCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useRouter } from "next/navigation";
import constantConfig from "@/src/config/constant";
import { roleService } from "@/src/service/roleService";
import { departmentService } from "@/src/service/departmentService";
import { chevronService } from "@/src/service/chevronService";

dayjs.extend(customParseFormat);

const { Option } = Select;

// Import constants from config
const { Gender, statusOptions, Relationship } = constantConfig;

interface UserFormProps {
  initialValues?: any;
  onFinish: (values: any) => void;
  isEdit: boolean;
  onBack: () => void;
  onDelete?: () => void;
  deletePer?: boolean; // Permission to delete
  loading?: boolean; // Loading state for submission
  // When provided in create flow, clicking "Hoàn thành" will save user only (without contract)
  onCreateOnly?: (values: any) => Promise<void> | void;
}

const UserForm: React.FC<UserFormProps> = ({
  initialValues,
  onFinish,
  isEdit,
  onBack,
  onDelete,
  deletePer,
  loading,
  onCreateOnly,
}) => {
  const [form] = Form.useForm();
  const router = useRouter();
  
  // State for API data
  const [roles, setRoles] = useState<any[]>([]);
  const [chevrons, setChevrons] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [apiLoading, setApiLoading] = useState(false);

  // Fetch data from APIs
  useEffect(() => {
    const fetchData = async () => {
      setApiLoading(true);
      try {
        // Fetch roles from auth-service
        const rolesData = await roleService.getAllRoles();
        setRoles(rolesData || []);

        // Fetch departments from employee-service
        const departmentsData = await departmentService.getAllDepartments();
        setDepartments(departmentsData || []);

        // Fetch chevrons from employee-service
        const chevronsData = await chevronService.getAllChevrons();
        setChevrons(chevronsData || []);
      } catch (error: any) {
        console.error('Error fetching form data:', error);
        message.error('Có lỗi xảy ra khi tải dữ liệu form');
      } finally {
        setApiLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleFinish = (values: any) => {
    const formattedValues = {
      ...values,
      birthday: values.birthday ? values.birthday.toISOString() : null,
      startDate: values.startDate ? values.startDate.toISOString() : null,
      gender: values.gender === undefined || values.gender === "" ? null : values.gender, // Ensure gender is null if not selected
      profileFamily: values.profileFamily?.map((member: any) => ({
        ...member,
        birthday: member.birthday ? member.birthday.toISOString() : null // Check null before calling toISOString
      }))
    };
    console.log("Formatted UserForm data:", formattedValues);
    onFinish(formattedValues);
  };

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        ...initialValues,
        birthday: initialValues.birthday ? dayjs(initialValues.birthday) : null,
        startDate: initialValues.startDate ? dayjs(initialValues.startDate) : null,
        status: Number(initialValues.status),
        gender: initialValues.gender || null, // Assign null if no value
        profileFamily: initialValues.profileFamily?.map((member: any) => ({
          ...member,
          birthday: member.birthday ? dayjs(member.birthday) : null
        }))
      });
      console.log("Initial values:", initialValues);
    }
  }, [initialValues, form]);

  return (
    <Form
      form={form}
      name="User"
      layout="vertical"
      onFinish={handleFinish}
      scrollToFirstError
      initialValues={{ status: 1 }} // Set default status to "Hoạt động" (Active)
    >
      <Row gutter={[24, 0]}>
        <Col md={24}>
          <Form.Item
            label="Tên đăng nhập"
            name="username"
            rules={[
              { required: true, message: "Vui lòng nhập tên đăng nhập" },
              { whitespace: true, message: "Tên đăng nhập không được để trống" },
              { max: 255, message: "Tên đăng nhập không được vượt quá 255 ký tự" }
            ]}
          >
            <Input
              placeholder="Nhập tên đăng nhập"
              readOnly={isEdit} // Username should generally not be editable
              maxLength={255}
            />
          </Form.Item>
        </Col>

        {!isEdit && ( // Password fields only for new user creation
          <>
            <Col md={12}>
              <Form.Item
                label="Mật khẩu"
                name="password"
                rules={[
                  { required: true, message: "Vui lòng nhập mật khẩu" },
                  { whitespace: true, message: "Mật khẩu không được để trống" },
                  // { min: 8, message: "Mật khẩu phải có ít nhất 8 ký tự" },
                  // { pattern: /^(?=.*[A-Z])(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/, message: "Mật khẩu phải chứa chữ hoa, chữ thường, số và ký tự đặc biệt" }
                ]}
              >
                <Input.Password
                  placeholder="Nhập mật khẩu"
                  prefix={<LockOutlined />}
                  autoComplete="new-password"
                />
              </Form.Item>
            </Col>
            <Col md={12}>
              <Form.Item
                label="Xác nhận mật khẩu"
                name="rePassword"
                dependencies={['password']}
                rules={[
                  { required: true, message: "Vui lòng xác nhận mật khẩu" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Mật khẩu không khớp!'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  placeholder="Nhập lại mật khẩu"
                  prefix={<LockOutlined />}
                  autoComplete="new-password"
                />
              </Form.Item>
            </Col>
          </>
        )}

        <Col md={12}>
          <Form.Item
            label="Họ"
            name="lastName"
            rules={[
              { required: true, message: "Vui lòng nhập họ" },
              { whitespace: true, message: "Họ không được để trống" },
              { max: 50, message: "Họ không được vượt quá 50 ký tự" },
            ]}
          >
            <Input placeholder="Nhập họ" maxLength={50} />
          </Form.Item>
        </Col>

        <Col md={12}>
          <Form.Item
            label="Tên"
            name="firstName"
            rules={[
              { required: true, message: "Vui lòng nhập tên" },
              { whitespace: true, message: "Tên không được để trống" },
              { max: 50, message: "Tên không được vượt quá 50 ký tự" },
            ]}
          >
            <Input placeholder="Nhập tên" maxLength={50} />
          </Form.Item>
        </Col>

        <Col md={24}>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Vui lòng nhập email" },
              { type: 'email', message: "Email không hợp lệ" },
              { max: 100, message: "Email không được vượt quá 100 ký tự" }
            ]}
          >
            <Input
              placeholder="Nhập email"
              type="email"
              maxLength={100}
            />
          </Form.Item>
        </Col>

        <Col md={12}>
          <Form.Item
            label="Ngày sinh"
            name="birthday"
          >
            <DatePicker
              placeholder="Chọn ngày sinh"
              style={{ width: "100%" }}
              format="YYYY-MM-DD"
              disabledDate={(current) => current && current > dayjs().endOf("day")}
            />
          </Form.Item>
        </Col>

        <Col md={12}>
          <Form.Item
            label="Giới tính"
            name="gender"
          >
            <Select
              placeholder="Chọn giới tính"
              allowClear
              showSearch
            >
              {Gender.map((item) => (
                <Option value={item.key} key={item.key}>
                  {item.value}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        <Col md={12}>
          <Form.Item
            label="Số điện thoại"
            name="phone"
            rules={[
              { required: true, message: "Vui lòng nhập số điện thoại" },
              { pattern: /^0\d{9}$/, message: "Số điện thoại Việt Nam phải bắt đầu bằng 0 và có 10 chữ số" },
            ]}
          >
            <Input
              placeholder="Nhập số điện thoại"
              style={{ width: "100%" }}
              maxLength={10}
            />
          </Form.Item>
        </Col>

        <Col md={12}>
          <Form.Item
            label="Trạng thái"
            name="status"
            rules={[{ required: true, message: "Vui lòng chọn trạng thái" }]}
          >
            <Select placeholder="Chọn trạng thái">
              {statusOptions.map((item) => (
                <Option value={item.value} key={item.value}>
                  {item.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        <Col md={12}>
          <Form.Item
            label="Vai trò"
            name="roleId"
            rules={[
              { required: true, message: "Vui lòng chọn vai trò" },
            ]}
          >
            <Select
              placeholder="Chọn vai trò"
              allowClear
              showSearch
              loading={apiLoading}
            >
              {roles.map((item) => (
                <Option value={item.id} key={item.id}>
                  {item.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        <Col md={12}>
          <Form.Item
            label="Ngày bắt đầu"
            name="startDate"
            rules={[
              { required: true, message: "Vui lòng chọn ngày bắt đầu" },
            ]}
          >
            <DatePicker
              placeholder="Chọn ngày bắt đầu"
              style={{ width: "100%" }}
              format="YYYY-MM-DD"
              disabledDate={(current) => current && current > dayjs().endOf("day")}
            />
          </Form.Item>
        </Col>

        <Col md={12}>
          <Form.Item
            label="Chức vụ"
            name="chevronId"
            rules={[
              { required: true, message: "Vui lòng chọn cấp bậc" },
            ]}
          >
            <Select
              placeholder="Chọn cấp bậc"
              allowClear
              showSearch
              loading={apiLoading}
            >
              {chevrons.map((item) => (
                <Option value={item.id} key={item.id}>
                  {item.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        <Col md={12}>
          <Form.Item
            label="Phòng ban"
            name="departmentId"
            rules={[
              { required: true, message: "Vui lòng chọn phòng ban" },
            ]}
          >
            <Select
              placeholder="Chọn phòng ban"
              allowClear
              showSearch
              loading={apiLoading}
            >
              {departments.map((item) => (
                <Option value={item.id} key={item.id}>
                  {item.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        <Col md={24}>
          <Form.List name="profileFamily">
            {(fields, { add, remove }) => (
              <Card
                title="Thông tin gia đình"
                style={{ marginTop: 24 }}
                extra={
                  <Button
                    type="primary"
                    onClick={() => add()}
                    icon={<PlusOutlined />}
                    ghost
                  >
                    Thêm thành viên
                  </Button>
                }
              >
                {fields.map(({ key, name, ...restField }) => (
                  <Card
                    key={key}
                    size="small"
                    style={{ marginBottom: 16 }}
                    extra={
                      <MinusCircleOutlined
                        onClick={() => remove(name)}
                        style={{ cursor: 'pointer', color: '#999' }}
                      />
                    }
                  >
                    <Row gutter={[24, 0]}>
                      <Col md={12}>
                        <Form.Item
                          {...restField}
                          name={[name, "relationship"]}
                          label="Quan hệ"
                          rules={[{ required: true, message: "Vui lòng chọn quan hệ" }]}
                        >
                          <Select placeholder="Chọn quan hệ">
                            {Relationship.map((item) => (
                              <Option value={item.value} key={item.value}>
                                {item.label}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col md={12}>
                        <Form.Item
                          {...restField}
                          name={[name, "name"]}
                          label="Họ và tên"
                          rules={[{ required: true, message: "Vui lòng nhập họ và tên" }]}
                        >
                          <Input placeholder="Nhập họ và tên" />
                        </Form.Item>
                      </Col>
                      <Col md={12}>
                        <Form.Item
                          {...restField}
                          name={[name, "birthday"]}
                          label="Ngày sinh"
                        >
                          <DatePicker
                            placeholder="Chọn ngày sinh"
                            style={{ width: "100%" }}
                            format="YYYY-MM-DD"
                            disabledDate={(current) => current && current > dayjs().endOf("day")}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}
                {fields.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#999' }}>Chưa có thành viên gia đình nào được thêm.</p>
                )}
              </Card>
            )}
          </Form.List>
        </Col>
      </Row>

      <Row justify="center" gutter={16} style={{ marginTop: 24 }}>
        <Col>
          <Button
            icon={<LeftCircleFilled />}
            onClick={onBack}
          >
            Quay lại
          </Button>
        </Col>
        {isEdit && deletePer && (
          <Col>
            <Button
              danger
              icon={<DeleteFilled />}
              onClick={onDelete}
            >
              Xóa
            </Button>
          </Col>
        )}
        <Col>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveFilled />}
            loading={loading}
          >
            {isEdit ? "Cập nhật" : "Tiếp tục"}
          </Button>
        </Col>
      </Row>
    </Form>
  );
};

export default UserForm;