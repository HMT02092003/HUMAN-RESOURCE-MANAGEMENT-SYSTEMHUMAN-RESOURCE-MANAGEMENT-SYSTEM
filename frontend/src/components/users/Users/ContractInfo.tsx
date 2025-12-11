import React, { useEffect, useState } from "react";
import { Space, Table, Tag, Spin, Button } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isBetween from "dayjs/plugin/isBetween";
import SalaryService from "@/service/salaryService";
import { ExcelExportButton } from '@/components/common/ExcelExport';
import type { ExcelColumn } from '@/components/common/ExcelExport';

dayjs.extend(isSameOrAfter);
dayjs.extend(isBetween);

interface ContractData {
  id?: number;
  contractType: {
    name: string;
    contractTerm: number;
  };
  startDate: string;
  activeDay: string;
  endDate: string;
  insurance: number;
  status: 'current' | 'upcoming' | 'past';
}

interface SalaryData {
  salary: number;
  allowances: Array<{
    id: number;
    name: string;
    amount: number;
  }>;
}

interface ContractInfoProps {
  data: {
    contract: ContractData | null | undefined;
    contracts?: ContractData[] | null;
  };
}

const ContractInfo: React.FC<ContractInfoProps> = ({ data }) => {
  const contractData = data?.contract ?? null;
  const contracts = (data?.contracts ?? (contractData ? [contractData] : [])) as ContractData[];
  const [salaryData, setSalaryData] = useState<Record<number, SalaryData>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSalaryData = async () => {
      if (!contracts || contracts.length === 0) return;

      setLoading(true);
      const salaryPromises = contracts
        .filter(c => c.id)
        .map(async (contract) => {
          try {
            const salary = await SalaryService.getSalaryByContractId(contract.id!);
            return { contractId: contract.id!, salary };
          } catch (error) {
            console.warn(`Failed to fetch salary for contract ${contract.id}`, error);
            return { contractId: contract.id!, salary: null };
          }
        });

      const results = await Promise.all(salaryPromises);
      const salaryMap: Record<number, SalaryData> = {};
      
      results.forEach(({ contractId, salary }) => {
        if (salary) {
          salaryMap[contractId] = salary;
        }
      });

      setSalaryData(salaryMap);
      setLoading(false);
    };

    fetchSalaryData();
  }, [contracts]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current':
        return 'green';
      case 'upcoming':
        return 'blue';
      case 'past':
        return 'gray';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'current':
        return 'Đang hiệu lực';
      case 'upcoming':
        return 'Sắp tới';
      case 'past':
        return 'Hết hạn';
      default:
        return status;
    }
  };

  // Excel column configuration for contracts
  const excelColumns: ExcelColumn[] = [
    {
      title: 'Loại hợp đồng',
      dataIndex: ['contractType', 'name'],
      width: 25
    },
    {
      title: 'Ngày ký',
      dataIndex: 'startDate',
      width: 15,
      render: (value: any) => value ? dayjs(value).format('DD/MM/YYYY') : ''
    },
    {
      title: 'Ngày bắt đầu',
      dataIndex: 'activeDay',
      width: 15,
      render: (value: any) => value ? dayjs(value).format('DD/MM/YYYY') : ''
    },
    {
      title: 'Ngày kết thúc',
      dataIndex: 'endDate',
      width: 15,
      render: (value: any) => value ? dayjs(value).format('DD/MM/YYYY') : ''
    },
    {
      title: 'Lương cơ bản (VND)',
      dataIndex: 'id',
      width: 20,
      render: (contractId: any) => {
        if (!contractId) return '';
        const salary = salaryData[contractId];
        return salary ? salary.salary.toLocaleString('vi-VN') : 'Chưa có thông tin';
      }
    },
    {
      title: 'Phụ cấp',
      dataIndex: 'id',
      width: 40,
      render: (contractId: any) => {
        if (!contractId) return '';
        const salary = salaryData[contractId];
        if (!salary || !salary.allowances || salary.allowances.length === 0) {
          return 'Không có';
        }
        return salary.allowances
          .map((a: any) => `${a.name}: ${a.amount.toLocaleString('vi-VN')} VND`)
          .join(', ');
      }
    },
    {
      title: 'Thời hạn (tháng)',
      dataIndex: ['contractType', 'contractTerm'],
      width: 15,
      render: (value: any) => value || 'Không giới hạn'
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 15,
      render: (value: any) => getStatusText(value)
    }
  ];

  const columns: ColumnsType<ContractData> = [
    {
      title: "Loại hợp đồng",
      dataIndex: ["contractType", "name"],
      key: "contractTypes.name",
      sorter: true,
    },
    {
      title: "Ngày ký",
      dataIndex: "startDate",
      key: "contractTypes.startDate",
      sorter: true,
      render: (date: string) => dayjs(date).format("DD/MM/YYYY"),
    },
    {
      title: "Ngày bắt đầu",
      dataIndex: "activeDay",
      key: "activeDay",
      render: (date: string) => dayjs(date).format("DD/MM/YYYY"),
    },
    {
      title: "Ngày kết thúc",
      dataIndex: "endDate",
      key: "contractTypes.endDate",
      sorter: true,
      render: (date: string) => date ? dayjs(date).format("DD/MM/YYYY") : " ",
    },
    {
      title: "Lương cơ bản",
      dataIndex: "id",
      key: "salary",
      render: (contractId: number) => {
        if (!contractId) return "—";
        const salary = salaryData[contractId];
        if (!salary) return "Chưa có thông tin";
        return `${salary.salary.toLocaleString('vi-VN')} VND`;
      },
    },
    {
      title: "Phụ cấp",
      dataIndex: "id",
      key: "allowances",
      render: (contractId: number) => {
        if (!contractId) return "—";
        const salary = salaryData[contractId];
        if (!salary || !salary.allowances || salary.allowances.length === 0) {
          return "Không có";
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {salary.allowances.map((allowance) => (
              <Tag key={allowance.id} color="blue">
                {allowance.name}: {allowance.amount.toLocaleString('vi-VN')} VND
              </Tag>
            ))}
          </div>
        );
      },
    },
    {
      title: "Thời hạn",
      dataIndex: ["contractType", "contractTerm"],
      key: "contractType.contractTerm",
      sorter: true,
      render: (term: number) => (term ? `${term} tháng` : "Không giới hạn"),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "contractTypes.status",
      fixed: "right" as const,
      sorter: true,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status === "current" ? "Đang hiệu lực" : status === "upcoming" ? "Sắp tới" : "Hết hạn"}
        </Tag>
      ),
    },
  ];

  return (
    <div className="contract-info-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="mb-4 text-lg font-semibold">Thông tin hợp đồng</h2>
        {contracts && contracts.length > 0 && (
          <ExcelExportButton
            data={contracts}
            columns={excelColumns}
            fileName="Thong_tin_hop_dong"
            title="THÔNG TIN HỢP ĐỒNG"
            description={`Tổng số: ${contracts.length} hợp đồng | Xuất ngày: ${dayjs().format('DD/MM/YYYY HH:mm')}`}
            type="primary"
            style={{
              backgroundColor: '#52c41a',
              border: 'none'
            }}
          >
            <DownloadOutlined />
            Xuất Excel
          </ExcelExportButton>
        )}
      </div>
      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={contracts}
          pagination={false}
          rowClassName={(_, index) => (index % 2 === 0 ? "row-even" : "row-odd")}
          locale={{ emptyText: "Chưa có hợp đồng" }}
          rowKey={(record) => record.id ? `contract-${record.id}` : `${record.contractType?.name}-${record.startDate}-${record.activeDay}`}
        />
      </Spin>
      <div className="mt-4">
        <Space>
          <Tag color="green">Đang hiệu lực</Tag>
          <Tag color="blue">Sắp tới</Tag>
          <Tag color="gray">Hết hạn</Tag>
        </Space>
      </div>
    </div>
  );
};

export default ContractInfo;