import React, { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, DatePicker, message } from 'antd';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

interface ExpenseModalProps {
  visible: boolean;
  expense: any | null;
  onCancel: () => void;
  onSubmit: (values: any) => Promise<void>;
}

const EXPENSE_CATEGORIES = [
  { value: 'personnel', label: 'Chi phí nhân sự', icon: '👥' },
  { value: 'equipment', label: 'Thiết bị', icon: '💻' },
  { value: 'software', label: 'Phần mềm/License', icon: '📦' },
  { value: 'travel', label: 'Đi lại', icon: '✈️' },
  { value: 'marketing', label: 'Marketing', icon: '📢' },
  { value: 'infrastructure', label: 'Cơ sở hạ tầng', icon: '🏢' },
  { value: 'training', label: 'Đào tạo', icon: '📚' },
  { value: 'consulting', label: 'Tư vấn', icon: '💼' },
  { value: 'maintenance', label: 'Bảo trì', icon: '🔧' },
  { value: 'other', label: 'Khác', icon: '📝' },
];

const ExpenseModal: React.FC<ExpenseModalProps> = ({ visible, expense, onCancel, onSubmit }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    if (visible) {
      if (expense) {
        // Edit mode
        form.setFieldsValue({
          title: expense.title,
          description: expense.description,
          amount: expense.amount,
          category: expense.category,
          expense_date: expense.expense_date ? dayjs(expense.expense_date) : null,
        });
      } else {
        // Create mode
        form.resetFields();
        form.setFieldsValue({
          expense_date: dayjs(),
          category: 'other',
        });
      }
    }
  }, [visible, expense, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload = {
        ...values,
        expense_date: values.expense_date.format('YYYY-MM-DD'),
      };

      await onSubmit(payload);
      form.resetFields();
      message.success(expense ? 'Cập nhật chi tiêu thành công!' : 'Thêm chi tiêu thành công!');
    } catch (error: any) {
      console.error('Validation failed:', error);
      if (error.response) {
        message.error(error.response.data?.message || 'Có lỗi xảy ra!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={expense ? '✏️ Cập nhật chi tiêu' : '➕ Thêm chi tiêu mới'}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
      okText={expense ? 'Cập nhật' : 'Thêm'}
      cancelText="Hủy"
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 20 }}
      >
        <Form.Item
          name="title"
          label="Tên khoản chi tiêu"
          rules={[{ required: true, message: 'Vui lòng nhập tên khoản chi tiêu!' }]}
        >
          <Input placeholder="VD: Mua thiết bị server" />
        </Form.Item>

        <Form.Item
          name="amount"
          label="Số tiền (VNĐ)"
          rules={[
            { required: true, message: 'Vui lòng nhập số tiền!' },
            { type: 'number', min: 0, message: 'Số tiền phải lớn hơn 0!' }
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
            placeholder="0"
            min={0}
          />
        </Form.Item>

        <Form.Item
          name="category"
          label="Danh mục"
          rules={[{ required: true, message: 'Vui lòng chọn danh mục!' }]}
        >
          <Select placeholder="Chọn danh mục chi tiêu">
            {EXPENSE_CATEGORIES.map((cat) => (
              <Option key={cat.value} value={cat.value}>
                {cat.icon} {cat.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="expense_date"
          label="Ngày chi tiêu"
          rules={[{ required: true, message: 'Vui lòng chọn ngày chi tiêu!' }]}
        >
          <DatePicker 
            style={{ width: '100%' }} 
            format="DD/MM/YYYY"
            placeholder="Chọn ngày"
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="Mô tả chi tiết"
        >
          <TextArea 
            rows={4} 
            placeholder="Nhập mô tả chi tiết về khoản chi tiêu này..." 
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ExpenseModal;
