"use client";

import React, { useState, useEffect } from "react";
import { Upload, Button, message, Card, Table, Tag, Typography, Space, Divider } from "antd";
import { InboxOutlined, DownloadOutlined, ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { useRouter } from "next/navigation";
import UserService from "@/service/userService";
import { roleService } from "@/service/roleService";
import { departmentService } from "@/service/departmentService";
import { chevronService } from "@/service/chevronService";
import dayjs from "dayjs";
import constantConfig from "@/config/constant";

const { Dragger } = Upload;
const { Title, Text } = Typography;
const { statusOptions, Gender } = constantConfig;

const UserUpload = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  // Data for mapping
  const [roles, setRoles] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [chevrons, setChevrons] = useState<any[]>([]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const [rolesRes, deptsRes, chevronsRes] = await Promise.all([
        roleService.getAllRoles({ limit: 1000 }),
        departmentService.getAllDepartments({ limit: 1000 }),
        chevronService.getAllChevrons({ limit: 1000 })
      ]);

      setRoles(rolesRes?.data?.results || rolesRes?.results || rolesRes?.data || rolesRes || []);
      setDepartments(deptsRes?.data?.results || deptsRes?.results || deptsRes?.data || deptsRes || []);
      setChevrons(chevronsRes?.data?.results || chevronsRes?.results || chevronsRes?.data || chevronsRes || []);
    } catch (error) {
      console.error("Error fetching metadata:", error);
      message.error("Không thể tải dữ liệu danh mục. Vui lòng thử lại!");
    }
  };

  const handleDownloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Template");

    // Set columns
    worksheet.columns = [
      { header: "Họ và tên", key: "fullName", width: 25 },
      { header: "Tên đăng nhập", key: "username", width: 15 },
      { header: "Mật khẩu", key: "password", width: 15 },
      { header: "Vai trò (Tên)", key: "roleName", width: 20 },
      { header: "Email", key: "email", width: 25 },
      { header: "Phòng ban (Tên)", key: "departmentName", width: 20 },
      { header: "Chức vụ (Tên)", key: "chevronName", width: 20 },
      { header: "Trạng thái (Đang làm việc/Nghỉ việc/Thử việc)", key: "statusName", width: 20 },
      { header: "Giới tính (Nam/Nữ)", key: "genderName", width: 15 },
      { header: "Số điện thoại", key: "phone", width: 15 },
      { header: "Ngày sinh (DD/MM/YYYY)", key: "birthday", width: 20 },
      { header: "Ngày bắt đầu (DD/MM/YYYY)", key: "startDate", width: 20 },
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6E6' }
    };

    // Add example row
    worksheet.addRow({
      fullName: "Nguyễn Văn A",
      username: "nguyenvana",
      password: "password123",
      roleName: "Nhân viên",
      email: "vana@example.com",
      departmentName: "Phòng Kỹ thuật",
      chevronName: "Lập trình viên",
      statusName: "Đang làm việc",
      genderName: "Nam",
      phone: "0123456789",
      birthday: "01/01/1995",
      startDate: "01/01/2024"
    });

    // Add help sheet for valid names
    const helpSheet = workbook.addWorksheet("Danh mục hợp lệ");
    helpSheet.columns = [
      { header: "Vai trò", key: "role", width: 25 },
      { header: "Phòng ban", key: "dept", width: 25 },
      { header: "Chức vụ", key: "chevron", width: 25 },
    ];

    const maxLen = Math.max(roles.length, departments.length, chevrons.length);
    for (let i = 0; i < maxLen; i++) {
      helpSheet.addRow({
        role: roles[i]?.name || "",
        dept: departments[i]?.name || "",
        chevron: chevrons[i]?.name || ""
      });
    }
    helpSheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, "Mau_nhap_nhan_vien.xlsx");
  };

  const processExcel = async (file: File) => {
    const workbook = new ExcelJS.Workbook();
    const reader = new FileReader();

    reader.onload = async (e) => {
      setUploading(true);
      const buffer = e.target?.result;
      if (!buffer) return;

      try {
        await workbook.xlsx.load(buffer as ArrayBuffer);
        const worksheet = workbook.getWorksheet(1);
        const data: any[] = [];

        // Skip header row
        worksheet?.eachRow((row: any, rowNumber: number) => {
          if (rowNumber > 1) {
            const rowData: any = {};
            row.eachCell((cell: any, colNumber: number) => {
              const headerCell = worksheet.getRow(1).getCell(colNumber);
              const header = String(headerCell.value || "");
              const keyMap: any = {
                "Họ và tên": "fullName",
                "Tên đăng nhập": "username",
                "Mật khẩu": "password",
                "Vai trò (Tên)": "roleName",
                "Email": "email",
                "Phòng ban (Tên)": "departmentName",
                "Chức vụ (Tên)": "chevronName",
                "Trạng thái (Đang làm việc/Nghỉ việc/Thử việc)": "statusName",
                "Giới tính (Nam/Nữ)": "genderName",
                "Số điện thoại": "phone",
                "Ngày sinh (DD/MM/YYYY)": "birthday",
                "Ngày bắt đầu (DD/MM/YYYY)": "startDate"
              };
              if (keyMap[header]) {
                rowData[keyMap[header]] = cell.value;
              }
            });
            data.push(rowData);
          }
        });

        const importResults = [];
        for (const row of data) {
          try {
            const mappedData = mapExcelDataToUser(row);
            const res = await UserService.createUser(mappedData);
            importResults.push({
              ...row,
              status: "success",
              message: "Thành công"
            });
          } catch (err: any) {
            importResults.push({
              ...row,
              status: "error",
              message: err.response?.data?.message || err.message || "Lỗi không xác định"
            });
          }
        }
        setResults(importResults);
        message.success(`Xử lý xong ${importResults.length} bản ghi`);
      } catch (err) {
        console.error("Error processing Excel:", err);
        message.error("Không thể đọc file Excel. Vui lòng kiểm tra lại!");
      } finally {
        setUploading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const mapExcelDataToUser = (row: any) => {
    // Map Role
    const role = roles.find(r => r.name.toLowerCase() === (row.roleName || "").toLowerCase());
    const roleId = role?.id || 1; // Default to basic role if not found

    // Map Department
    const dept = departments.find(d => d.name.toLowerCase() === (row.departmentName || "").toLowerCase());
    const departmentId = dept?.id || null;

    // Map Chevron
    const chevron = chevrons.find(c => c.name.toLowerCase() === (row.chevronName || "").toLowerCase());
    const chevronId = chevron?.id || null;

    // Map Status
    const statusOption = statusOptions.find(s => s.label.toLowerCase() === (row.statusName || "").toLowerCase());
    const status = statusOption?.value || 1;

    // Map Gender
    const genderOption = Gender.find(g => g.value.toLowerCase() === (row.genderName || "").toLowerCase());
    const gender = genderOption?.key || 1;

    // Parse Dates
    const parseDate = (val: any) => {
      if (!val) return null;
      if (val instanceof Date) return val.toISOString();
      const d = dayjs(val, "DD/MM/YYYY");
      return d.isValid() ? d.toISOString() : null;
    };

    return {
      fullName: row.fullName,
      username: row.username,
      password: row.password || "password123",
      roleId: Number(roleId),
      email: row.email,
      departmentId: departmentId ? Number(departmentId) : null,
      chevronId: chevronId ? Number(chevronId) : null,
      status: Number(status),
      gender: Number(gender),
      phone: String(row.phone || ""),
      birthday: parseDate(row.birthday),
      startDate: parseDate(row.startDate)
    };
  };

  const columns = [
    { title: "Tên đăng nhập", dataIndex: "username", key: "username" },
    { title: "Họ và tên", dataIndex: "fullName", key: "fullName" },
    { title: "Vai trò", dataIndex: "roleName", key: "roleName" },
    {
      title: "Trạng thái xử lý",
      key: "processStatus",
      render: (_: any, record: any) => (
        <Tag color={record.status === "success" ? "green" : "red"}>
          {record.status === "success" ? <CheckCircleOutlined /> : <CloseCircleOutlined />} {record.status === "success" ? "Thành công" : "Thất bại"}
        </Tag>
      )
    },
    { title: "Ghi chú", dataIndex: "message", key: "message" }
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Title level={4}>Tải lên danh sách nhân viên</Title>
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push("/user")}
            >
              Quay lại
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleDownloadTemplate}
              style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
            >
              Tải file mẫu
            </Button>
          </Space>
        </div>

        <Divider />

        <Dragger
          accept=".xlsx, .xls"
          multiple={false}
          beforeUpload={(file) => {
            processExcel(file);
            return false;
          }}
          showUploadList={false}
          disabled={uploading}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Nhấp vào đây hoặc kéo thả file Excel vào để tải lên</p>
          <p className="ant-upload-hint">
            Vui lòng sử dụng file mẫu để đảm bảo dữ liệu được nhập chính xác.
          </p>
        </Dragger>
      </Card>

      {results.length > 0 && (
        <Card title={`Kết quả xử lý (${results.length} bản ghi)`}>
          <Table
            dataSource={results}
            columns={columns}
            rowKey={(record, idx) => `res-${idx}`}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      )}
    </Space>
  );
};

export default UserUpload;
