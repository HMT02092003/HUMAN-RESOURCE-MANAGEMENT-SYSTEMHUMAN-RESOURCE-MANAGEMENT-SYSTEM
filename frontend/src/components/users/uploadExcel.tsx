// @ts-nocheck
import React, { useState } from 'react';
import useBaseHook from '@src/hooks/BaseHook';
import dynamic from 'next/dynamic';
import to from 'await-to-js';
import _ from 'lodash';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import useSWR from "swr";
import roleService from "@src/services/roleService";
import departmentService from "@root/src/services/departmentService";
import chevronService from "@root/src/services/chevronService";

import BaseUploadExcel from '@root/src/components/Excel/BaseUploadExcel';
import userService from '@src/services/userService';
import constantConfig from "@config/constant";

const { Gender, statusOptions, Relationship } = constantConfig

const Layout = dynamic(() => import('@src/layouts/Admin'), { ssr: false });

const UploadExcel = () => {
  const { t, notify, getData, redirect } = useBaseHook();
  const [errorUploads, setError] = useState({ data: [], total: 0, pageSize: 10, countErrorRecord: 0 });
  const [warringUploads, setWarring] = useState({ data: [], total: 0, pageSize: 5, countWarringRecord: 0 });
  const [loading, setLoading] = useState(false);


  const { data: dataR } = useSWR("roleData", () =>
    roleService().withAuth().select2({ pageSize: -1 })
  );

  const { data: dataD } = useSWR("departmentData", () =>
    departmentService().withAuth().select2({ pageSize: -1 })
  );

  const { data: dataC } = useSWR("chevronData", () =>
    chevronService().withAuth().select2({ pageSize: -1 })
  );

  const roles = getData(dataR, "data", []);
  const departments = getData(dataD, "data", []);
  const chevrons = getData(dataC, "data", []);

  // const options = roles.data.data.map(item => item.label);
  // const formulaString = `"${options.join(",")}"`;

  const defaultStartRow = 4;

  const defaultColumns = [
    {
      index: 0,
      name: "username",
      width: 20,
      label: t("pages:users.form.username")
    },
    {
      index: 1,
      name: "password",
      width: 20,
      label: t("pages:users.form.password")
    },
    {
      index: 2,
      name: "fullName",
      width: 30,
      label: "Họ và tên"
    },
    {
      index: 3,
      name: "email",
      width: 30,
      label: t("pages:users.form.email")

    },
    {
      index: 4,
      name: "roleName",
      width: 20,
      label: t("pages:users.form.role")

    },
    {
      index: 6,
      name: "birthday",
      width: 20,
      label: t("pages:users.form.birthday")

    },
    {
      index: 7,
      name: "gender",
      width: 20,
      label: t("pages:users.form.gender")

    },
    {
      index: 8,
      name: "phone",
      width: 20,
      label: t("pages:users.form.phone")

    },
    {
      index: 9,
      name: "status",
      width: 20,
      label: t("pages:users.form.status")

    },
    {
      index: 10,
      name: "startDateUser",
      width: 20,
      label: t("pages:users.form.startDateUser")

    },
    {
      index: 11,
      name: "chevron",
      width: 20,
      label: t("pages:users.form.chevron")

    },
    {
      index: 12,
      name: "department",
      width: 20,
      label: t("pages:users.form.department")

    },
    {
      index: 13,
      name: "contractType",
      width: 20,
      label: t("pages:users.form.contract")
    },
    {
      index: 14,
      name: "insurance",
      width: 20,
      label: t("pages:users.form.insurance")
    },
    {
      index: 15,
      name: "startDate",
      width: 20,
      label: t("pages:users.form.startDate")
    },
    {
      index: 16,
      name: "activeDay",
      width: 25,
      label: t("pages:users.form.activeDay")
    },
  ];

  const generateExampleData = (column) => {
    switch (column.name) {
      case 'username': return 'nguyen.van.a';
      case 'fullName': return 'Nguyễn Văn A';
      case 'email': return 'nguyen.van.a@example.com';
      case 'status': return 'Đang làm việc';
      default: return '';
    }
  };

  const handleDownloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('User');

    // Merge toàn bộ cột ở dòng 1 để làm tiêu đề chính
    const totalColumns = defaultColumns.length;
    worksheet.mergeCells(1, 1, 1, totalColumns);
    worksheet.getCell(1, 1).value = "Mẫu xuất Excel";
    worksheet.getCell(1, 1).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell(1, 1).font = { bold: true, size: 14 };

    // Header dòng 2: chứa thông tin đến department, sau đó là "Hợp đồng"
    const headerRow2 = defaultColumns.map(col => col.label);
    worksheet.addRow(headerRow2);

    defaultColumns.forEach((col, index) => {
      worksheet.getColumn(index + 1).width = col.width;
    });

    // Merge các cột của nhóm "Hợp đồng"
    const contractStartIndex = defaultColumns.findIndex(col => col.name === "contractType") + 1;
    worksheet.mergeCells(2, contractStartIndex, 2, totalColumns);
    worksheet.getCell(2, contractStartIndex).value = "Hợp đồng";
    worksheet.getCell(2, contractStartIndex).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell(2, contractStartIndex).font = { bold: true }; defaultColumns

    // Dòng 3: Trống từ đầu đến department, sau đó là các trường thông tin gia đình
    const row3 = defaultColumns.map((col, index) => {
      if (index < contractStartIndex - 1) {
        return '';
      }else{
        return col.label;
      }
    });
    worksheet.addRow(row3);

    worksheet.mergeCells(2, 1, 3, 1);
    worksheet.mergeCells(2, 2, 3, 2);
    worksheet.mergeCells(2, 3, 3, 3);
    worksheet.mergeCells(2, 4, 3, 4);
    worksheet.mergeCells(2, 5, 3, 5);
    worksheet.mergeCells(2, 6, 3, 6);
    worksheet.mergeCells(2, 7, 3, 7);
    worksheet.mergeCells(2, 8, 3, 8);
    worksheet.mergeCells(2, 9, 3, 9);
    worksheet.mergeCells(2, 10, 3, 10);
    worksheet.mergeCells(2, 11, 3, 11);
    worksheet.mergeCells(2, 12, 3, 12);
    worksheet.mergeCells(2, 13, 3, 13);

    // Định dạng header
    [2, 3].forEach(rowIndex => {
      worksheet.getRow(rowIndex).eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D3D3D3' } }; // màu xám
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
    });

    // Dòng 4: Dữ liệu mẫu
    const exampleData = defaultColumns.map(col => generateExampleData(col));
    worksheet.addRow(exampleData);

    // Xuất file Excel
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'Mau_xuat_Excel.xlsx');
  };


  const onSubmit = async (values: any) => {
    setLoading(true);
    let { file } = values;

    let [userError, user]: [any, any] = await to(
      userService().withAuth().importExcel({ users: file })
    );
    setLoading(false);
    setError(_.get(userError, 'data.error', { data: [], total: 0, pageSize: 10, countErrorRecord: 0 }));
    setWarring({ data: user?.warring || [], total: user?.warring?.length || 0, pageSize: 5, countWarringRecord: user?.warring?.length || 0 });

    if (userError) {
      return notify(t(`errors:${userError.code}`), '', 'error');
    }
    notify(t('messages:message.uploadExcelSuccess'));
    redirect("frontend.admin.users.index");
  };

  return (
    <BaseUploadExcel
      defaultColumns={defaultColumns}
      defaultStartRow={defaultStartRow}
      onSubmit={onSubmit}
      loading={loading}
      warringUploads={warringUploads}
      errorUploads={errorUploads}
      parentPageLink={'frontend.admin.users.index'}
      exampleUploadFile={handleDownloadTemplate}
    />
  );
};

UploadExcel.Layout = (props) => {
  const { t } = useBaseHook();
  return (
    <Layout
      title={t('pages:users.upload.title')}
      description={t('pages:users.upload.description')}
      {...props}
    />
  );
};

UploadExcel.permissions = {
  "users": 'C',
};

export default UploadExcel;
