"use client";

import React, { useEffect, useState } from "react";
import { Form, Input, Row, Col, Select, Button, Card, DatePicker, message, Upload } from "antd";
import type { UploadFile } from 'antd/es/upload/interface';
import { LeftCircleFilled, DeleteFilled, LockOutlined, PlusOutlined, SaveFilled, MinusCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useRouter } from "next/navigation";
import constantConfig from "@/config/constant";
import { roleService } from "@/service/roleService";
import { departmentService } from "@/service/departmentService";
import { chevronService } from "@/service/chevronService";
import { getPhotoUrl } from '@/utils/photo';

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
        const rolesData = await roleService.getAllRolesForSelect();
        setRoles(rolesData || []);

        // If editing, fetch filtered data based on initial roleId
        if (isEdit && initialValues?.roleId) {
          const [depts, chevs] = await Promise.all([
            departmentService.getAllDepartmentsForSelect(initialValues.roleId),
            chevronService.getAllChevronsForSelect(initialValues.roleId)
          ]);
          setDepartments(depts || []);
          setChevrons(chevs || []);
        }
      } catch (error: any) {
        console.error('Error fetching initial form data:', error);
        message.error('Có lỗi xảy ra khi tải dữ liệu ban đầu');
      } finally {
        setApiLoading(false);
      }
    };

    fetchData();
  }, [isEdit, initialValues?.roleId]);

  const handleRoleChange = async (roleId: number) => {
    // Reset selected department and chevron
    form.setFieldsValue({
      departmentId: undefined,
      chevronId: undefined
    });
    setDepartments([]);
    setChevrons([]);

    if (roleId) {
      setApiLoading(true);
      try {
        const [depts, chevs] = await Promise.all([
          departmentService.getAllDepartmentsForSelect(roleId),
          chevronService.getAllChevronsForSelect(roleId)
        ]);
        setDepartments(depts || []);
        setChevrons(chevs || []);
      } catch (error) {
        console.error('Error fetching filtered data:', error);
        message.error('Không thể tải danh sách phòng ban và chức vụ theo vai trò này');
      } finally {
        setApiLoading(false);
      }
    }
  };

  const handleFinish = (values: any) => {
    // Map Upload file list to backend field
    const photoList: UploadFile[] = values.identificationPhoto || [];
    let identificationPhoto: any = undefined;
    if (Array.isArray(photoList) && photoList.length > 0) {
      const f = photoList[0] as any;
      if (f.originFileObj) identificationPhoto = f.originFileObj;
      else if (initialValues?.identificationPhoto) identificationPhoto = initialValues.identificationPhoto;
    }

    const formattedValues = {
      ...values,
      // Use date-only format to avoid timezone shifts when converting to ISO (dayjs/toISOString can shift day depending on TZ)
      birthday: values.birthday ? values.birthday.format('YYYY-MM-DD') : null,
      startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : null,
      gender: values.gender === undefined || values.gender === "" ? null : values.gender, // Ensure gender is null if not selected
      profileFamily: values.profileFamily ? values.profileFamily?.map((member: any) => ({
        ...member,
        birthday: member.birthday ? member.birthday.format('YYYY-MM-DD') : null // Use date-only string
      })) : [],
      identificationPhoto,
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
        })),
        identificationPhoto: (() => {
          const photo = initialValues.identificationPhoto;
          if (typeof photo === 'string' && photo) {
            const url = getPhotoUrl(photo);
            return [{ uid: '-1', name: 'identificationPhoto', status: 'done', url }];
          }
          return [];
        })(),
      });
      console.log("Initial values:", initialValues);
    }
  }, [initialValues, form]);

  const normFile = (e: any) => {
    if (Array.isArray(e)) {
      return e;
    }
    return e && e.fileList;
  };

  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('Chỉ chấp nhận tệp hình ảnh');
      return Upload.LIST_IGNORE;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Ảnh phải nhỏ hơn 5MB');
      return Upload.LIST_IGNORE;
    }
    return false; // prevent auto upload
  };

  return (
    <Form
      form={form}
      name="User"
      layout="vertical"
      onFinish={handleFinish}
      scrollToFirstError
      // For create mode, default certain date fields to today. For edit mode, existing values (initialValues) will be used.
      initialValues={isEdit ? { status: 1 } : { status: 1, birthday: dayjs(), startDate: dayjs() }}
    >
      <Row gutter={[24, 0]}>
        <Col xs={24} md={24}>
          <Form.Item
            label="Ảnh đại diện"
            name="identificationPhoto"
            valuePropName="fileList"
            getValueFromEvent={normFile}
            rules={[
              {
                validator: (_, value) => {
                  if (isEdit) return Promise.resolve();
                  if (Array.isArray(value) && value.length > 0) return Promise.resolve();
                  return Promise.reject(new Error('Vui lòng tải ảnh đại diện'));
                },
              },
            ]}
          >
            {/* Use a noStyle nested Form.Item with shouldUpdate so we can react to changes
                in the form value for `identificationPhoto` and hide the upload button
                once a file exists. This preserves the form binding on the outer Form.Item. */}
            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.identificationPhoto !== cur.identificationPhoto}>
              {() => {
                const fileList: any[] = form.getFieldValue('identificationPhoto') || [];
                return (
                  <Upload
                    listType="picture-card"
                    accept="image/*"
                    multiple={false}
                    beforeUpload={beforeUpload}
                    // Control the Upload's fileList from the form so UI always shows the single file we keep
                    fileList={fileList}
                    onChange={(info) => {
                      const newList = info && Array.isArray(info.fileList) ? info.fileList.slice(-1) : [];
                      // Update form value so outer Form.Item receives the trimmed file list
                      form.setFieldsValue({ identificationPhoto: newList });
                      // Return modified event (not strictly required when controlled) for compatibility
                      return { ...info, fileList: newList } as any;
                    }}
                    onRemove={(file) => {
                      // Remove from the form value
                      const current: any[] = form.getFieldValue('identificationPhoto') || [];
                      const updated = current.filter((f: any) => f.uid !== file.uid);
                      form.setFieldsValue({ identificationPhoto: updated });
                    }}
                  >
                    {fileList.length === 0 && <div>Chọn ảnh</div>}
                  </Upload>
                );
              }}
            </Form.Item>
          </Form.Item>
        </Col>
        <Col xs={24} md={24}>
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
            <Col xs={24} md={12}>
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
            <Col xs={24} md={12}>
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

        <Col xs={24} md={12}>
          <Form.Item
            label="Họ và Tên"
            name="fullName"
            rules={[
              { required: true, message: "Vui lòng nhập họ và tên" },
              { whitespace: true, message: "Họ và tên không được để trống" },
              { max: 100, message: "Họ và tên không được vượt quá 100 ký tự" },
            ]}
          >
            <Input placeholder="Nhập họ và tên đầy đủ (VD: Nguyễn Văn An)" maxLength={100} />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
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

        <Col xs={24} md={12}>
          <Form.Item
            label="Ngày sinh"
            name="birthday"
          >
            <DatePicker
              placeholder="Chọn ngày sinh"
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              disabledDate={(current) => current && current > dayjs().endOf("day")}
            // allow manual input in DD/MM/YYYY and parse using dayjs customParseFormat
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
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

        <Col xs={24} md={12}>
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

        <Col xs={24} md={12}>
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

        <Col xs={24} md={12}>
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
              onChange={handleRoleChange}
            >
              {roles.map((item) => (
                <Option value={item.id} key={item.id}>
                  {item.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
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
              format="DD/MM/YYYY"
              disabledDate={(current) => current && current > dayjs().endOf("day")}
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            label="Chức vụ"
            name="chevronId"
            rules={[
              { required: true, message: "Vui lòng chọn cấp bậc" },
            ]}
          >
            <Select
              placeholder={form.getFieldValue('roleId') ? "Chọn cấp bậc" : "Vui lòng chọn vai trò trước"}
              allowClear
              showSearch
              loading={apiLoading}
              disabled={!form.getFieldValue('roleId')}
            >
              {chevrons.map((item) => (
                <Option value={item.id} key={item.id}>
                  {item.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            label="Phòng ban"
            name="departmentId"
            rules={[
              { required: true, message: "Vui lòng chọn phòng ban" },
            ]}
          >
            <Select
              placeholder={form.getFieldValue('roleId') ? "Chọn phòng ban" : "Vui lòng chọn vai trò trước"}
              allowClear
              showSearch
              loading={apiLoading}
              disabled={!form.getFieldValue('roleId')}
            >
              {departments.map((item) => (
                <Option value={item.id} key={item.id}>
                  {item.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        <Col xs={24} md={24}>
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
                      <Col xs={24} md={12}>
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
                      <Col xs={24} md={12}>
                        <Form.Item
                          {...restField}
                          name={[name, "name"]}
                          label="Họ và tên"
                          rules={[{ required: true, message: "Vui lòng nhập họ và tên" }]}
                        >
                          <Input placeholder="Nhập họ và tên" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          {...restField}
                          name={[name, "birthday"]}
                          label="Ngày sinh"
                        >
                          <DatePicker
                            placeholder="Chọn ngày sinh"
                            style={{ width: "100%" }}
                            format="DD/MM/YYYY"
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