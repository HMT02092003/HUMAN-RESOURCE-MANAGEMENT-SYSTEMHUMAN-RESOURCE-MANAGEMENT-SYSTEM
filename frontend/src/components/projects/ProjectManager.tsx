'use client';

import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Progress, Avatar, Modal, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { Project } from '@/types/project';
import dayjs from 'dayjs';
import jobService from '@/service/jobService';

const statusColors = {
  planning: 'blue',
  active: 'green',
  on_hold: 'orange',
  completed: 'purple',
  cancelled: 'red'
};

const statusLabels = {
  planning: 'Đang lên kế hoạch',
  active: 'Đang thực hiện',
  on_hold: 'Tạm dừng',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy'
};

const ProjectManager: React.FC = () => {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  useEffect(() => {
    loadProjects(1, 10);
  }, []);

  const getInitials = (name: string) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const loadProjects = async (page: number, pageSize: number) => {
    setLoading(true);
    try {
      // Backend expects 0-based page index. Convert 1-based `page` (from Table) to 0-based for API.
      const apiPage = Math.max(0, (page || 1) - 1);
      const resp: any = await jobService.getAllProjectByScope({ page: apiPage, pageSize });
      // resp may be an axios response: resp.data
      const body = resp?.data ?? resp;
      // backend sample: { success: true, data: { results: [...], total }, scope }
      const payload = body?.data ?? body;

      let items: any[] = [];
      let totalCount = 0;

      if (Array.isArray(payload)) {
        items = payload;
        totalCount = payload.length;
      } else if (payload?.results || payload?.data) {
        items = payload.results ?? payload.data;
        totalCount = payload.total ?? items.length;
      } else if (payload?.items) {
        items = payload.items;
        totalCount = payload.total ?? items.length;
      } else {
        items = payload ? [payload] : [];
        totalCount = items.length;
      }

      // Map backend shape to frontend Project type using only backend fields (no user enrichment)
      const mapped = (items || []).map((p: any) => {
        // Normalize manager: backend may return manager_id as an object or primitive
        const rawManager = p.manager_id ?? p.manager;
        let managerMapped: any = { id: null, name: '', avatar: null, role: '', email: '' };
        if (rawManager) {
          if (typeof rawManager === 'object') {
            managerMapped.id = rawManager.id ?? null;
            managerMapped.name = rawManager.fullName ?? rawManager.full_name ?? rawManager.name ?? rawManager.username ?? rawManager.email ?? `User ${managerMapped.id ?? ''}`;
            managerMapped.avatar = rawManager.avatar ?? rawManager.avatar_url ?? rawManager.profile_picture ?? rawManager.identificationPhoto ?? null;
            managerMapped.role = rawManager.role ?? rawManager.position ?? '';
            managerMapped.email = rawManager.email ?? '';
          } else {
            managerMapped.id = rawManager;
            managerMapped.name = `User ${rawManager}`;
          }
        }

        // Normalize members: each member may have user_id as an object or primitive
        const mappedMembers = (p.members || []).map((m: any) => {
          const raw = m.user_id ?? m.userId ?? m;
          let id: any = null;
          let name = '';
          let avatar: any = null;
          let role = m.role ?? '';

          if (raw) {
            if (typeof raw === 'object') {
              id = raw.id ?? null;
              name = raw.fullName ?? raw.full_name ?? raw.name ?? raw.username ?? raw.email ?? `User ${id ?? ''}`;
              avatar = raw.avatar ?? raw.avatar_url ?? raw.profile_picture ?? raw.identificationPhoto ?? null;
              // prefer member.role (project role) but fallback to user role/position
              role = role || raw.role || raw.position || '';
            } else {
              id = raw;
              name = `User ${raw}`;
            }
          }

          return {
            id,
            name,
            avatar,
            role,
            joined_at: m.joined_at ?? null
          } as any;
        });

        return {
          id: p.project_id ?? p.id,
          name: p.name,
          description: p.description,
          status: p.status,
          startDate: p.start_date ?? p.startDate,
          endDate: p.end_date ?? p.endDate,
          progress: Number(p.progress) || 0,
          budget: p.budget ? Number(p.budget) : undefined,
          spent: p.spent ? Number(p.spent) : undefined,
          manager: managerMapped,
          members: mappedMembers,
          tasks: [],
          tags: [],
          customer: p.customer ?? p.customer,
          createdAt: p.created_at ?? p.createdAt ?? '',
          updatedAt: p.updated_at ?? p.updatedAt ?? ''
        } as Project;
      });

      setProjects(mapped);
      setTotal(totalCount);
      setCurrentPage(page);
      setPageSize(pageSize);
    } catch (error) {
      message.error('Không thể tải danh sách dự án');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  const handleCreate = () => {
    router.push('/projects/create');
  };

  const handleEdit = (project: Project) => {
    router.push(`/projects/edit/${project.id}`);
  };

  const deleteSelected = async () => {
    if (!selectedRowKeys || selectedRowKeys.length === 0) return;

    Modal.confirm({
      title: `Xác nhận xóa ${selectedRowKeys.length} dự án`,
      content: 'Hành động này sẽ xóa vĩnh viễn các dự án đã chọn. Bạn có chắc chắn muốn tiếp tục?',
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      async onOk() {
        try {
          // Use the selectedRowKeys state directly (AntD maintains this)
          const ids = (selectedRowKeys as React.Key[]).map(k => String(k)).filter(Boolean);
          console.log('Deleting project ids (from state):', ids);

          // Call bulk delete endpoint using single API method that accepts { ids }
          await jobService.deleteProject(ids);
          message.success('Xóa dự án thành công');
          // refresh
          setSelectedRowKeys([]);
          setSelectedRows([]);
          loadProjects(currentPage, pageSize);
        } catch (err) {
          console.error('Failed to delete projects', err);
          message.error('Xóa dự án thất bại');
        }
      }
    });
  };

  // Table row selection configuration
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[], newSelectedRows: any[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
      setSelectedRows(newSelectedRows);
    }
  };

  const handleDelete = (project: Project) => {
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: `Bạn có chắc chắn muốn xóa dự án "${project.name}"?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: () => {
        message.success('Đã xóa dự án thành công!');
        loadProjects(currentPage, pageSize);
      }
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const columns: ColumnsType<Project> = [
    {
      title: 'Mã dự án',
      dataIndex: 'id',
      key: 'id',
      fixed: 'left',
      sorter: (a, b) => a.id.localeCompare(b.id),
    },
    {
      title: 'Tên dự án',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      ellipsis: true,
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{text}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.description}</div>
        </div>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      filters: Object.keys(statusLabels).map(key => ({
        text: statusLabels[key as keyof typeof statusLabels],
        value: key
      })),
      onFilter: (value, record) => record.status === value,
      render: (status: Project['status']) => (
        <Tag color={statusColors[status]}>
          {statusLabels[status]}
        </Tag>
      )
    },
    {
      title: 'Tiến độ',
      dataIndex: 'progress',
      key: 'progress',
      sorter: (a, b) => a.progress - b.progress,
      render: (progress: number) => (
        <Progress
          percent={progress}
          size="small"
          status={progress === 100 ? 'success' : 'active'}
        />
      )
    },
    {
      title: 'Quản lý',
      // don't use a path that returns a primitive; render gets full record to be robust
      dataIndex: 'manager',
      key: 'manager',
      render: (_manager, record) => {
        // manager can come in different shapes depending on backend:
        // - record.manager (normalized object)
        // - record.manager_id (object from API)
        // - a primitive (id or name)
        const raw = (record as any).manager ?? (record as any).manager_id ?? {};
        let name = '';
        let avatar: string | null = null;

        if (raw == null) {
          name = '';
        } else if (typeof raw === 'string' || typeof raw === 'number') {
          name = String(raw);
        } else {
          // try common fields (use a typed-any alias to handle various backend shapes)
          const r: any = raw;
          name = r.fullName ?? r.full_name ?? r.name ?? r.username ?? r.email ?? `User ${r.id ?? ''}`;
          avatar = r.avatar ?? r.avatar_url ?? r.profile_picture ?? r.photo ?? null;
        }

        return (
          <Space>
            <Avatar src={avatar} size="small">{!avatar && getInitials(name)}</Avatar>
            <span>{name}</span>
          </Space>
        );
      }
    },
    {
      title: 'Thành viên',
      dataIndex: 'members',
      key: 'members',
      render: (members) => {
        const list = Array.isArray(members) ? members : [];
        return (
          <Avatar.Group maxCount={3} size="small">
            {list.map((member: any, idx: number) => {
              // member might be normalized {id, name, avatar} or backend shape {user_id: {...}, role: ...}
              const raw = member.user_id ?? member;
              const name = raw?.fullName ?? raw?.full_name ?? raw?.name ?? raw?.username ?? `User ${raw?.id ?? idx}`;
              const avatar = raw?.avatar ?? raw?.avatar_url ?? raw?.profile_picture ?? raw?.photo ?? null;
              const id = raw?.id ?? member.id ?? `m-${idx}`;
              return <Avatar key={id} src={avatar}>{!avatar && getInitials(name)}</Avatar>;
            })}
          </Avatar.Group>
        );
      }
    },
    {
      title: 'Khách hàng',
      dataIndex: 'customer',
      key: 'customer',
      ellipsis: true
    },
    {
      title: 'Ngân sách',
      dataIndex: 'budget',
      key: 'budget',
      sorter: (a, b) => (a.budget || 0) - (b.budget || 0),
      render: (budget: number) => formatCurrency(budget || 0)
    },
    {
      title: 'Đã chi',
      dataIndex: 'spent',
      key: 'spent',
      sorter: (a, b) => (a.spent || 0) - (b.spent || 0),
      render: (spent: number, record) => (
        <span style={{
          color: (spent || 0) > (record.budget || 0) ? '#ff4d4f' : '#52c41a'
        }}>
          {formatCurrency(spent || 0)}
        </span>
      )
    },
    {
      title: 'Thời gian',
      key: 'dateRange',
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          <div>{dayjs(record.startDate).format('DD/MM/YYYY')}</div>
          <div style={{ color: '#999' }}>đến</div>
          <div>{dayjs(record.endDate).format('DD/MM/YYYY')}</div>
        </div>
      )
    },
    {
      title: 'Hành động',
      key: 'action',
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record.id)}
          >
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex'}}>
        <div>
          <Button
            icon={<PlusOutlined />}
            type="primary"
            onClick={handleCreate}
          >
            Tạo dự án mới
          </Button>
        </div>
        &nbsp;&nbsp;&nbsp;
        <div>
          {selectedRowKeys && selectedRowKeys.length > 0 ? (
            <Button danger ghost onClick={deleteSelected} style={{ marginRight: 8, borderColor: '#ff4d4f' }}>
              Xóa ({selectedRowKeys.length})
            </Button>
          ) : null}
        </div>
      </div>

      <Table<Project>
        rowSelection={rowSelection}
        columns={columns}
        dataSource={projects}
        rowKey={(record) => record.id}
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total) => `Tổng ${total} dự án`,
        }}
        onChange={(pagination) => {
          const nextPage = pagination.current || 1;
          const nextSize = pagination.pageSize || 10;
          loadProjects(nextPage, nextSize);
        }}
        bordered
        scroll={{ x: 1800 }}
      />
    </div>
  );
};

export default ProjectManager;
