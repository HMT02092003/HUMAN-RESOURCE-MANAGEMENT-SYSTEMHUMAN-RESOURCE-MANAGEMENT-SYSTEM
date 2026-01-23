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
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);
import constantConfig from "@/config/constant";

const { Dragger } = Upload;
const { Title, Text } = Typography;
const { statusOptions, Gender } = constantConfig;

const UserUpload = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const [roles, setRoles] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [chevrons, setChevrons] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const [rolesRes, deptsRes, chevronsRes, allUsersRes] = await Promise.all([
        roleService.getAllRoles({ limit: 1000 }),
        departmentService.getAllDepartments({ limit: 1000 }),
        chevronService.getAllChevrons({ limit: 1000 }),
        UserService.getAllUsersAllForSelect()
      ]);

      setRoles(rolesRes?.data?.results || rolesRes?.results || rolesRes?.data || rolesRes || []);
      setDepartments(deptsRes?.data?.results || deptsRes?.results || deptsRes?.data || deptsRes || []);
      setChevrons(chevronsRes?.data?.results || chevronsRes?.results || chevronsRes?.data || chevronsRes || []);
      setAllUsers(allUsersRes || []);
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
      { header: "Họ và tên", key: "fullName", width: 30 },
      { header: "Tên đăng nhập", key: "username", width: 20 },
      { header: "Mật khẩu", key: "password", width: 20 },
      { header: "Vai trò (Tên)", key: "roleName", width: 25 },
      { header: "Email", key: "email", width: 30 },
      { header: "Phòng ban (Tên)", key: "departmentName", width: 30 },
      { header: "Chức vụ (Tên)", key: "chevronName", width: 25 },
      { header: "Giới tính (Nam/Nữ)", key: "genderName", width: 15 },
      { header: "Số điện thoại", key: "phone", width: 20 },
      { header: "Ngày sinh (DD/MM/YYYY)", key: "birthday", width: 25 },
      { header: "Ngày bắt đầu (DD/MM/YYYY)", key: "startDate", width: 25 },
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

        worksheet?.eachRow((row: any, rowNumber: number) => {
          if (rowNumber > 1) {
            const rowData: any = {};
            row.eachCell({ includeEmpty: true }, (cell: any, colNumber: number) => {
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

        if (data.length === 0) {
          message.warning("Không tìm thấy dữ liệu trong file!");
          return;
        }

        // Map all data first and validate
        const mappedResults = data.map((row, idx) => mapExcelDataToUser(row, idx, data, allUsers));

        // Separate valid and invalid records
        const recordsToImport: any[] = [];
        const processResults: any[] = new Array(data.length).fill(null);

        mappedResults.forEach((res, idx) => {
          if (res.errors.length > 0) {
            processResults[idx] = {
              ...data[idx],
              status: "error",
              message: res.errors
            };
          } else {
            recordsToImport.push({ ...res.user, originalIndex: idx });
          }
        });

        // Send valid records to backend
        if (recordsToImport.length > 0) {
          const importData = recordsToImport.map(r => {
            const { originalIndex, ...userData } = r;
            return userData;
          });

          const response = await UserService.importUsers(importData);
          const backendResults = response?.results || [];

          backendResults.forEach((backendRes: any, i: number) => {
            const originalIndex = recordsToImport[i].originalIndex;
            processResults[originalIndex] = {
              ...data[originalIndex],
              status: backendRes.status,
              message: backendRes.message
            };
          });
        }

        setResults(processResults);
        const successCount = processResults.filter(r => r.status === "success").length;
        message.success(`Đã xử lý xong. Thành công: ${successCount}/${data.length}`);
      } catch (err: any) {
        console.error("Error processing Excel:", err);
        message.error(err.response?.data?.message || "Không thể xử lý file Excel. Vui lòng kiểm tra lại!");
      } finally {
        setUploading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const mapExcelDataToUser = (row: any, index: number, allData: any[], existingUsers: any[]) => {
    const errors: string[] = [];

    // Basic required fields
    if (!row.fullName) errors.push("Họ và tên là bắt buộc");
    if (!row.username) errors.push("Tên đăng nhập là bắt buộc");
    if (!row.email) errors.push("Email là bắt buộc");

    // Check duplicate username in file
    const duplicateUsernameInFile = allData.some((r, i) => i < index && r.username === row.username);
    if (duplicateUsernameInFile) errors.push("Tên đăng nhập bị trùng trong file");

    // Check duplicate email in file
    const duplicateEmailInFile = allData.some((r, i) => i < index && r.email === row.email);
    if (duplicateEmailInFile) errors.push("Email bị trùng trong file");

    // Check duplicate against existing users
    if (existingUsers.some(u => u.username === row.username)) errors.push("Tên đăng nhập đã tồn tại trong hệ thống");
    if (existingUsers.some(u => u.email === row.email)) errors.push("Email đã tồn tại trong hệ thống");

    // Map Role
    const role = roles.find(r => r.name.toLowerCase() === (row.roleName || "").toLowerCase());
    if (row.roleName && !role) {
      errors.push(`Vai trò "${row.roleName}" không tồn tại`);
    } else if (!row.roleName) {
      errors.push("Vai trò là bắt buộc");
    }
    const roleId = role?.id || null;

    // Map Department
    const dept = departments.find(d => d.name.toLowerCase() === (row.departmentName || "").toLowerCase());
    if (row.departmentName && !dept) {
      errors.push(`Phòng ban "${row.departmentName}" không tồn tại`);
    } else if (!row.departmentName) {
      errors.push("Phòng ban là bắt buộc");
    }
    const departmentId = dept?.id || null;

    // Map Chevron
    const chevron = chevrons.find(c => c.name.toLowerCase() === (row.chevronName || "").toLowerCase());
    if (row.chevronName && !chevron) {
      errors.push(`Chức vụ "${row.chevronName}" không tồn tại`);
    } else if (!row.chevronName) {
      errors.push("Chức vụ là bắt buộc");
    }
    const chevronId = chevron?.id || null;

    // Status default to Active (1) as requested
    const status = 1;

    // Map Gender
    const genderOption = Gender.find(g => g.value.toLowerCase() === (row.genderName || "").toLowerCase());
    if (row.genderName && !genderOption) {
      errors.push(`Giới tính "${row.genderName}" không hợp lệ (Phải là Nam/Nữ)`);
    }
    const gender = genderOption?.key || 1;

    // Parse Dates with format validation
    const parseDate = (val: any, fieldLabel: string) => {
      if (!val) return null;
      if (val instanceof Date) return val.toISOString();
      const valStr = String(val).trim();

      // Strict DD/MM/YYYY regex
      const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
      if (!dateRegex.test(valStr)) {
        errors.push(`${fieldLabel} phải có định dạng DD/MM/YYYY (VD: 01/01/1990)`);
        return null;
      }

      const d = dayjs(valStr, "DD/MM/YYYY", true);
      if (!d.isValid()) {
        errors.push(`${fieldLabel} không phải là ngày hợp lệ`);
        return null;
      }
      return d.toISOString();
    };

    const birthday = parseDate(row.birthday, "Ngày sinh");
    const startDate = parseDate(row.startDate, "Ngày bắt đầu");

    return {
      user: {
        fullName: row.fullName,
        username: row.username,
        password: row.password || "password123",
        roleId: roleId ? Number(roleId) : null,
        email: row.email,
        departmentId: departmentId ? Number(departmentId) : null,
        chevronId: chevronId ? Number(chevronId) : null,
        status: Number(status),
        gender: Number(gender),
        phone: String(row.phone || ""),
        birthday,
        startDate
      },
      errors
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
    {
      title: "Ghi chú",
      dataIndex: "message",
      key: "message",
      render: (messages: any) => {
        if (Array.isArray(messages)) {
          return (
            <Space direction="vertical" size={0}>
              {messages.map((msg, i) => (
                <Text key={i} type={msg === "Thành công" ? "success" : "danger"} style={{ fontSize: 12 }}>
                  • {msg}
                </Text>
              ))}
            </Space>
          );
        }
        return <Text>{messages}</Text>;
      }
    }
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
