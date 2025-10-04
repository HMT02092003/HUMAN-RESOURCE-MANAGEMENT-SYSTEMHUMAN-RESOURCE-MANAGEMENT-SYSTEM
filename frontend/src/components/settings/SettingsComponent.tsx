'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, Card, Form, TimePicker, InputNumber, Button, message, Spin, Row, Col, Checkbox, Typography, Space } from 'antd';
import { SaveOutlined, SettingOutlined, ClockCircleOutlined, DollarCircleOutlined, CalendarOutlined, ReloadOutlined, ScheduleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import SettingsService from '../../service/settingsService';

// Configure dayjs plugins
dayjs.extend(customParseFormat);
dayjs.extend(utc);

// CSS cho TimePicker hover effect
const timePickerStyle = {
  width: '100%',
};

const { TabPane } = Tabs;
const { Title, Text } = Typography;

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

interface PenaltyRateConfig {
  rate: number;
}

interface UnauthorizedAbsencePenaltyRateConfig {
  rate: number;
}

interface WorkingDaysConfig {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

interface SettingsData {
  WorkingHours: WorkingHoursConfig;
  LunchBreak: LunchBreakConfig;
  OvertimeRate: OvertimeRateConfig;
  HolidayRate: HolidayRateConfig;
  PenaltyRate: PenaltyRateConfig;
  UnauthorizedAbsencePenaltyRate: UnauthorizedAbsencePenaltyRateConfig;
  WorkingDays: WorkingDaysConfig;
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
    HolidayRate: { rate: 3.0 },
    PenaltyRate: { rate: 0.001 },
    UnauthorizedAbsencePenaltyRate: { rate: 5 },
    WorkingDays: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    }
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
      },
      PenaltyRate: {
        rate: transformedData?.PenaltyRate?.rate || defaultSettings.PenaltyRate.rate
      },
      UnauthorizedAbsencePenaltyRate: {
        rate: transformedData?.UnauthorizedAbsencePenaltyRate?.rate || defaultSettings.UnauthorizedAbsencePenaltyRate.rate
      },
      WorkingDays: {
        monday: transformedData?.WorkingDays?.monday ?? defaultSettings.WorkingDays.monday,
        tuesday: transformedData?.WorkingDays?.tuesday ?? defaultSettings.WorkingDays.tuesday,
        wednesday: transformedData?.WorkingDays?.wednesday ?? defaultSettings.WorkingDays.wednesday,
        thursday: transformedData?.WorkingDays?.thursday ?? defaultSettings.WorkingDays.thursday,
        friday: transformedData?.WorkingDays?.friday ?? defaultSettings.WorkingDays.friday,
        saturday: transformedData?.WorkingDays?.saturday ?? defaultSettings.WorkingDays.saturday,
        sunday: transformedData?.WorkingDays?.sunday ?? defaultSettings.WorkingDays.sunday
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
      },
      PenaltyRate: {
        rate: data?.PenaltyRate?.rate || defaultSettings.PenaltyRate.rate
      },
      UnauthorizedAbsencePenaltyRate: {
        rate: data?.UnauthorizedAbsencePenaltyRate?.rate || defaultSettings.UnauthorizedAbsencePenaltyRate.rate
      },
      WorkingDays: {
        monday: data?.WorkingDays?.monday ?? defaultSettings.WorkingDays.monday,
        tuesday: data?.WorkingDays?.tuesday ?? defaultSettings.WorkingDays.tuesday,
        wednesday: data?.WorkingDays?.wednesday ?? defaultSettings.WorkingDays.wednesday,
        thursday: data?.WorkingDays?.thursday ?? defaultSettings.WorkingDays.thursday,
        friday: data?.WorkingDays?.friday ?? defaultSettings.WorkingDays.friday,
        saturday: data?.WorkingDays?.saturday ?? defaultSettings.WorkingDays.saturday,
        sunday: data?.WorkingDays?.sunday ?? defaultSettings.WorkingDays.sunday
      }
    };
  };

  const updateFormFields = (data: SettingsData) => {
    try {
      // Create time values that work with Antd TimePicker
      const startTime = data.WorkingHours.start.split(':');
      const endTime = data.WorkingHours.end.split(':');
      const lunchStartTime = data.LunchBreak.start.split(':');
      const lunchEndTime = data.LunchBreak.end.split(':');
      
      form.setFieldsValue({
        workingHoursStart: dayjs().hour(parseInt(startTime[0])).minute(parseInt(startTime[1])).second(0),
        workingHoursEnd: dayjs().hour(parseInt(endTime[0])).minute(parseInt(endTime[1])).second(0),
        lunchBreakStart: dayjs().hour(parseInt(lunchStartTime[0])).minute(parseInt(lunchStartTime[1])).second(0),
        lunchBreakEnd: dayjs().hour(parseInt(lunchEndTime[0])).minute(parseInt(lunchEndTime[1])).second(0),
        overtimeRate: data.OvertimeRate.rate,
        holidayRate: data.HolidayRate.rate,
        penaltyRate: data.PenaltyRate.rate,
        unauthorizedAbsencePenaltyRate: data.UnauthorizedAbsencePenaltyRate.rate,
        workingDays: {
          monday: data.WorkingDays.monday,
          tuesday: data.WorkingDays.tuesday,
          wednesday: data.WorkingDays.wednesday,
          thursday: data.WorkingDays.thursday,
          friday: data.WorkingDays.friday,
          saturday: data.WorkingDays.saturday,
          sunday: data.WorkingDays.sunday,
        }
      });
      
      // Clear validation errors sau khi set values
      setTimeout(() => {
        form.validateFields().catch(() => {
          // Ignore validation errors on initial load
        });
      }, 100);
    } catch (error) {
      console.error('Error updating form fields:', error);
      // Nếu có lỗi, sử dụng cấu hình mặc định
      // Create default time values
      const defaultStartTime = defaultSettings.WorkingHours.start.split(':');
      const defaultEndTime = defaultSettings.WorkingHours.end.split(':');
      const defaultLunchStartTime = defaultSettings.LunchBreak.start.split(':');
      const defaultLunchEndTime = defaultSettings.LunchBreak.end.split(':');
      
      form.setFieldsValue({
        workingHoursStart: dayjs().hour(parseInt(defaultStartTime[0])).minute(parseInt(defaultStartTime[1])).second(0),
        workingHoursEnd: dayjs().hour(parseInt(defaultEndTime[0])).minute(parseInt(defaultEndTime[1])).second(0),
        lunchBreakStart: dayjs().hour(parseInt(defaultLunchStartTime[0])).minute(parseInt(defaultLunchStartTime[1])).second(0),
        lunchBreakEnd: dayjs().hour(parseInt(defaultLunchEndTime[0])).minute(parseInt(defaultLunchEndTime[1])).second(0),
        overtimeRate: defaultSettings.OvertimeRate.rate,
        holidayRate: defaultSettings.HolidayRate.rate,
        penaltyRate: defaultSettings.PenaltyRate.rate,
        unauthorizedAbsencePenaltyRate: defaultSettings.UnauthorizedAbsencePenaltyRate.rate,
        workingDays: {
          monday: defaultSettings.WorkingDays.monday,
          tuesday: defaultSettings.WorkingDays.tuesday,
          wednesday: defaultSettings.WorkingDays.wednesday,
          thursday: defaultSettings.WorkingDays.thursday,
          friday: defaultSettings.WorkingDays.friday,
          saturday: defaultSettings.WorkingDays.saturday,
          sunday: defaultSettings.WorkingDays.sunday,
        }
      });
      
      // Clear validation errors sau khi set default values
      setTimeout(() => {
        form.validateFields().catch(() => {
          // Ignore validation errors on initial load
        });
      }, 100);
    }
  };

  const validateTimeLogic = (values: any) => {
    // Lấy giá trị thời gian và chuyển về format HH:mm để so sánh
    const workStartTime = dayjs(values.workingHoursStart).format('HH:mm');
    const workEndTime = dayjs(values.workingHoursEnd).format('HH:mm');
    const lunchStartTime = dayjs(values.lunchBreakStart).format('HH:mm');
    const lunchEndTime = dayjs(values.lunchBreakEnd).format('HH:mm');

    // Kiểm tra thời gian làm việc
    if (workEndTime <= workStartTime) {
      throw new Error('Giờ kết thúc làm việc phải sau giờ bắt đầu');
    }

    // Kiểm tra thời gian nghỉ trưa
    if (lunchEndTime <= lunchStartTime) {
      throw new Error('Giờ kết thúc nghỉ trưa phải sau giờ bắt đầu nghỉ trưa');
    }

    // Kiểm tra thời gian nghỉ trưa phải nằm trong giờ hành chính
    if (lunchStartTime < workStartTime || lunchStartTime > workEndTime) {
      throw new Error('Giờ bắt đầu nghỉ trưa phải nằm trong giờ hành chính');
    }

    if (lunchEndTime < workStartTime || lunchEndTime > workEndTime) {
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

    // Kiểm tra tỷ lệ phạt
    if (values.penaltyRate < 0.0001) {
      throw new Error('Tỷ lệ phạt đi muộn/về sớm phải lớn hơn hoặc bằng 0.0001');
    }

    if (values.penaltyRate > 1) {
      throw new Error('Tỷ lệ phạt đi muộn/về sớm không được vượt quá 1.0');
    }

    // Kiểm tra tỷ lệ phạt nghỉ không phép
    if (values.unauthorizedAbsencePenaltyRate < 0) {
      throw new Error('Tỷ lệ phạt nghỉ không phép không được âm');
    }

    if (values.unauthorizedAbsencePenaltyRate > 100) {
      throw new Error('Tỷ lệ phạt nghỉ không phép không được vượt quá 100% tổng lương tháng');
    }

    // Kiểm tra ngày làm việc - phải có ít nhất 1 ngày
    if (values.workingDays) {
      const hasAtLeastOneDay = Object.values(values.workingDays).some(day => day === true);
      if (!hasAtLeastOneDay) {
        throw new Error('Vui lòng chọn ít nhất 1 ngày làm việc trong tuần!');
      }
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
          rate: parseFloat(values.overtimeRate) || defaultSettings.OvertimeRate.rate
        },
        HolidayRate: {
          rate: parseFloat(values.holidayRate) || defaultSettings.HolidayRate.rate
        },
        PenaltyRate: {
          rate: parseFloat(values.penaltyRate) || defaultSettings.PenaltyRate.rate
        },
        UnauthorizedAbsencePenaltyRate: {
          rate: parseFloat(values.unauthorizedAbsencePenaltyRate) || defaultSettings.UnauthorizedAbsencePenaltyRate.rate
        },
        WorkingDays: {
          monday: values.workingDays?.monday ?? defaultSettings.WorkingDays.monday,
          tuesday: values.workingDays?.tuesday ?? defaultSettings.WorkingDays.tuesday,
          wednesday: values.workingDays?.wednesday ?? defaultSettings.WorkingDays.wednesday,
          thursday: values.workingDays?.thursday ?? defaultSettings.WorkingDays.thursday,
          friday: values.workingDays?.friday ?? defaultSettings.WorkingDays.friday,
          saturday: values.workingDays?.saturday ?? defaultSettings.WorkingDays.saturday,
          sunday: values.workingDays?.sunday ?? defaultSettings.WorkingDays.sunday
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
                  if (dayjs(value).isAfter(endTime) || dayjs(value).isSame(endTime)) {
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
              showNow={false}
              use12Hours={false}
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
                  if (dayjs(value).isBefore(startTime) || dayjs(value).isSame(startTime)) {
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
              showNow={false}
              use12Hours={false}
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
            validateTrigger={['onBlur', 'onSubmit']}
            rules={[
              { required: true, message: 'Vui lòng chọn giờ bắt đầu nghỉ trưa!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value) return Promise.resolve();
                  
                  const workStart = getFieldValue('workingHoursStart');
                  const workEnd = getFieldValue('workingHoursEnd');
                  const lunchEnd = getFieldValue('lunchBreakEnd');
                  
                  // Chỉ validate nếu có đủ dữ liệu
                  if (workStart && workEnd) {
                    const valueTime = dayjs(value).format('HH:mm');
                    const workStartTime = dayjs(workStart).format('HH:mm');
                    const workEndTime = dayjs(workEnd).format('HH:mm');
                    
                    if (valueTime < workStartTime) {
                      return Promise.reject(new Error('Giờ nghỉ trưa phải trong giờ hành chính!'));
                    }
                    
                    if (valueTime > workEndTime) {
                      return Promise.reject(new Error('Giờ nghỉ trưa phải trong giờ hành chính!'));
                    }
                  }
                  
                  if (lunchEnd) {
                    const valueTime = dayjs(value).format('HH:mm');
                    const lunchEndTime = dayjs(lunchEnd).format('HH:mm');
                    
                    if (valueTime >= lunchEndTime) {
                      return Promise.reject(new Error('Giờ bắt đầu nghỉ trưa phải trước giờ kết thúc!'));
                    }
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
              showNow={false}
              use12Hours={false}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="Giờ kết thúc nghỉ trưa"
            name="lunchBreakEnd"
            validateTrigger={['onBlur', 'onSubmit']}
            rules={[
              { required: true, message: 'Vui lòng chọn giờ kết thúc nghỉ trưa!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value) return Promise.resolve();
                  
                  const workStart = getFieldValue('workingHoursStart');
                  const workEnd = getFieldValue('workingHoursEnd');
                  const lunchStart = getFieldValue('lunchBreakStart');
                  
                  // Chỉ validate nếu có đủ dữ liệu
                  if (workStart && workEnd) {
                    const valueTime = dayjs(value).format('HH:mm');
                    const workStartTime = dayjs(workStart).format('HH:mm');
                    const workEndTime = dayjs(workEnd).format('HH:mm');
                    
                    if (valueTime < workStartTime) {
                      return Promise.reject(new Error('Giờ nghỉ trưa phải trong giờ hành chính!'));
                    }
                    
                    if (valueTime > workEndTime) {
                      return Promise.reject(new Error('Giờ nghỉ trưa phải trong giờ hành chính!'));
                    }
                  }
                  
                  if (lunchStart) {
                    const valueTime = dayjs(value).format('HH:mm');
                    const lunchStartTime = dayjs(lunchStart).format('HH:mm');
                    
                    if (valueTime <= lunchStartTime) {
                      return Promise.reject(new Error('Giờ kết thúc nghỉ trưa phải sau giờ bắt đầu!'));
                    }
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
              showNow={false}
              use12Hours={false}
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

  const renderPenaltyRateTab = () => (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ExclamationCircleOutlined style={{ color: '#f5222d' }} />
          <span>Cấu hình tỉ lệ phạt đi muộn/về sớm</span>
        </div>
      }
      style={{ marginBottom: 0 }}
    >
      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Form.Item
            label="Tỉ lệ phạt (x lần lương cơ bản trên phút)"
            name="penaltyRate"
            rules={[
              { required: true, message: 'Vui lòng nhập tỉ lệ phạt!' },
              { type: 'number', min: 0.0001, message: 'Tỉ lệ phạt phải lớn hơn hoặc bằng 0.0001' },
              { type: 'number', max: 1, message: 'Tỉ lệ phạt không được vượt quá 1.0' },
            ]}
          >
            <InputNumber
              min={0.0001}
              max={1}
              step={0.0001}
              precision={4}
              placeholder="Nhập tỉ lệ phạt"
              style={{ width: '100%' }}
              size="large"
              formatter={(value) => `${value}x`}
              parser={(value) => value!.replace('x', '') as any}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <div style={{
            background: '#fff1f0',
            border: '1px solid #ffccc7',
            borderRadius: '6px',
            padding: '16px',
            height: '100%',
            display: 'flex',
            alignItems: 'center'
          }}>
            <div>
              <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: '#f5222d' }}>
                Tỉ lệ hiện tại
              </p>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#f5222d' }}>
                {settingsData?.PenaltyRate?.rate || defaultSettings.PenaltyRate.rate}x
              </p>
            </div>
          </div>
        </Col>
      </Row>

      <div style={{
        background: '#fff2e8',
        border: '1px solid #ffbb96',
        borderRadius: '6px',
        padding: '16px',
        marginTop: '24px'
      }}>
        <p style={{ margin: '0 0 8px 0', color: '#fa541c', fontWeight: 600 }}>
          <strong>Lưu ý:</strong>
        </p>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li style={{ color: '#666', marginBottom: '4px' }}>
            Tỉ lệ phạt áp dụng cho mỗi phút đi muộn hoặc về sớm
          </li>
          <li style={{ color: '#666', marginBottom: '4px' }}>
            Ví dụ: 0.0001x = 0.01% mỗi phút, 0.1x = 10% mỗi phút
          </li>
          <li style={{ color: '#666', marginBottom: '4px' }}>
            Giá trị tối thiểu: 0.0001 (0.01%), tối đa: 1.0 (100%)
          </li>
          <li style={{ color: '#666', marginBottom: '4px' }}>
            Tỉ lệ này sẽ được áp dụng để tính toán khấu trừ lương
          </li>
          <li style={{ color: '#666', marginBottom: '4px' }}>
            Nên sử dụng tỉ lệ thấp (0.0001-0.01) để tránh ảnh hưởng nghiêm trọng
          </li>
        </ul>
      </div>
    </Card>
  );

  const renderUnauthorizedAbsencePenaltyTab = () => (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
          <span>Cấu hình tỉ lệ phạt nghỉ không phép</span>
        </div>
      }
      style={{ marginBottom: 0 }}
    >
      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Form.Item
            label="Tỉ lệ phạt (% tổng lương tháng trên mỗi ngày nghỉ không phép)"
            name="unauthorizedAbsencePenaltyRate"
            rules={[
              { required: true, message: 'Vui lòng nhập tỉ lệ phạt nghỉ không phép!' },
              { type: 'number', min: 0, message: 'Tỉ lệ phạt không được âm' },
              { type: 'number', max: 100, message: 'Tỉ lệ phạt không được vượt quá 100%' },
            ]}
          >
            <InputNumber
              min={0}
              max={100}
              step={1}
              precision={0}
              placeholder="Nhập tỉ lệ phạt"
              style={{ width: '100%' }}
              size="large"
              formatter={(value) => `${value}%`}
              parser={(value) => value!.replace('%', '') as any}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <div style={{
            background: '#fff1f0',
            border: '1px solid #ffccc7',
            borderRadius: '6px',
            padding: '16px',
            height: '100%',
            display: 'flex',
            alignItems: 'center'
          }}>
            <div>
              <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: '#ff4d4f' }}>
                Tỉ lệ hiện tại
              </p>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#ff4d4f' }}>
                {settingsData?.UnauthorizedAbsencePenaltyRate?.rate || defaultSettings.UnauthorizedAbsencePenaltyRate.rate}%
              </p>
            </div>
          </div>
        </Col>
      </Row>

      <div style={{
        background: '#fffbe6',
        border: '1px solid #ffe58f',
        borderRadius: '6px',
        padding: '16px',
        marginTop: '16px'
      }}>
        <p style={{ margin: '0 0 8px 0', color: '#faad14', fontWeight: 600 }}>
          <strong>💡 Ví dụ minh họa:</strong>
        </p>
        <div style={{ 
          background: 'white',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '12px'
        }}>
          <p style={{ margin: '0 0 8px 0', color: '#262626', fontWeight: 600 }}>
            Tỉ lệ phạt: 5% | Tổng lương tháng: 10,000,000 VND
          </p>
          <ul style={{ margin: '0', paddingLeft: '20px', color: '#595959' }}>
            <li style={{ marginBottom: '4px' }}>
              Nghỉ không phép <strong>1 ngày</strong> → Phạt: <span style={{ color: '#ff4d4f', fontWeight: 600 }}>5% × 10,000,000 = 500,000 VND</span>
            </li>
            <li style={{ marginBottom: '4px' }}>
              Nghỉ không phép <strong>2 ngày</strong> → Phạt: <span style={{ color: '#ff4d4f', fontWeight: 600 }}>10% × 10,000,000 = 1,000,000 VND</span>
            </li>
            <li>
              Nghỉ không phép <strong>3 ngày</strong> → Phạt: <span style={{ color: '#ff4d4f', fontWeight: 600 }}>15% × 10,000,000 = 1,500,000 VND</span>
            </li>
          </ul>
        </div>
      </div>

      <div style={{
        background: '#fff7e6',
        border: '1px solid #ffd591',
        borderRadius: '6px',
        padding: '16px',
        marginTop: '16px'
      }}>
        <p style={{ margin: '0 0 8px 0', color: '#fa8c16', fontWeight: 600 }}>
          <strong>📋 Lưu ý quan trọng:</strong>
        </p>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li style={{ color: '#666', marginBottom: '4px' }}>
            <strong>Cách tính:</strong> Tiền phạt = (Số ngày nghỉ không phép) × (Tỉ lệ % cấu hình) × (Tổng lương tháng)
          </li>
          <li style={{ color: '#666', marginBottom: '4px' }}>
            <strong>Đơn vị:</strong> % trên tổng lương tháng cho mỗi 1 ngày nghỉ không phép
          </li>
          <li style={{ color: '#666', marginBottom: '4px' }}>
            <strong>Phạm vi:</strong> Từ 0% (không phạt) đến 100% (phạt toàn bộ lương tháng cho 1 ngày)
          </li>
          <li style={{ color: '#666', marginBottom: '4px' }}>
            <strong>Áp dụng:</strong> Chỉ áp dụng cho ngày nghỉ không phép (không có đơn hoặc đơn bị từ chối)
          </li>
          <li style={{ color: '#666', marginBottom: '4px' }}>
            <strong>Không áp dụng:</strong> Ngày nghỉ có phép (đơn đã được duyệt), ngày lễ, chủ nhật
          </li>
          <li style={{ color: '#666', marginBottom: '4px' }}>
            <strong>Khuyến nghị:</strong> Nên đặt từ 3-10% để hợp lý và không quá nặng (5% là phổ biến)
          </li>
          <li style={{ color: '#666', marginBottom: '4px' }}>
            <strong>Lưu ý:</strong> Nếu tổng tiền phạt nhiều ngày vượt 100% lương tháng, hệ thống sẽ giới hạn tối đa = 100%
          </li>
        </ul>
      </div>
    </Card>
  );

  const renderWorkingDaysTab = () => {
    const weekDays = [
      { key: 'monday', label: 'THỨ HAI', english: 'Monday', color: '#1890ff' },
      { key: 'tuesday', label: 'THỨ BA', english: 'Tuesday', color: '#1890ff' },
      { key: 'wednesday', label: 'THỨ TƯ', english: 'Wednesday', color: '#1890ff' },
      { key: 'thursday', label: 'THỨ NĂM', english: 'Thursday', color: '#1890ff' },
      { key: 'friday', label: 'THỨ SÁU', english: 'Friday', color: '#1890ff' },
      { key: 'saturday', label: 'THỨ BẢY', english: 'Saturday', color: '#fa8c16' },
      { key: 'sunday', label: 'CHỦ NHẬT', english: 'Sunday', color: '#fa541c' }
    ];

    const handleDayToggle = (dayKey: string) => {
      const currentValue = form.getFieldValue(['workingDays', dayKey]) || false;
      const newValue = !currentValue;
      
      // Cập nhật giá trị trong form
      form.setFieldValue(['workingDays', dayKey], newValue);
      
      // Force re-render bằng cách cập nhật settingsData
      setSettingsData(prev => ({
        ...prev,
        WorkingDays: {
          ...prev?.WorkingDays,
          [dayKey]: newValue
        }
      }));
    };

    return (
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ScheduleOutlined style={{ color: '#1890ff' }} />
            <span>Cấu hình ngày làm việc trong tuần</span>
          </div>
        }
        style={{ marginBottom: 0 }}
      >
        <div style={{ marginBottom: '24px' }}>
          <Text strong style={{ fontSize: '16px', marginBottom: '16px', display: 'block' }}>
            Chọn ngày làm việc trong tuần:
          </Text>
          <Row gutter={[16, 16]}>
            {weekDays.map((day) => {
              const isSelected = form.getFieldValue(['workingDays', day.key]) || settingsData?.WorkingDays?.[day.key as keyof WorkingDaysConfig] || false;
              
              return (
                <Col xs={24} sm={12} md={8} key={day.key}>
                  <Form.Item name={['workingDays', day.key]} valuePropName="checked" style={{ margin: 0 }}>
                    <Card
                      size="small"
                      hoverable
                      style={{ 
                        textAlign: 'center',
                        border: `2px solid ${isSelected ? '#52c41a' : '#d9d9d9'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        backgroundColor: isSelected ? '#f6ffed' : 'white'
                      }}
                      bodyStyle={{ padding: '16px 8px' }}
                      onClick={() => handleDayToggle(day.key)}
                    >
                      <div style={{ 
                        marginBottom: '8px',
                        fontSize: '24px',
                        color: isSelected ? '#52c41a' : '#d9d9d9'
                      }}>
                        {isSelected ? '✓' : '○'}
                      </div>
                      <Title level={4} style={{ margin: '0 0 4px 0', color: day.color }}>
                        {day.label}
                      </Title>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {day.english}
                      </Text>
                    </Card>
                  </Form.Item>
                </Col>
              );
            })}
          </Row>
        </div>

        <div style={{
          background: '#f6ffed',
          border: '1px solid #b7eb8f',
          borderRadius: '6px',
          padding: '16px',
          marginTop: '24px'
        }}>
          <p style={{ margin: '0 0 8px 0', color: '#389e0d', fontWeight: 600 }}>
            <strong>Lưu ý:</strong>
          </p>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li style={{ color: '#666', marginBottom: '4px' }}>
              Chọn các ngày trong tuần mà nhân viên cần phải làm việc
            </li>
            <li style={{ color: '#666', marginBottom: '4px' }}>
              Mặc định: Thứ 2 đến Thứ 6 (ngày làm việc hành chính)
            </li>
            <li style={{ color: '#666', marginBottom: '4px' }}>
              Có thể chọn thêm Thứ 7, Chủ nhật nếu công ty làm việc cuối tuần
            </li>
            <li style={{ color: '#666', marginBottom: '4px' }}>
              Phải chọn ít nhất 1 ngày làm việc trong tuần
            </li>
          </ul>
        </div>


      </Card>
    );
  };

  return (
    <div>
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

          <TabPane
            tab={
              <span>
                <ExclamationCircleOutlined />
                Phạt đi muộn/về sớm
              </span>
            }
            key="penaltyRate"
          >
            {renderPenaltyRateTab()}
          </TabPane>

          <TabPane
            tab={
              <span>
                <ExclamationCircleOutlined />
                Phạt nghỉ không phép
              </span>
            }
            key="unauthorizedAbsencePenaltyRate"
          >
            {renderUnauthorizedAbsencePenaltyTab()}
          </TabPane>

          <TabPane
            tab={
              <span>
                <ScheduleOutlined />
                Ngày làm việc
              </span>
            }
            key="workingDays"
          >
            {renderWorkingDaysTab()}
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
