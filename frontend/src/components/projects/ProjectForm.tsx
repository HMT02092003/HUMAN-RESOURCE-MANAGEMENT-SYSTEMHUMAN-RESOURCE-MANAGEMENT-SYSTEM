'use client';

import React, { useEffect, useState } from 'react';
import { Form, Input, DatePicker, Select, InputNumber, Button, Space, Avatar, Tag, message, Spin, Row, Col } from 'antd';
import { SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import UserService from '@/service/userService';
import jobService from '@/service/jobService';

const { TextArea } = Input;
const { RangePicker } = DatePicker;
const { Option } = Select;

const statusLabels = {
    planning: 'Đang lên kế hoạch',
    active: 'Đang thực hiện',
    on_hold: 'Tạm dừng',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy'
};

interface ProjectFormProps {
    initialValues?: any;
    projectId?: string; // when provided, the form will load the project and perform update
    onSuccess?: () => void; // optional callback after successful create/update
    submitButtonText?: string;
}

const ProjectForm: React.FC<ProjectFormProps> = ({
    initialValues,
    projectId,
    onSuccess,
    submitButtonText = 'Lưu'
}) => {
    const router = useRouter();
    const [form] = Form.useForm();
    const [users, setUsers] = useState<any[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [loadingProject, setLoadingProject] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    // If projectId provided, load project data and populate form.
    useEffect(() => {
        const loadProject = async () => {
            if (!projectId) return;
            setLoadingProject(true);
            try {
                const resp: any = await jobService.getProjectById(projectId);
                const projectData = resp?.data?.data || resp?.data || resp;

                // Map to the same shape as initialValues handling above
                const formValues: any = {
                    name: projectData.name,
                    description: projectData.description,
                    status: projectData.status,
                    budget: projectData.budget,
                    customer: projectData.customer,
                    managerId: projectData.manager?.id || projectData.manager_id?.id || projectData.manager_id,
                };

                if (projectData.startDate && projectData.endDate) {
                    formValues.dateRange = [dayjs(projectData.startDate), dayjs(projectData.endDate)];
                } else if (projectData.start_date && projectData.end_date) {
                    formValues.dateRange = [dayjs(projectData.start_date), dayjs(projectData.end_date)];
                }

                if (Array.isArray(projectData.members)) {
                    formValues.memberIds = projectData.members.map((m: any) => {
                        if (m.user_id && typeof m.user_id === 'object') return m.user_id.id;
                        return m.id || m.user_id;
                    });
                }

                form.setFieldsValue(formValues);
            } catch (err) {
                console.error('Failed to load project for edit:', err);
                message.error('Không thể tải thông tin dự án để chỉnh sửa');
            } finally {
                setLoadingProject(false);
            }
        };

        // If initialValues present (from parent) set them first, then override if projectId provided
        if (initialValues) {
            const iv: any = {
                name: initialValues.name,
                description: initialValues.description,
                status: initialValues.status,
                budget: initialValues.budget,
                customer: initialValues.customer,
                managerId: initialValues.manager?.id || initialValues.manager_id?.id || initialValues.manager_id,
            };
            if (initialValues.startDate && initialValues.endDate) iv.dateRange = [dayjs(initialValues.startDate), dayjs(initialValues.endDate)];
            if (Array.isArray(initialValues.members)) iv.memberIds = initialValues.members.map((m: any) => (m.user_id && typeof m.user_id === 'object') ? m.user_id.id : (m.id || m.user_id));
            form.setFieldsValue(iv);
        }

        loadProject();
    }, [projectId, initialValues, form]);

    const loadUsers = async (scope: string = 'projects') => {
        setUsersLoading(true);
        try {
            const resp = await UserService.getAllUsersAllForSelect({ scope });
            const list = Array.isArray(resp) ? resp : (resp?.results || resp?.data || resp || []);
            const mapped = (list || []).map((u: any) => ({
                id: u.id || u.user_id || u.userId,
                firstName: u.firstName || u.first_name || u.first || '',
                lastName: u.lastName || u.last_name || u.last || '',
                username: u.username,
                email: u.email,
                name: u.fullName || u.full_name || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email || `User ${u.id}`,
                avatar: u.avatar || u.avatar_url || u.profile_picture || u.photo || null,
                role: (u.role && (typeof u.role === 'string' ? u.role : u.role.name)) || u.position || '',
                chevron: u.chevron?.name || null
            }));
            setUsers(mapped);
        } catch (err) {
            console.error('Failed to load users:', err);
        } finally {
            setUsersLoading(false);
        }
    };

    const getInitials = (name: string) => {
        if (!name) return '';
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const renderUserLabel = (member: any) => {
        const label = member?.chevron || '';
        const key = String(label)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, '_');

        const roleColors: Record<string, string> = {
            ceo: 'red',
            coo: 'magenta',
            cfo: 'volcano',
            cto: 'purple',
            cmo: 'geekblue',
            chro: 'gold',
            director: 'orange',
            head_of_department: 'orange',
            head_of_dept: 'orange',
            manager: 'magenta',
            team_leader: 'cyan',
            supervisor: 'green',
            specialist: 'blue',
            senior_staff: 'geekblue',
            staff: 'lime',
            junior_staff: 'green',
            intern: 'gray',
        };

        const color = roleColors[key] || 'blue';

        return (
            <Space>
                <Avatar size={20} src={member.avatar}>{!member.avatar && getInitials(member.name)}</Avatar>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 12 }}>{member.name}</span>
                    <span style={{ lineHeight: '12px' }}>
                        <Tag color={color} style={{ fontSize: 10, padding: '2px 6px' }}>{label}</Tag>
                    </span>
                </div>
            </Space>
        );
    };

    const handleSubmit = async () => {
        try {
            setSubmitting(true);
            const values = await form.validateFields();

            // Build payload
            const payload: any = {
                ...values,
                startDate: values.dateRange[0].format('YYYY-MM-DD'),
                endDate: values.dateRange[1].format('YYYY-MM-DD'),
            };

            // If creating new project, generate project_id
            const isCreating = !projectId && !initialValues;
            if (isCreating) {
                payload.project_id = `PRJ${dayjs().format('YYYYMMDDHHmmss')}`;
            }

            // Map selected member ids to objects with id and role/chevron
            if (Array.isArray(values.memberIds)) {
                payload.members = values.memberIds.map((id: any) => {
                    const u = users.find(u => String(u.id) === String(id));
                    return {
                        id,
                        role: u?.chevron || u?.role || ''
                    };
                });
                delete payload.memberIds;
            }

            delete payload.dateRange;

            if (projectId) {
                await jobService.updateProject(projectId, payload);
                message.success('Cập nhật dự án thành công!');
            } else {
                await jobService.createProject(payload);
                message.success('Tạo dự án mới thành công!');
            }

            if (typeof onSuccess === 'function') onSuccess();

            router.push('/projects');
        } catch (error) {
            console.error('Form validation failed:', error);
            message.error('Vui lòng kiểm tra lại thông tin!');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Row justify="center">
            <Col span={16}>
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{
                        status: 'planning'
                    }}
                >
            <Form.Item
                name="name"
                label="Tên dự án"
                rules={[{ required: true, message: 'Vui lòng nhập tên dự án!' }]}
            >
                <Input placeholder="Nhập tên dự án" size="large" />
            </Form.Item>

            <Form.Item
                name="description"
                label="Mô tả"
                rules={[{ required: true, message: 'Vui lòng nhập mô tả!' }]}
            >
                <TextArea
                    rows={4}
                    placeholder="Nhập mô tả chi tiết về dự án"
                    size="large"
                />
            </Form.Item>

            <Form.Item
                name="status"
                label="Trạng thái"
                rules={[{ required: true }]}
            >
                <Select size="large">
                    {Object.entries(statusLabels).map(([key, label]) => (
                        <Option key={key} value={key}>{label}</Option>
                    ))}
                </Select>
            </Form.Item>

            <Form.Item
                name="dateRange"
                label="Thời gian thực hiện"
                rules={[{ required: true, message: 'Vui lòng chọn thời gian!' }]}
            >
                <RangePicker
                    style={{ width: '100%' }}
                    format="DD/MM/YYYY"
                    size="large"
                />
            </Form.Item>

            <Form.Item
                name="budget"
                label="Ngân sách (VNĐ)"
                rules={[{ required: true, message: 'Vui lòng nhập ngân sách!' }]}
            >
                <InputNumber
                    style={{ width: '100%' }}
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value!.replace(/\$\s?|(,*)/g, '')}
                    placeholder="Nhập ngân sách"
                    size="large"
                />
            </Form.Item>

            <Form.Item
                name="customer"
                label="Khách hàng"
                rules={[{ required: true, message: 'Vui lòng nhập tên khách hàng!' }]}
            >
                <Input placeholder="Nhập tên khách hàng" size="large" />
            </Form.Item>

            <Form.Item
                name="managerId"
                label="Quản lý"
                rules={[{ required: true, message: 'Vui lòng chọn quản lý!' }]}
            >
                <Select
                    placeholder="Chọn quản lý dự án"
                    loading={usersLoading}
                    showSearch
                    style={{ height: "65px" }}
                    size="large"
                    optionLabelProp="label"
                    filterOption={(input, option: any) => {
                        const u = users.find(u => String(u.id) === String(option.value));
                        const text = u ? (u.name || '') : (typeof option.label === 'string' ? option.label : '');
                        return text.toLowerCase().includes(input.toLowerCase());
                    }}
                >
                    {users.map(member => (
                        <Option key={member.id} value={member.id} label={renderUserLabel(member)}>
                            <Space>
                                <Avatar size="small" src={member.avatar}>{!member.avatar && getInitials(member.name)}</Avatar>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span>{member.name}</span>
                                    {(() => {
                                        const label = member?.chevron || '';
                                        const key = String(label)
                                            .toLowerCase()
                                            .normalize('NFD')
                                            .replace(/[\u0300-\u036f]/g, '')
                                            .replace(/[^\w\s]/g, '')
                                            .replace(/\s+/g, '_');

                                        const roleColors: Record<string, string> = {
                                            ceo: 'red',
                                            coo: 'magenta',
                                            cfo: 'volcano',
                                            cto: 'purple',
                                            cmo: 'geekblue',
                                            chro: 'gold',
                                            director: 'orange',
                                            head_of_department: 'orange',
                                            head_of_dept: 'orange',
                                            manager: 'magenta',
                                            team_leader: 'cyan',
                                            supervisor: 'green',
                                            specialist: 'blue',
                                            senior_staff: 'geekblue',
                                            staff: 'lime',
                                            junior_staff: 'green',
                                            intern: 'gray',
                                        };

                                        const color = roleColors[key] || 'blue';
                                        return <Tag color={color} style={{ fontSize: 12 }}>{label}</Tag>;
                                    })()}
                                </div>
                            </Space>
                        </Option>
                    ))}
                </Select>
            </Form.Item>

            <Form.Item
                name="memberIds"
                label="Thành viên"
                rules={[{ required: true, message: 'Vui lòng chọn thành viên!' }]}
            >
                <Select
                    mode="multiple"
                    placeholder="Chọn thành viên tham gia"
                    loading={usersLoading}
                    showSearch
                    size="large"
                    optionLabelProp="label"
                    tagRender={({ label, value, closable, onClose }) => (
                        <Tag
                            closable={closable}
                            onClose={onClose}
                            style={{ display: 'flex', alignItems: 'center', padding: '0 6px', marginRight: 6 }}
                        >
                            {label}
                        </Tag>
                    )}
                    filterOption={(input, option: any) => {
                        const u = users.find(u => String(u.id) === String(option.value));
                        const text = u ? (u.name || '') : (typeof option.label === 'string' ? option.label : '');
                        return text.toLowerCase().includes(input.toLowerCase());
                    }}
                >
                    {users.map(member => (
                        <Option key={member.id} value={member.id} label={renderUserLabel(member)}>
                            <Space>
                                <Avatar size="small" src={member.avatar}>{!member.avatar && getInitials(member.name)}</Avatar>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span>{member.name}</span>
                                    {(() => {
                                        const label = member?.chevron || '';
                                        const key = String(label)
                                            .toLowerCase()
                                            .normalize('NFD')
                                            .replace(/[\u0300-\u036f]/g, '')
                                            .replace(/[^\w\s]/g, '')
                                            .replace(/\s+/g, '_');

                                        const roleColors: Record<string, string> = {
                                            ceo: 'red',
                                            coo: 'magenta',
                                            cfo: 'volcano',
                                            cto: 'purple',
                                            cmo: 'geekblue',
                                            chro: 'gold',
                                            director: 'orange',
                                            head_of_department: 'orange',
                                            head_of_dept: 'orange',
                                            manager: 'magenta',
                                            team_leader: 'cyan',
                                            supervisor: 'green',
                                            specialist: 'blue',
                                            senior_staff: 'geekblue',
                                            staff: 'lime',
                                            junior_staff: 'green',
                                            intern: 'gray',
                                        };

                                        const color = roleColors[key] || 'blue';
                                        return <Tag color={color} style={{ fontSize: 12 }}>{label}</Tag>;
                                    })()}
                                </div>
                            </Space>
                        </Option>
                    ))}
                </Select>
            </Form.Item>

                    <Form.Item style={{ textAlign: 'center' }}>
                        <Space>
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                onClick={handleSubmit}
                                loading={submitting}
                                size="large"
                            >
                                {submitButtonText}
                            </Button>
                            <Button
                                icon={<CloseOutlined />}
                                onClick={() => router.back()}
                                size="large"
                            >
                                Hủy
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Col>
        </Row>
    );
};

export default ProjectForm;
