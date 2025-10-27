"use client";

import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import SalaryForm from './Users/SalaryForm';
import UserService from '@/service/userService';
import SalaryService from '@/service/salaryService';
import { Spin, message } from 'antd';
import { useParams, useRouter } from 'next/navigation';

interface EditSalaryProps {
  id?: string | number | string[];
}

const EditSalary: React.FC<EditSalaryProps> = ({ id }) => {
  const params = useParams();
  const router = useRouter();
  let userId: any = id || params?.id;
  if (Array.isArray(userId)) userId = userId[0];

  const [loading, setLoading] = useState(false);
  const [initialValues, setInitialValues] = useState<any>({ salary: 0, allowance: 0, allowances: [] });
  const [allowanceTypes, setAllowanceTypes] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;
    const fetch = async () => {
      setLoading(true);
      try {
    // use salary service helper to read employee salary profile
    const data = await SalaryService.getEmployeeSalaryProfile(Number(userId));
        setInitialValues({
          salary: Number(data.salary || 0),
          allowance: Number(data.allowance || 0),
          tax_code: data.tax_code || '',
          bank_name: data.bank_info?.bank_name || '',
          bank_account: data.bank_info?.bank_account || '',
          effective_from: data.effective_from ? dayjs(data.effective_from) : null,
          allowance_type_ids: data.allowances ? data.allowances.map((a: any) => a.allowance_type_id) : [],
          // keep full allowance objects so the form can show amounts per allowance
          allowances: data.allowances || [],
        });
      } catch (err) {
        message.error('Không thể tải thông tin lương');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [userId]);

  useEffect(() => {
    const loadTypes = async () => {
      try {
  const res = await SalaryService.listAllowanceTypes({ page: 1, pageSize: 1000 });
  const list = Array.isArray(res) ? res : (res && res.data) ? res.data : [];
  setAllowanceTypes(list);
      } catch (err) {
        // non-blocking
        console.error('Could not load allowance types', err);
      }
    };
    loadTypes();
  }, []);

  const handleBack = () => router.back();

  const handleFinish = async (values: any) => {
    setLoading(true);
    try {
      await SalaryService.upsertEmployeeSalaryProfile(Number(userId), values);
      message.success('Lưu thông tin lương thành công');
      router.push('/user');
    } catch (err: any) {
      const data = err?.response?.data;
      message.error(data?.message || 'Có lỗi khi lưu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
        </div>
      ) : (
        <SalaryForm
          onFinish={handleFinish}
          onBack={handleBack}
          loading={loading}
          initialValues={initialValues}
          allowanceTypes={allowanceTypes}
        />
      )}
    </div>
  );
};

export default EditSalary;
