import React, { useState, useEffect } from 'react';
import { Button, Checkbox, Table, Spin, Select, message } from 'antd';
import { LeftCircleFilled, SaveFilled } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { roleService } from '@/service/roleService';
import config from '@/config/constant';

interface Permission {
  id: number;
  key: string;
  name: string;
  value: number;
  currentValue: number;
  scope?: number;
}

interface PermissionCategory {
  id: number;
  name: string;
  permissions: Permission[];
}

interface DecentralizationProps {
  id?: string;
}

const Decentralization: React.FC<DecentralizationProps> = ({ id }) => {
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<PermissionCategory[]>([]);
  const [permissionValues, setPermissionValues] = useState<{ [key: string]: number }>({});
  const [scopeValues, setScopeValues] = useState<{ [key: string]: number }>({});
  const router = useRouter();

  const fetchData = async () => {
    if (!id) {
      message.error('Thiếu ID vai trò');
      return;
    }

    try {
      setLoading(true);
      const permissionsData = await roleService.getRolePermissions(id);

      const initialPermissions: { [key: string]: number } = {};
      const initialScopes: { [key: string]: number } = {};

      if (permissionsData && permissionsData.length > 0) {
        permissionsData.forEach((category: PermissionCategory) => {
          category.permissions.forEach((permission: Permission) => {
            initialPermissions[permission.key] = permission.currentValue
              ? parseInt(permission.currentValue.toString())
              : 0;

            const scopeValue = permission.scope ? parseInt(permission.scope.toString()) : 1;
            initialScopes[permission.key] = scopeValue;
          });
        });
      }

      setPermissionValues(initialPermissions);
      setScopeValues(initialScopes);
      setPermissions(permissionsData);
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Có lỗi xảy ra khi tải dữ liệu phân quyền');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const onFinish = async () => {
    try {
      setLoading(true);
      await roleService.updateRolePermissions(id!, permissionValues, scopeValues);
      message.success('Cập nhật phân quyền thành công!');
      router.push('/roles');
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Có lỗi xảy ra khi cập nhật phân quyền');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (checked: boolean, row: Permission, permission: number) => {
    setPermissionValues(prev => {
      const currentValue = prev[row.key] || 0;
      const newValue = checked
        ? currentValue | permission
        : currentValue & ~permission;

      return {
        ...prev,
        [row.key]: newValue
      };
    });
  };

  const handleScopeChange = (value: number, row: Permission) => {
    setScopeValues(prev => ({
      ...prev,
      [row.key]: value
    }));
  };

  const renderCheckbox = (row: Permission, permission: number) => {
    const disabled = (row.value & permission) !== permission;
    const currentValue = permissionValues[row.key] || 0;
    const checked = (currentValue & permission) === permission;

    return (
      <Checkbox
        checked={checked}
        disabled={disabled}
        onChange={(e) => handlePermissionChange(e.target.checked, row, permission)}
      />
    );
  };

  const renderPermissionCategory = (category: PermissionCategory) => {
    const columns = [
      {
        title: "#",
        width: '5%',
        render: (text: string, record: any, index: number) => index + 1,
      },
      {
        title: category.name,
        dataIndex: 'name',
        key: 'name'
      },
      {
        title: "Tạo mới",
        dataIndex: 'value',
        key: 'valueC',
        width: '10%',
        align: 'center' as 'center',
        render: (value: any, row: any) => renderCheckbox(row, 8)
      },
      {
        title: "Xem",
        dataIndex: 'value',
        key: 'valueR',
        width: '10%',
        align: 'center' as 'center',
        render: (value: any, row: any) => renderCheckbox(row, 4)
      },
      {
        title: "Chỉnh sửa",
        dataIndex: 'value',
        key: 'valueU',
        width: '10%',
        align: 'center' as 'center',
        render: (value: any, row: any) => renderCheckbox(row, 2)
      },
      {
        title: "Xóa",
        dataIndex: 'value',
        key: 'valueD',
        width: '10%',
        align: 'center' as 'center',
        render: (value: any, row: any) => renderCheckbox(row, 1)
      },
      {
        title: "Duyệt",
        dataIndex: 'value',
        key: 'valueA',
        width: '10%',
        align: 'center' as 'center',
        render: (value: any, row: any) => renderCheckbox(row, 16)
      },
      {
        title: "Phạm vi",
        dataIndex: 'scope',
        key: 'scope',
        width: '10%',
        align: 'center' as 'center',
        render: (value: any, row: any) => (
          <Select
            style={{ width: 120 }}
            value={scopeValues[row.key] || 1}
            onChange={(value) => handleScopeChange(value, row)}
            options={[
              { value: config.permissionScope.global, label: config.scopeValues[config.permissionScope.global as keyof typeof config.scopeValues] },
              { value: config.permissionScope.department, label: config.scopeValues[config.permissionScope.department as keyof typeof config.scopeValues] },
              { value: config.permissionScope.personal, label: config.scopeValues[config.permissionScope.personal as keyof typeof config.scopeValues] },
            ]}
          />
        )
      }
    ];

    return <Table size="small" key={category.id} columns={columns} rowKey="id" dataSource={category.permissions} pagination={false} />;
  };

  if (!permissions.length) return <div className="content"><Spin size="large" /></div>;

  return (
    <div className="content">
      {permissions.map((category: PermissionCategory) => (
        <div key={category.id} className="mb-4">
          {renderPermissionCategory(category)}
        </div>
      ))}
      <div className="text-center" style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
        <Button onClick={() => router.back()} className="btn-margin-right">
          <LeftCircleFilled /> Trở về
        </Button>
        &nbsp;&nbsp;&nbsp;
        <Button
          onClick={onFinish}
          type="primary"
          loading={loading}
          className="btn-margin-right"
        >
          <SaveFilled /> Lưu
        </Button>
      </div>
    </div>
  );
};

export default Decentralization;