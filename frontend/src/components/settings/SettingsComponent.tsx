'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, Card, Form, TimePicker, InputNumber, Button, message, Spin, Row, Col } from 'antd';
import { SaveOutlined, SettingOutlined, ClockCircleOutlined, DollarCircleOutlined, CalendarOutlined, ReloadOutlined } from '@ant-design/icons';
import moment from 'moment';
import SettingsService from '../../service/settingsService';

// CSS cho TimePicker hover effect
const timePickerStyle = {
  width: '100%',
  transition: 'all 0.3s ease',
  borderRadius: '6px',
};

const { TabPane } = Tabs;

interface SettingsComponentProps {
  onSave?: (data: any) => void;
  initialData?: any;
  loading?: boolean;
}

interface WorkingHoursConfig {
  start: string;
  end: string;
}

interface LunchBreakConfig {
  start: string;
  end: string;
}

interface OvertimeRateConfig {
  rate: number;
}

interface HolidayRateConfig {
  rate: number;
}

interface SettingsData {
  WorkingHours: WorkingHoursConfig;
  LunchBreak: LunchBreakConfig;
  OvertimeRate: OvertimeRateConfig;
  HolidayRate: HolidayRateConfig;
}

const SettingsComponent: React.FC<SettingsComponentProps> = ({
  onSave,
  initialData,
  loading: externalLoading = false
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('workingHours');
  
  // Cấu hình mặc định
  const defaultSettings: SettingsData = {
    WorkingHours: { start: '08:00', end: '17:00' },
    LunchBreak: { start: '12:00', end: '13:00' },
    OvertimeRate: { rate: 1.5 },
    HolidayRate: { rate: 3.0 }
  };
  
  const [settingsData, setSettingsData] = useState<SettingsData>(defaultSettings);

   const transformBackendData = (backendData: any[]): SettingsData => {
    if (!Array.isArray(backendData) || backendData.length === 0) {
      return defaultSettings;
    }

    // Convert từ array format sang object format
    const transformedData: any = {};
    
    backendData.forEach(item => {
      if (item.key && item.value) {
        transformedData[item.key] = item.value;
      }
    });

    console.log('Transformed data from backend:', transformedData);
    
    // Validate và merge với default settings
    return {
      WorkingHours: {
        start: transformedData?.WorkingHours?.start || defaultSettings.WorkingHours.start,
        end: transformedData?.WorkingHours?.end || defaultSettings.WorkingHours.end
      },
      LunchBreak: {
        start: transformedData?.LunchBreak?.start || defaultSettings.LunchBreak.start,
        end: transformedData?.LunchBreak?.end || defaultSettings.LunchBreak.end
      },
      OvertimeRate: {
        rate: transformedData?.OvertimeRate?.rate || defaultSettings.OvertimeRate.rate
      },
      HolidayRate: {
        rate: transformedData?.HolidayRate?.rate || defaultSettings.HolidayRate.rate
      }
    };
  };

 const fetchSettings = async () => {
    try {
      setFetchLoading(true);
      console.log('Đang lấy thông tin settings từ backend...');
      
      const response = await SettingsService.getAllSettings();
      console.log('Raw settings data từ backend:', response);
      
      if (response && Array.isArray(response) && response.length > 0) {
        // Transform dữ liệu từ backend format
        const transformedData = transformBackendData(response);
        console.log('Transformed settings data:', transformedData);
        
        setSettingsData(transformedData);
        updateFormFields(transformedData);
      } else {
        console.log('Không có dữ liệu từ backend, sử dụng default settings');
        setSettingsData(defaultSettings);
        updateFormFields(defaultSettings);
      }
    } catch (error: any) {
      console.error('Lỗi khi lấy settings:', error);
      
      // Fallback về default settings nếu có lỗi
      setSettingsData(defaultSettings);
      updateFormFields(defaultSettings);
      
      // Hiển thị thông báo lỗi
      if (error?.response?.status === 404) {
        message.warning('Chưa có cấu hình trong hệ thống. Đang sử dụng cấu hình mặc định.');
      } else if (error?.response?.status >= 500) {
        message.error('Lỗi server khi tải cấu hình. Đang sử dụng cấu hình mặc định.');
      } else {
        message.error('Không thể kết nối đến server. Đang sử dụng cấu hình mặc định.');
      }
    } finally {
      setFetchLoading(false);
    }
  };
  
  useEffect(() => {
    // Ưu tiên initialData nếu có, nếu không thì fetch từ backend
    if (initialData) {
      console.log('Sử dụng initialData:', initialData);
      
      // Kiểm tra xem initialData có phải là array format từ backend không
      let processedData;
      if (Array.isArray(initialData)) {
        processedData = transformBackendData(initialData);
      } else {
        // Nếu đã là object format, validate như cũ
        processedData = validateAndMergeSettings(initialData);
      }
      
      setSettingsData(processedData);
      updateFormFields(processedData);
    } else {
      console.log('Không có initialData, fetch từ backend...');
      fetchSettings();
    }
  }, [initialData]);

  // Hàm validate và merge dữ liệu với default settings
  const validateAndMergeSettings = (data: any): SettingsData => {
    return {
      WorkingHours: {
        start: data?.WorkingHours?.start || defaultSettings.WorkingHours.start,
        end: data?.WorkingHours?.end || defaultSettings.WorkingHours.end
      },
      LunchBreak: {
        start: data?.LunchBreak?.start || defaultSettings.LunchBreak.start,
        end: data?.LunchBreak?.end || defaultSettings.LunchBreak.end
      },
      OvertimeRate: {
        rate: data?.OvertimeRate?.rate || defaultSettings.OvertimeRate.rate
      },
      HolidayRate: {
        rate: data?.HolidayRate?.rate || defaultSettings.HolidayRate.rate
      }
    };
  };

  const updateFormFields = (data: SettingsData) => {
    try {
      form.setFieldsValue({
        workingHoursStart: moment(data.WorkingHours.start, 'HH:mm'),
        workingHoursEnd: moment(data.WorkingHours.end, 'HH:mm'),
        lunchBreakStart: moment(data.LunchBreak.start, 'HH:mm'),
        lunchBreakEnd: moment(data.LunchBreak.end, 'HH:mm'),
        overtimeRate: data.OvertimeRate.rate,
        holidayRate: data.HolidayRate.rate,
      });
    } catch (error) {
      console.error('Error updating form fields:', error);
      // Nếu có lỗi, sử dụng cấu hình mặc định
      form.setFieldsValue({
        workingHoursStart: moment(defaultSettings.WorkingHours.start, 'HH:mm'),
        workingHoursEnd: moment(defaultSettings.WorkingHours.end, 'HH:mm'),
        lunchBreakStart: moment(defaultSettings.LunchBreak.start, 'HH:mm'),
        lunchBreakEnd: moment(defaultSettings.LunchBreak.end, 'HH:mm'),
        overtimeRate: defaultSettings.OvertimeRate.rate,
        holidayRate: defaultSettings.HolidayRate.rate,
      });
    }
  };

  const validateTimeLogic = (values: any) => {
    const workStart = moment(values.workingHoursStart);
    const workEnd = moment(values.workingHoursEnd);
    const lunchStart = moment(values.lunchBreakStart);
    const lunchEnd = moment(values.lunchBreakEnd);

    // Kiểm tra thời gian làm việc
    if (workEnd.isSameOrBefore(workStart)) {
      throw new Error('Giờ kết thúc làm việc phải sau giờ bắt đầu');
    }

    // Kiểm tra thời gian nghỉ trưa
    if (lunchEnd.isSameOrBefore(lunchStart)) {
      throw new Error('Giờ kết thúc nghỉ trưa phải sau giờ bắt đầu nghỉ trưa');
    }

    // Kiểm tra thời gian nghỉ trưa phải nằm trong giờ hành chính
    if (lunchStart.isBefore(workStart) || lunchStart.isAfter(workEnd)) {
      throw new Error('Giờ bắt đầu nghỉ trưa phải nằm trong giờ hành chính');
    }

    if (lunchEnd.isBefore(workStart) || lunchEnd.isAfter(workEnd)) {
      throw new Error('Giờ kết thúc nghỉ trưa phải nằm trong giờ hành chính');
    }

    // Kiểm tra tỷ lệ OT
    if (values.overtimeRate <= 0) {
      throw new Error('Tỷ lệ OT ngày thường phải lớn hơn 0');
    }

    if (values.holidayRate <= 0) {
      throw new Error('Tỷ lệ OT ngày lễ phải lớn hơn 0');
    }

    // Kiểm tra tỷ lệ OT ngày lễ phải cao hơn ngày thường
    if (values.holidayRate <= values.overtimeRate) {
      throw new Error('Tỷ lệ OT ngày lễ phải cao hơn tỷ lệ OT ngày thường');
    }

    return true;
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      console.log('Form values to save:', values);

      // Validate business logic
      validateTimeLogic(values);

      const updatedSettings = {
        WorkingHours: {
          start: values.workingHoursStart.format('HH:mm') || defaultSettings.WorkingHours.start,
          end: values.workingHoursEnd.format('HH:mm') || defaultSettings.WorkingHours.end
        },
        LunchBreak: {
          start: values.lunchBreakStart.format('HH:mm') || defaultSettings.LunchBreak.start,
          end: values.lunchBreakEnd.format('HH:mm') || defaultSettings.LunchBreak.end
        },
        OvertimeRate: {
          rate: parseFloat(values.overtimeRate.toFixed(2)) || defaultSettings.OvertimeRate.rate
        },
        HolidayRate: {
          rate: parseFloat(values.holidayRate.toFixed(2)) || defaultSettings.HolidayRate.rate
        }
      };

      console.log('Settings to save:', updatedSettings);

      // Gọi API để lưu settings
      let savedSettings;
      if (onSave) {
        // Nếu có callback từ parent component
        savedSettings = await onSave(updatedSettings);
      } else {
        // Gọi trực tiếp SettingsService
        savedSettings = await SettingsService.updateSettings(updatedSettings);
      }

      console.log('Saved settings response:', savedSettings);

      // Cập nhật state với dữ liệu đã lưu
      const finalSettings = savedSettings || updatedSettings;
      setSettingsData(finalSettings);

      message.success('Cấu hình đã được lưu thành công!');
      
      // Tự động tải lại để đảm bảo đồng bộ với server
      setTimeout(() => {
        fetchSettings();
      }, 1000);

    } catch (error: any) {
      console.error('Settings save error:', error);
      
      if (error?.message) {
        message.error(error.message);
      } else if (error?.response?.data?.error) {
        message.error(`Lỗi server: ${error.response.data.error}`);
      } else if (error?.response?.data?.message) {
        message.error(error.response.data.message);
      } else if (error?.response?.status === 500) {
        message.error('Lỗi server nội bộ. Vui lòng thử lại sau!');
      } else if (error?.response?.status >= 400) {
        message.error('Dữ liệu không hợp lệ. Vui lòng kiểm tra lại!');
      } else {
        message.error('Không thể kết nối đến server. Vui lòng thử lại!');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    // Nếu có initialData từ backend, sử dụng nó. Nếu không, dùng default settings
    const dataToReset = initialData ? validateAndMergeSettings(initialData) : defaultSettings;
    updateFormFields(dataToReset);
    message.info('Đã khôi phục về giá trị ban đầu');
  };

  const renderWorkingHoursTab = () => (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ClockCircleOutlined style={{ color: '#1890ff' }} />
          <span>Cấu hình thời gian hành chính</span>
        </div>
      }
      style={{ marginBottom: 0 }}
    >
      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Form.Item
            label="Giờ bắt đầu làm việc"
            name="workingHoursStart"
            rules={[
              { required: true, message: 'Vui lòng chọn giờ bắt đầu!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const endTime = getFieldValue('workingHoursEnd');
                  if (!value || !endTime) {
                    return Promise.resolve();
                  }
                  if (moment(value).isSameOrAfter(moment(endTime))) {
                    return Promise.reject(new Error('Giờ bắt đầu phải trước giờ kết thúc!'));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <TimePicker
              format="HH:mm"
              placeholder="Chọn giờ bắt đầu"
              style={timePickerStyle}
              size="large"
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="Giờ kết thúc làm việc"
            name="workingHoursEnd"
            rules={[
              { required: true, message: 'Vui lòng chọn giờ kết thúc!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const startTime = getFieldValue('workingHoursStart');
                  if (!value || !startTime) {
                    return Promise.resolve();
                  }
                  if (moment(value).isSameOrBefore(moment(startTime))) {
                    return Promise.reject(new Error('Giờ kết thúc phải sau giờ bắt đầu!'));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <TimePicker
              format="HH:mm"
              placeholder="Chọn giờ kết thúc"
              style={timePickerStyle}
              size="large"
              minuteStep={15}
              allowClear={false}
              showNow={false}
              use12Hours={false}
              inputReadOnly={false}
            />
          </Form.Item>
        </Col>
      </Row>

      <div style={{
        background: '#f6ffed',
        border: '1px solid #b7eb8f',
        borderRadius: '6px',
        padding: '16px',
        marginTop: '24px'
      }}>
        <p style={{ margin: '0 0 8px 0', color: '#52c41a', fontWeight: 600 }}>
          <strong>Lưu ý:</strong>
        </p>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li style={{ color: '#666', marginBottom: '4px' }}>
            Thời gian hành chính áp dụng cho tất cả nhân viên
          </li>
          <li style={{ color: '#666', marginBottom: '4px' }}>
            Nhân viên cần chấm công trong khung giờ này
          </li>
          <li style={{ color: '#666', marginBottom: '4px' }}>
            Thời gian ngoài khung giờ sẽ được tính là làm thêm giờ
          </li>
        </ul>
      </div>
    </Card>
  );

  const renderLunchBreakTab = () => (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarOutlined style={{ color: '#1890ff' }} />
          <span>Cấu hình thời gian nghỉ trưa</span>
        </div>
      }
      style={{ marginBottom: 0 }}
    >
      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Form.Item
            label="Giờ bắt đầu nghỉ trưa"
            name="lunchBreakStart"
            rules={[
              { required: true, message: 'Vui lòng chọn giờ bắt đầu nghỉ trưa!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value) return Promise.resolve();
                  
                  const workStart = getFieldValue('workingHoursStart');
                  const workEnd = getFieldValue('workingHoursEnd');
                  const lunchEnd = getFieldValue('lunchBreakEnd');
                  
                  if (workStart && moment(value).isBefore(moment(workStart))) {
                    return Promise.reject(new Error('Giờ nghỉ trưa phải trong giờ hành chính!'));
                  }
                  
                  if (workEnd && moment(value).isAfter(moment(workEnd))) {
                    return Promise.reject(new Error('Giờ nghỉ trưa phải trong giờ hành chính!'));
                  }
                  
                  if (lunchEnd && moment(value).isSameOrAfter(moment(lunchEnd))) {
                    return Promise.reject(new Error('Giờ bắt đầu nghỉ trưa phải trước giờ kết thúc!'));
                  }
                  
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <TimePicker
              format="HH:mm"
              placeholder="Chọn giờ bắt đầu nghỉ trưa"
              style={timePickerStyle}
              size="large"
              minuteStep={15}
              allowClear={false}
              showNow={false}
              use12Hours={false}
              inputReadOnly={false}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="Giờ kết thúc nghỉ trưa"
            name="lunchBreakEnd"
            rules={[
              { required: true, message: 'Vui lòng chọn giờ kết thúc nghỉ trưa!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value) return Promise.resolve();
                  
                  const workStart = getFieldValue('workingHoursStart');
                  const workEnd = getFieldValue('workingHoursEnd');
                  const lunchStart = getFieldValue('lunchBreakStart');
                  
                  if (workStart && moment(value).isBefore(moment(workStart))) {
                    return Promise.reject(new Error('Giờ nghỉ trưa phải trong giờ hành chính!'));
                  }
                  
                  if (workEnd && moment(value).isAfter(moment(workEnd))) {
                    return Promise.reject(new Error('Giờ nghỉ trưa phải trong giờ hành chính!'));
                  }
                  
                  if (lunchStart && moment(value).isSameOrBefore(moment(lunchStart))) {
                    return Promise.reject(new Error('Giờ kết thúc nghỉ trưa phải sau giờ bắt đầu!'));
                  }
                  
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <TimePicker
              format="HH:mm"
              placeholder="Chọn giờ kết thúc nghỉ trưa"
              style={timePickerStyle}
              size="large"
              minuteStep={15}
              allowClear={false}
              showNow={false}
              use12Hours={false}
              inputReadOnly={false}
            />
          </Form.Item>
        </Col>
      </Row>

      <div style={{
        background: '#fff7e6',
        border: '1px solid #ffd591',
        borderRadius: '6px',
        padding: '16px',
        marginTop: '24px'
      }}>
        <p style={{ margin: '0 0 8px 0', color: '#fa8c16', fontWeight: 600 }}>
          <strong>Lưu ý:</strong>
        </p>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li style={{ color: '#666', marginBottom: '4px' }}>
            Thời gian nghỉ trưa không được tính vào giờ làm việc
          </li>
          <li style={{ color: '#666', marginBottom: '4px' }}>
            Nhân viên không thể chấm công trong thời gian nghỉ trưa
          </li>
          <li style={{ color: '#666', marginBottom: '4px' }}>
            Thời gian này sẽ được trừ tự động khi tính lương
          </li>
        </ul>
      </div>
    </Card>
  );

  const renderOvertimeRateTab = () => (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DollarCircleOutlined style={{ color: '#1890ff' }} />
          <span>Cấu hình tỉ lệ OT ngày thường</span>
        </div>
      }
      style={{ marginBottom: 0 }}
    >
      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Form.Item
            label="Tỉ lệ OT ngày thường (x lần lương cơ bản)"
            name="overtimeRate"
            rules={[
              { required: true, message: 'Vui lòng nhập tỉ lệ OT!' },
              { type: 'number', min: 1, message: 'Tỉ lệ OT phải lớn hơn hoặc bằng 1' },
              { type: 'number', max: 10, message: 'Tỉ lệ OT không được vượt quá 10' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const holidayRate = getFieldValue('holidayRate');
                  if (value && holidayRate && value >= holidayRate) {
                    return Promise.reject(new Error('Tỉ lệ OT ngày thường phải nhỏ hơn tỉ lệ OT ngày lễ!'));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <InputNumber
              min={1}
              max={10}
              step={0.1}
              precision={1}
              placeholder="Nhập tỉ lệ OT"
              style={{ width: '100%' }}
              size="large"
              formatter={(value) => `${value}x`}
              parser={(value) => value!.replace('x', '') as any}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <div style={{
            background: '#f0f9ff',
            border: '1px solid #91d5ff',
            borderRadius: '6px',
            padding: '16px',
            height: '100%',
            display: 'flex',
            alignItems: 'center'
          }}>
            <div>
              <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: '#1890ff' }}>
                Tỉ lệ hiện tại
              </p>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                {settingsData?.OvertimeRate?.rate || defaultSettings.OvertimeRate.rate}x
              </p>
            </div>
          </div>
        </Col>
      </Row>

      <div style={{
        background: '#f6ffed',
        border: '1px solid #b7eb8f',
        borderRadius: '6px',
        padding: '16px',
        marginTop: '24px'
      }}>
        <p style={{ margin: '0 0 8px 0', color: '#52c41a', fontWeight: 600 }}>
          <strong>Lưu ý:</strong>
        </p>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li style={{ color: '#666', marginBottom: '4px' }}>
            Tỉ lệ OT ngày thường áp dụng cho các ngày từ Thứ 2 đến Thứ 6
          </li>
          <li style={{ color: '#666', marginBottom: '4px' }}>
            Theo quy định pháp luật, tỉ lệ OT tối thiểu là 1.5x
          </li>
          <li style={{ color: '#666', marginBottom: '4px' }}>
            Tỉ lệ này sẽ được áp dụng cho tất cả nhân viên làm thêm giờ
          </li>
        </ul>
      </div>
    </Card>
  );

  const renderHolidayRateTab = () => (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DollarCircleOutlined style={{ color: '#1890ff' }} />
          <span>Cấu hình tỉ lệ OT ngày lễ</span>
        </div>
      }
      style={{ marginBottom: 0 }}
    >
      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Form.Item
            label="Tỉ lệ OT ngày lễ (x lần lương cơ bản)"
            name="holidayRate"
            rules={[
              { required: true, message: 'Vui lòng nhập tỉ lệ OT ngày lễ!' },
              { type: 'number', min: 2, message: 'Tỉ lệ OT ngày lễ phải lớn hơn hoặc bằng 2' },
              { type: 'number', max: 10, message: 'Tỉ lệ OT ngày lễ không được vượt quá 10' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const overtimeRate = getFieldValue('overtimeRate');
                  if (value && overtimeRate && value <= overtimeRate) {
                    return Promise.reject(new Error('Tỉ lệ OT ngày lễ phải lớn hơn tỉ lệ OT ngày thường!'));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <InputNumber
              min={2}
              max={10}
              step={0.1}
              precision={1}
              placeholder="Nhập tỉ lệ OT ngày lễ"
              style={{ width: '100%' }}
              size="large"
              formatter={(value) => `${value}x`}
              parser={(value) => value!.replace('x', '') as any}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <div style={{
            background: '#fff2e8',
            border: '1px solid #ffbb96',
            borderRadius: '6px',
            padding: '16px',
            height: '100%',
            display: 'flex',
            alignItems: 'center'
          }}>
            <div>
              <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: '#fa541c' }}>
                Tỉ lệ hiện tại
              </p>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#fa541c' }}>
                {settingsData?.HolidayRate?.rate || defaultSettings.HolidayRate.rate}x
              </p>
            </div>
          </div>
        </Col>
      </Row>

      <div style={{
        background: '#fff7e6',
        border: '1px solid #ffd591',
        borderRadius: '6px',
        padding: '16px',
        marginTop: '24px'
      }}>
        <p style={{ margin: '0 0 8px 0', color: '#fa8c16', fontWeight: 600 }}>
          <strong>Lưu ý:</strong>
        </p>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li style={{ color: '#666', marginBottom: '4px' }}>
            Tỉ lệ OT ngày lễ áp dụng cho các ngày lễ, tết và chủ nhật
          </li>
          <li style={{ color: '#666', marginBottom: '4px' }}>
            Theo quy định pháp luật, tỉ lệ OT ngày lễ tối thiểu là 3.0x
          </li>
          <li style={{ color: '#666', marginBottom: '4px' }}>
            Mức lương này cao hơn để khuyến khích nhân viên làm việc vào ngày lễ
          </li>
        </ul>
      </div>
    </Card>
  );

  return (
    <div>
      <style jsx global>{`
        .ant-picker:hover {
          border-color: #40a9ff !important;
          box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2) !important;
          transform: translateY(-1px);
        }
        
        .ant-picker-focused {
          border-color: #40a9ff !important;
          box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2) !important;
        }
        
        .ant-picker {
          transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1) !important;
        }
        
        .ant-input-number:hover {
          border-color: #40a9ff !important;
          transform: translateY(-1px);
        }
        
        .ant-input-number-focused {
          border-color: #40a9ff !important;
          box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2) !important;
        }
      `}</style>
      
      <Spin spinning={loading || externalLoading || fetchLoading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          size="large"
          style={{ margin: 0 }}
        >
          <TabPane
            tab={
              <span>
                <ClockCircleOutlined />
                Thời gian hành chính
              </span>
            }
            key="workingHours"
          >
            {renderWorkingHoursTab()}
          </TabPane>

          <TabPane
            tab={
              <span>
                <CalendarOutlined />
                Thời gian nghỉ trưa
              </span>
            }
            key="lunchBreak"
          >
            {renderLunchBreakTab()}
          </TabPane>

          <TabPane
            tab={
              <span>
                <DollarCircleOutlined />
                OT ngày thường
              </span>
            }
            key="overtimeRate"
          >
            {renderOvertimeRateTab()}
          </TabPane>

          <TabPane
            tab={
              <span>
                <DollarCircleOutlined />
                OT ngày lễ
              </span>
            }
            key="holidayRate"
          >
            {renderHolidayRateTab()}
          </TabPane>
        </Tabs>

        <div style={{
          padding: '24px',
          background: '#fafafa',
          borderTop: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'center',
          gap: '12px'
        }}>
          <Button
            icon={<ReloadOutlined />}
            size="large"
            onClick={handleReset}
            style={{ minWidth: '120px' }}
          >
            Khôi phục
          </Button>
          <Button
            icon={<SettingOutlined />}
            size="large"
            onClick={fetchSettings}
            loading={fetchLoading}
            style={{ minWidth: '120px' }}
          >
            Tải lại
          </Button>
          <Button
            type="primary"
            htmlType='submit'
            icon={<SaveOutlined />}
            size="large"
            onClick={handleSave}
            loading={loading}
            style={{ minWidth: '120px' }}
          >
            Lưu cấu hình
          </Button>
        </div>
      </Form>
    </Spin>
    </div>
  );
};

export default SettingsComponent;
