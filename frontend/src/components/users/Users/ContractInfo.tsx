import React from "react";
import { Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isSameOrAfter);
dayjs.extend(isBetween);

interface ContractData {
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

interface ContractInfoProps {
  data: {
    contract: ContractData;
  };
}

const ContractInfo: React.FC<ContractInfoProps> = ({ data }) => {
  const contractData = data.contract;

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
      title: "Bảo hiểm",
      dataIndex: ["insurance"],
      key: "insurance",
      render: (insurance: number) => insurance ? `${insurance.toLocaleString()} VND` : "Không có",
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
      <h2 className="mb-4 text-lg font-semibold">Thông tin hợp đồng</h2>
      <Table
        columns={columns}
        dataSource={[contractData]}
        rowKey="id"
        pagination={false}
        rowClassName={(record, index) => (index % 2 === 0 ? "row-even" : "row-odd")}
      />
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