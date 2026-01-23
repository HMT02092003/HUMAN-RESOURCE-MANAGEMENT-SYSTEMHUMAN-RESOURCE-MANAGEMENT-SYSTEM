'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Space, Tag, Progress, Avatar, Modal, message } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { ServerSideTable } from '@/components/common/ServerSideTable';
import type { ServerSideColumnType } from '@/components/common/ServerSideTable/types';
import { usePermission } from "@/hooks/usePermission";
import CheckPermission from "@/components/common/CheckPermission";
import { useRouter } from 'next/navigation';
import { Project } from '@/types/project';
import { useAuth } from '@/hooks/useAuth';
import dayjs from 'dayjs';
import jobService from '@/service/jobService';
import { ExcelExportButton } from '@/components/common/ExcelExport';
import type { ExcelColumn } from '@/components/common/ExcelExport';

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
  const [excelData, setExcelData] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [userScope, setUserScope] = useState<string | null>(null);
  const { user, userId } = useAuth();

  // ServerSideTable will trigger fetchData; no immediate load here

  const getInitials = (name: string) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // fetchData will be used by ServerSideTable
  const fetchData = useCallback(async (params: any) => {
    setLoading(true);
    try {
      // Backend expects 0-based page index. Convert 1-based `page` to 0-based for API if necessary
      const apiParams = { ...params };
      if (apiParams.page && apiParams.page >= 1) apiParams.page = Math.max(0, apiParams.page - 1);

      const resp: any = await jobService.getAllProjectByScope(apiParams);
      const body = resp?.data ?? resp;
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

      const mapped = (items || []).map((p: any) => {
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

      if (body?.scope) {
        setUserScope(body.scope);
      }

      return {
        data: mapped,
        total: totalCount,
        pagination: {
          page: payload?.pagination?.page ?? (params.page ?? 1),
          pageSize: payload?.pagination?.pageSize ?? (params.limit ?? params.pageSize ?? 10),
          total: totalCount
        }
      };
    } catch (err) {
      console.error('fetchData projects error', err);
      return { data: [], total: 0, pagination: { page: params.page ?? 1, pageSize: params.limit ?? params.pageSize ?? 10, total: 0 } };
    } finally {
      setLoading(false);
    }
  }, []);

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
          setRefreshTrigger(prev => prev + 1);
        } catch (err) {
          console.error('Failed to delete projects', err);
          message.error('Xóa dự án thất bại');
        }
      }
    });
  };

  // Table row selection handled via ServerSideTable's onSelectionChange

  const handleDelete = (project: Project) => {
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: `Bạn có chắc chắn muốn xóa dự án "${project.name}"?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      async onOk() {
        try {
          await jobService.deleteProject([project.id]);
          message.success('Đã xóa dự án thành công!');
          setRefreshTrigger((s) => s + 1);
        } catch (err) {
          console.error('Failed to delete project', err);
          message.error('Xóa dự án thất bại');
        }
      }
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const columns: ServerSideColumnType<Project>[] = [
    {
      title: 'Mã dự án',
      dataIndex: 'id',
      key: 'id',
      fixed: 'left',
      sorter: true,
      filterType: 'text',
      searchField: 'id'
    },
    {
      title: 'Tên dự án',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      ellipsis: true,
      filterType: 'text',
      searchField: 'name',
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
      filterType: 'select',
      filterOptions: Object.keys(statusLabels).map(key => ({ value: key, label: statusLabels[key as keyof typeof statusLabels] })),
      searchField: 'status',
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
      sorter: true,
      filterType: 'number',
      searchField: 'progress',
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
      filterType: 'text',
      searchField: 'manager',
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
      ellipsis: true,
      filterType: 'text',
      searchField: 'customer'
    },
    {
      title: 'Ngân sách',
      dataIndex: 'budget',
      key: 'budget',
      sorter: true,
      filterType: 'number',
      searchField: 'budget',
      render: (budget: number) => formatCurrency(budget || 0)
    },
    {
      title: 'Đã chi',
      dataIndex: 'spent',
      key: 'spent',
      sorter: true,
      filterType: 'number',
      searchField: 'spent',
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
      filterType: 'dateRange',
      searchField: 'startDate',
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
      render: (_, record) => {
        const isAdmin = user?.role === 'admin' || user?.role === 1 || String(user?.role) === '1';
        const isPM = record.manager?.id === userId;
        const isPublicStatus = ['active', 'completed'].includes(record.status);
        const canView = isAdmin || isPM || isPublicStatus;

        return (
          <Space size="small">
            {canView && (
              <CheckPermission permissionKey="projects" requiredType="read">
                <Button
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={() => handleViewDetail(record.id)}
                >
                </Button>
              </CheckPermission>
            )}
            {userScope !== 'personal' && (
              <>
                <CheckPermission permissionKey="projects" requiredType="update">
                  <Button
                    type="link"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(record)}
                  >
                  </Button>
                </CheckPermission>
                <CheckPermission permissionKey="projects" requiredType="delete">
                  <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(record)}
                  >
                  </Button>
                </CheckPermission>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  const excelColumns: ExcelColumn[] = [
    { title: 'Mã dự án', dataIndex: 'id', width: 15 },
    { title: 'Tên dự án', dataIndex: 'name', width: 30 },
    { title: 'Mô tả', dataIndex: 'description', width: 40 },
    { title: 'Trạng thái', dataIndex: 'status', width: 20, render: (val: any) => statusLabels[val as keyof typeof statusLabels] || val },
    { title: 'Tiến độ (%)', dataIndex: 'progress', width: 15 },
    { title: 'Ngày bắt đầu', dataIndex: 'start_date', width: 15, render: (val: any) => val ? dayjs(val).format('DD/MM/YYYY') : '' },
    { title: 'Ngày kết thúc', dataIndex: 'end_date', width: 15, render: (val: any) => val ? dayjs(val).format('DD/MM/YYYY') : '' }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {userScope !== 'personal' && (
          <CheckPermission permissionKey="projects" requiredType="create">
            <Button
              icon={<PlusOutlined />}
              type="primary"
              onClick={handleCreate}
            >
              Tạo dự án mới
            </Button>
          </CheckPermission>
        )}
        <CheckPermission permissionKey="projects" requiredType="delete">
          {selectedRowKeys && selectedRowKeys.length > 0 && (
            <Button danger ghost onClick={deleteSelected} style={{ borderColor: '#ff4d4f' }}>
              Xóa dự án ({selectedRowKeys.length})
            </Button>
          )}
        </CheckPermission>
        <ExcelExportButton
          data={excelData}
          columns={excelColumns}
          fileName={`danh-sach-du-an-${dayjs().format('YYYY-MM-DD')}`}
          title="DANH SÁCH DỰ ÁN"
          description={`Xuất ngày ${dayjs().format('DD/MM/YYYY')}`}
        />
      </div>
      <ServerSideTable<Project>
        columns={columns}
        fetchData={fetchData}
        rowKey={(record) => String(record.id)}
        showSelection
        onSelectionChange={(keys, rows) => {
          setSelectedRowKeys(keys);
          setSelectedRows(rows);
        }}
        onDataChange={useCallback((data: any, pagination: any) => {
          setExcelData(data as Project[]);
        }, [])}
        defaultPageSize={10}
        refreshTrigger={refreshTrigger}
        bordered
        scroll={{ x: 1800 }}
      />
    </div>
  );
};

export default ProjectManager;
