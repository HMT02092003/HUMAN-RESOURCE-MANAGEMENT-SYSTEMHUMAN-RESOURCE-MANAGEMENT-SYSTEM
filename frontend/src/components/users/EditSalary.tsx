"use client";

import React from 'react';
import SalaryDealsList from './SalaryDealsList';
import { useParams, useRouter } from 'next/navigation';
import { Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

interface EditSalaryProps {
  id?: string | number | string[];
}

const EditSalary: React.FC<EditSalaryProps> = ({ id }) => {
  const params = useParams();
  const router = useRouter();
  let userId: any = id || params?.id;
  if (Array.isArray(userId)) userId = userId[0];

  const handleBack = () => router.back();

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
          Quay lại
        </Button>
      </div>
      <SalaryDealsList userId={Number(userId)} />
    </div>
  );
};

export default EditSalary;
