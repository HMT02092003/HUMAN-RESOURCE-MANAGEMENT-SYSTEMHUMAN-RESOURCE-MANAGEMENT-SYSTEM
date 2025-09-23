import React, { useEffect, useState } from "react";
import { Form, Row, Col, Select, DatePicker, Input, InputNumber, Button } from "antd";
import dayjs from "dayjs"; // Thư viện để xử lý ngày
import { LeftCircleFilled, SaveFilled } from "@ant-design/icons";
import { contractTypeService } from "@/service/contractTypeService";

const { Option } = Select;

interface ContractType {
  id: number;
  name: string;
  description?: string;
  contractTerm: number;
  insurance?: number;
}

interface ContractFormProps {
  initialValues?: any;
  onFinish: (values: any) => void;
  onBack: () => void;
  loading?: boolean;
}

const ContractForm: React.FC<ContractFormProps> = ({ 
  initialValues, 
  onFinish, 
  onBack,
  loading 
}) => {
  const [form] = Form.useForm();
  const [contractDescription, setContractDescription] = useState("");
  const [contractTypes, setContractTypes] = useState<ContractType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);

  // Hàm để tính toán ngày kết thúc hợp đồng
  const calculateEndDate = (startDate: dayjs.Dayjs, contractTerm: number) => {
    if (!startDate || !contractTerm) return null;

    let endDate = dayjs(startDate).add(contractTerm, 'month');

    if (dayjs(startDate).date() === 29 && dayjs(startDate).month() === 1) { 
      if (endDate.date() !== 29) {
        endDate = endDate.add(1, 'day'); 
      }
    }

    return endDate.startOf('day');
  };
  

  const handleStartDateChange = (date: dayjs.Dayjs) => {
    const selectedContractId = form.getFieldValue("contractTypeId");
    const selectedContract = contractTypes.find(item => item.id === selectedContractId);
    
    if (date && selectedContract) {
      const contractTerm = selectedContract.contractTerm; 
      const endDate = calculateEndDate(date, contractTerm); 
      form.setFieldsValue({ endDate }); 
    } else {
      form.setFieldsValue({ endDate: null }); 
    }
  };

  const handleContractChange = (value: number) => {
    const selectedContract = contractTypes.find(item => item.id === value);
    const activeDay = form.getFieldValue("activeDay");

    if (selectedContract) {
      const { contractTerm, insurance, description } = selectedContract;
      form.setFieldsValue({ contractTerm, insurance }); // Cập nhật giá trị cho thời hạn và mức bảo hiểm
      setContractDescription(description || "");

      const endDate = calculateEndDate(activeDay, contractTerm); // Tính toán ngày kết thúc
      form.setFieldsValue({ endDate }); // Cập nhật giá trị cho ngày kết thúc
    } else {
      form.setFieldsValue({ contractTerm: null, insurance: null }); // Nếu không có hợp đồng, đặt là null
      setContractDescription("");
    }
  };

  const handleFinish = (values: any) => {
    // Contract is optional: if no fields selected, return empty object to let BE create user only
    const hasAnyValue = values && Object.values(values).some((v) => v !== undefined && v !== null && v !== "");
    if (!hasAnyValue) {
      onFinish({});
      return;
    }
    const formattedValues = {
      ...values,
      startDate: values.startDate?.toISOString(),
      activeDay: values.activeDay?.toISOString(),
      endDate: values.endDate?.toISOString(),
    };
    onFinish(formattedValues);
  };

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        ...initialValues,
        startDate: initialValues.startDate ? dayjs(initialValues.startDate) : null,
        activeDay: initialValues.activeDay ? dayjs(initialValues.activeDay) : null,
        endDate: initialValues.endDate ? dayjs(initialValues.endDate) : null
      });
    }
  }, [initialValues, form]);

  // Load contract types from API
  useEffect(() => {
    const loadTypes = async () => {
      try {
        setLoadingTypes(true);
        const types = await contractTypeService.getAllContractTypes();
        setContractTypes(types || []);
      } catch (_) {
        setContractTypes([]);
      } finally {
        setLoadingTypes(false);
      }
    };
    loadTypes();
  }, []);

  return (
    <Form 
      form={form}
      name="Contract"
      layout="vertical"
      onFinish={handleFinish}
      scrollToFirstError
    >
      <Row gutter={[24, 0]}>
        <Col xs={24} md={12}>
          <Form.Item
            label="Loại hợp đồng"
            name="contractTypeId"
          >
              <Select
              placeholder="Chọn loại hợp đồng"
              allowClear
              showSearch
                onChange={handleContractChange}
                loading={loadingTypes}
            >
              {contractTypes.map((item) => (
                <Option value={item.id} key={item.id} title={item.description}>
                  <div>
                    <strong>{item.name}</strong>
                    <br />
                    <span>{item.description}</span>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="Thời hạn hợp đồng"
            name="contractTerm"
          >
            <Input 
              disabled 
              addonAfter="Tháng"
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="Bảo hiểm"
            name="insurance"
          >
            <InputNumber
              style={{ width: '100%' }}
              addonAfter="VND"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="Ngày ký"
            name="startDate"
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!getFieldValue("contractTypeId")) {
                    return Promise.resolve();
                  }
                  if (!value) {
                    return Promise.reject(new Error("Vui lòng chọn ngày ký hợp đồng"));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="Ngày bắt đầu"
            name="activeDay"
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!getFieldValue("contractTypeId")) {
                    return Promise.resolve();
                  }
                  if (!value) {
                    return Promise.reject(new Error("Vui lòng chọn ngày bắt đầu hợp đồng"));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" onChange={handleStartDateChange} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="Ngày kết thúc"
            name="endDate"
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" disabled />
          </Form.Item>
        </Col>
      </Row>

      <Row justify="center" gutter={16}>
        <Col>
          <Button
            icon={<LeftCircleFilled />}
            onClick={onBack}
          >
            Quay lại
          </Button>
        </Col>
        <Col>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveFilled />}
            loading={loading}
          >
            Hoàn thành
          </Button>
        </Col>
      </Row>
    </Form>
  );
};

export default ContractForm;