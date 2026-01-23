'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, Card, Form, TimePicker, InputNumber, Button, message, Spin, Row, Col, Checkbox, Typography, Space } from 'antd';
import { SaveOutlined, SettingOutlined, ClockCircleOutlined, DollarCircleOutlined, CalendarOutlined, ReloadOutlined, ScheduleOutlined, ExclamationCircleOutlined, RollbackOutlined, TeamOutlined, MedicineBoxOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import SettingsService from '../../service/settingsService';
import CheckPermission from '@/components/common/CheckPermission';

// Configure dayjs plugins
dayjs.extend(customParseFormat);
dayjs.extend(utc);

// CSS cho TimePicker hover effect
const timePickerStyle = {
  width: '100%',

}

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

interface InsuranceRateConfig {
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
  BHXH: InsuranceRateConfig;
  BHYT: InsuranceRateConfig;
  TNCN: InsuranceRateConfig;
}

const SettingsComponent: React.FC<SettingsComponentProps> = ({
  onSave,
  initialData,
  loading: externalLoading = false
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('lunchBreak');

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
    ,
    BHXH: { rate: 8.0 },
    BHYT: { rate: 1.5 },
    TNCN: { rate: 0.0 }
  };

  const [settingsData, setSettingsData] = useState<SettingsData>(defaultSettings);

  const transformBackendData = (backendData: any[]): SettingsData => {
    if (!Array.isArray(backendData) || backendData.length === 0) {
      return defaultSettings;
    }

    // Convert từ array format sang object format
    const transformedData: any = {};

    backendData.forEach(item => {
      if (item.key && item.value !== undefined && item.value !== null) {
        // Backend sometimes returns value as a JSON string (stored in DB) or as an object.
        // Try to parse string values so the frontend receives a proper object.
        let parsedValue: any = item.value;
        if (typeof parsedValue === 'string') {
          try {
            parsedValue = JSON.parse(parsedValue);
          } catch (e) {
            // not a JSON string, keep original string
          }
        }
        transformedData[item.key] = parsedValue;
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
      },
      BHXH: { rate: transformedData?.BHXH?.rate ?? defaultSettings.BHXH.rate },
      BHYT: { rate: transformedData?.BHYT?.rate ?? defaultSettings.BHYT.rate },
      TNCN: { rate: transformedData?.TNCN?.rate ?? defaultSettings.TNCN.rate },
    };
  };

  // format small rates reliably (trim trailing zeros but preserve small precision)
  const formatRate = (val: any) => {
    const n = Number(val ?? 0);
    if (Number.isNaN(n)) return '0';
    // keep up to 6 decimal places, trim trailing zeros
    return n.toFixed(6).replace(/\.0+$|(?<=\.[0-9]*?)0+$/, '').replace(/\.$/, '');
  };

  const fetchSettings = async () => {
    try {
      setFetchLoading(true);
      console.log('Đang lấy thông tin settings từ backend...');

      const response = await SettingsService.getAllSettings();
      console.log('Raw settings data từ backend:', response);

      let transformedData: any = null;
      if (response && Array.isArray(response) && response.length > 0) {
        transformedData = transformBackendData(response);
      } else if (response && typeof response === 'object') {
        // service returns merged object map { key: value }
        transformedData = validateAndMergeSettings(response);
      }

      if (transformedData) {
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
      },
      BHXH: { rate: data?.BHXH?.rate ?? defaultSettings.BHXH.rate },
      BHYT: { rate: data?.BHYT?.rate ?? defaultSettings.BHYT.rate },
      TNCN: { rate: data?.TNCN?.rate ?? defaultSettings.TNCN.rate },
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
        BHXH: data.BHXH?.rate,
        BHYT: data.BHYT?.rate,
        TNCN: data.TNCN?.rate,
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
        BHXH: defaultSettings.BHXH.rate,
        BHYT: defaultSettings.BHYT.rate,
        TNCN: defaultSettings.TNCN.rate,
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

    // Kiểm tra thời gian nghỉ trưa phải nằm trong giờ làm việc
    if (lunchStartTime < workStartTime || lunchStartTime > workEndTime) {
      throw new Error('Giờ bắt đầu nghỉ trưa phải nằm trong giờ làm việc');
    }

    if (lunchEndTime < workStartTime || lunchEndTime > workEndTime) {
      throw new Error('Giờ kết thúc nghỉ trưa phải nằm trong giờ làm việc');
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

    // Kiểm tra tỷ lệ phạt - cho phép giá trị nhỏ, chỉ chặn âm
    if (values.penaltyRate < 0) {
      throw new Error('Tỷ lệ phạt đi muộn/về sớm không được âm');
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

      // Build payload for the active tab only
      let keyToSave: string | null = null;
      let valueToSave: any = null;

      switch (activeTab) {
        case 'workingHours':
          keyToSave = 'WorkingHours';
          valueToSave = {
            start: values.workingHoursStart.format('HH:mm') || defaultSettings.WorkingHours.start,
            end: values.workingHoursEnd.format('HH:mm') || defaultSettings.WorkingHours.end
          };
          break;
        case 'lunchBreak':
          keyToSave = 'LunchBreak';
          valueToSave = {
            start: values.lunchBreakStart.format('HH:mm') || defaultSettings.LunchBreak.start,
            end: values.lunchBreakEnd.format('HH:mm') || defaultSettings.LunchBreak.end
          };
          break;
        case 'overtimeRate':
          keyToSave = 'OvertimeRate';
          valueToSave = { rate: parseFloat(values.overtimeRate) };
          break;
        case 'holidayRate':
          keyToSave = 'HolidayRate';
          valueToSave = { rate: parseFloat(values.holidayRate) };
          break;
        case 'penaltyRate':
          keyToSave = 'PenaltyRate';
          valueToSave = { rate: parseFloat(values.penaltyRate) };
          break;
        case 'unauthorizedAbsencePenaltyRate':
          keyToSave = 'UnauthorizedAbsencePenaltyRate';
          valueToSave = { rate: parseFloat(values.unauthorizedAbsencePenaltyRate) };
          break;
        case 'workingDays':
          keyToSave = 'WorkingDays';
          valueToSave = {
            monday: values.workingDays?.monday ?? defaultSettings.WorkingDays.monday,
            tuesday: values.workingDays?.tuesday ?? defaultSettings.WorkingDays.tuesday,
            wednesday: values.workingDays?.wednesday ?? defaultSettings.WorkingDays.wednesday,
            thursday: values.workingDays?.thursday ?? defaultSettings.WorkingDays.thursday,
            friday: values.workingDays?.friday ?? defaultSettings.WorkingDays.friday,
            saturday: values.workingDays?.saturday ?? defaultSettings.WorkingDays.saturday,
            sunday: values.workingDays?.sunday ?? defaultSettings.WorkingDays.sunday
          };
          break;
        case 'BHXH':
          keyToSave = 'BHXH';
          valueToSave = { rate: parseFloat(values.BHXH) || defaultSettings.BHXH.rate };
          break;
        case 'BHYT':
          keyToSave = 'BHYT';
          valueToSave = { rate: parseFloat(values.BHYT) || defaultSettings.BHYT.rate };
          break;
        case 'TNCN':
          keyToSave = 'TNCN';
          valueToSave = { rate: parseFloat(values.TNCN) || defaultSettings.TNCN.rate };
          break;
        default:
          // fallback to whole settings if unknown
          keyToSave = null;
          valueToSave = null;
      }

      let savedSettings: any;

      if (keyToSave) {
        if (onSave) {
          savedSettings = await onSave({ [keyToSave]: valueToSave });
        } else {
          // Debug log so request appears in console before network panel
          console.log('Calling per-key settings API', { key: keyToSave, value: valueToSave });
          message.info(`Đang gửi cấu hình ${keyToSave}...`);
          // call per-key API
          savedSettings = await SettingsService.updateSetting(keyToSave, valueToSave);
        }

        // Merge updated key into current settingsData
        setSettingsData(prev => ({ ...prev, [keyToSave as string]: valueToSave }));

        message.success('Cấu hình đã được lưu thành công!');

        // Refresh the single setting from server to ensure sync
        setTimeout(() => {
          fetchSettings();
        }, 800);
      } else {
        // fallback to previous behavior: save all
        const updatedSettings = {
          WorkingHours: {
            start: values.workingHoursStart.format('HH:mm') || defaultSettings.WorkingHours.start,
            end: values.workingHoursEnd.format('HH:mm') || defaultSettings.WorkingHours.end
          },
          LunchBreak: {
            start: values.lunchBreakStart.format('HH:mm') || defaultSettings.LunchBreak.start,
            end: values.lunchBreakEnd.format('HH:mm') || defaultSettings.LunchBreak.end
          },
          OvertimeRate: { rate: parseFloat(values.overtimeRate) || defaultSettings.OvertimeRate.rate },
          HolidayRate: { rate: parseFloat(values.holidayRate) || defaultSettings.HolidayRate.rate },
          PenaltyRate: { rate: parseFloat(values.penaltyRate) || defaultSettings.PenaltyRate.rate },
          UnauthorizedAbsencePenaltyRate: { rate: parseFloat(values.unauthorizedAbsencePenaltyRate) || defaultSettings.UnauthorizedAbsencePenaltyRate.rate },
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

        if (onSave) {
          savedSettings = await onSave(updatedSettings);
        } else {
          // Save each key sequentially via per-key endpoint
          const keys = Object.keys(updatedSettings);
          for (const k of keys) {
            // @ts-ignore
            await SettingsService.updateSetting(k, (updatedSettings as any)[k]);
          }
          savedSettings = updatedSettings;
        }

        setSettingsData(savedSettings || updatedSettings);
        message.success('Cấu hình đã được lưu thành công!');
      }

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

  // Save single key helper: validate only relevant fields then call per-key API
  const saveKey = async (key: string) => {
    try {
      setLoading(true);

      // Determine which fields to validate and build value
      let fieldsToValidate: string[] = [];
      let payloadValue: any = null;

      switch (key) {
        case 'WorkingHours':
          fieldsToValidate = ['workingHoursStart', 'workingHoursEnd'];
          await form.validateFields(fieldsToValidate);
          payloadValue = {
            start: form.getFieldValue('workingHoursStart').format('HH:mm'),
            end: form.getFieldValue('workingHoursEnd').format('HH:mm')
          };
          break;
        case 'LunchBreak':
          fieldsToValidate = ['lunchBreakStart', 'lunchBreakEnd'];
          await form.validateFields(fieldsToValidate);
          payloadValue = {
            start: form.getFieldValue('lunchBreakStart').format('HH:mm'),
            end: form.getFieldValue('lunchBreakEnd').format('HH:mm')
          };
          break;
        case 'OvertimeRate':
          fieldsToValidate = ['overtimeRate'];
          await form.validateFields(fieldsToValidate);
          payloadValue = { rate: parseFloat(form.getFieldValue('overtimeRate')) };
          break;
        case 'HolidayRate':
          fieldsToValidate = ['holidayRate'];
          await form.validateFields(fieldsToValidate);
          payloadValue = { rate: parseFloat(form.getFieldValue('holidayRate')) };
          break;
        case 'PenaltyRate':
          fieldsToValidate = ['penaltyRate'];
          await form.validateFields(fieldsToValidate);
          payloadValue = { rate: parseFloat(form.getFieldValue('penaltyRate')) };
          break;
        case 'UnauthorizedAbsencePenaltyRate':
          fieldsToValidate = ['unauthorizedAbsencePenaltyRate'];
          await form.validateFields(fieldsToValidate);
          payloadValue = { rate: parseFloat(form.getFieldValue('unauthorizedAbsencePenaltyRate')) };
          break;
        case 'WorkingDays':
          // validate workingDays group
          await form.validateFields(['workingDays']);
          payloadValue = {
            monday: form.getFieldValue(['workingDays', 'monday']) ?? defaultSettings.WorkingDays.monday,
            tuesday: form.getFieldValue(['workingDays', 'tuesday']) ?? defaultSettings.WorkingDays.tuesday,
            wednesday: form.getFieldValue(['workingDays', 'wednesday']) ?? defaultSettings.WorkingDays.wednesday,
            thursday: form.getFieldValue(['workingDays', 'thursday']) ?? defaultSettings.WorkingDays.thursday,
            friday: form.getFieldValue(['workingDays', 'friday']) ?? defaultSettings.WorkingDays.friday,
            saturday: form.getFieldValue(['workingDays', 'saturday']) ?? defaultSettings.WorkingDays.saturday,
            sunday: form.getFieldValue(['workingDays', 'sunday']) ?? defaultSettings.WorkingDays.sunday,
          };
          break;
        case 'BHXH':
          fieldsToValidate = ['BHXH'];
          await form.validateFields(fieldsToValidate);
          payloadValue = { rate: parseFloat(form.getFieldValue('BHXH')) };
          break;
        case 'BHYT':
          fieldsToValidate = ['BHYT'];
          await form.validateFields(fieldsToValidate);
          payloadValue = { rate: parseFloat(form.getFieldValue('BHYT')) };
          break;
        case 'BHTN':
          fieldsToValidate = ['BHTN'];
          await form.validateFields(fieldsToValidate);
          payloadValue = { rate: parseFloat(form.getFieldValue('BHTN')) };
          break;
        case 'TNCN':
          fieldsToValidate = ['TNCN'];
          await form.validateFields(fieldsToValidate);
          payloadValue = { rate: parseFloat(form.getFieldValue('TNCN')) };
          break;
        default:
          throw new Error('Unknown setting key');
      }

      console.log('saveKey payload', key, payloadValue);

      let result;
      if (onSave) {
        result = await onSave({ [key]: payloadValue });
      } else {
        result = await SettingsService.updateSetting(key, payloadValue);
      }

      // Merge into state
      setSettingsData(prev => ({ ...prev, [key]: payloadValue }));

      message.success('Đã lưu thành công');
      // Refresh small delay
      setTimeout(() => fetchSettings(), 700);
      return result;
    } catch (err: any) {
      console.error('Save key error', key, err);
      if (err?.message) message.error(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Revert single key helper: fetch server value and set form fields
  const revertKey = async (key: string) => {
    try {
      setLoading(true);
      console.log('Reverting key:', key);
      const currentSetting = await SettingsService.getSettingByKey(key);
      if (!currentSetting) {
        message.warning('Không tìm thấy cấu hình để revert');
        return;
      }
      // Update form fields based on key
      switch (key) {
        case 'WorkingHours':
          form.setFieldsValue({
            workingHoursStart: dayjs(currentSetting.value.start, 'HH:mm'),
            workingHoursEnd: dayjs(currentSetting.value.end, 'HH:mm')
          });
          break;
        case 'LunchBreak':
          form.setFieldsValue({
            lunchBreakStart: dayjs(currentSetting.value.start, 'HH:mm'),
            lunchBreakEnd: dayjs(currentSetting.value.end, 'HH:mm')
          });
          break;
        case 'OvertimeRate':
          form.setFieldsValue({ overtimeRate: currentSetting.value.rate });
          break;
        case 'HolidayRate':
          form.setFieldsValue({ holidayRate: currentSetting.value.rate });
          break;
        case 'PenaltyRate':
          form.setFieldsValue({ penaltyRate: currentSetting.value.rate });
          break;
        case 'UnauthorizedAbsencePenaltyRate':
          form.setFieldsValue({ unauthorizedAbsencePenaltyRate: currentSetting.value.rate });
          break;
        case 'WorkingDays':
          form.setFieldsValue({
            workingDays: {
              monday: currentSetting.value.monday,
              tuesday: currentSetting.value.tuesday,
              wednesday: currentSetting.value.wednesday,
              thursday: currentSetting.value.thursday,
              friday: currentSetting.value.friday,
              saturday: currentSetting.value.saturday,
              sunday: currentSetting.value.sunday
            }
          });
          break;
        case 'BHXH':
          form.setFieldsValue({ BHXH: currentSetting.value?.rate ?? currentSetting.value });
          break;
        case 'BHYT':
          form.setFieldsValue({ BHYT: currentSetting.value?.rate ?? currentSetting.value });
          break;
        case 'BHTN':
          form.setFieldsValue({ BHTN: currentSetting.value?.rate ?? currentSetting.value });
          break;
        case 'TNCN':
          form.setFieldsValue({ TNCN: currentSetting.value?.rate ?? currentSetting.value });
          break;
        default:
          message.error('Unknown key for revert');
          return;
      }
      message.success('Đã revert về giá trị ban đầu');
    } catch (error) {
      console.error('Revert error:', error);
      message.error('Không thể revert. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  // Render for working hours removed per request (tab hidden). The associated save/revert logic remains
  // in case other parts of the app call saveKey/revertKey programmatically.

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
                      return Promise.reject(new Error('Giờ nghỉ trưa phải trong giờ làm việc!'));
                    }

                    if (valueTime > workEndTime) {
                      return Promise.reject(new Error('Giờ nghỉ trưa phải trong giờ làm việc!'));
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
                      return Promise.reject(new Error('Giờ nghỉ trưa phải trong giờ làm việc!'));
                    }

                    if (valueTime > workEndTime) {
                      return Promise.reject(new Error('Giờ nghỉ trưa phải trong giờ làm việc!'));
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
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 24 }}>
        <Button onClick={() => revertKey('LunchBreak')} size="large" ><RollbackOutlined />Trở về</Button>
        <Button type="primary" onClick={() => saveKey('LunchBreak')} size="large" ><SaveOutlined />Lưu</Button>
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
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 24 }}>
        <Button onClick={() => revertKey('OvertimeRate')} size="large" ><RollbackOutlined />Trở về</Button>
        <Button type="primary" onClick={() => saveKey('OvertimeRate')} size="large" ><SaveOutlined />Lưu</Button>
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
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 24 }}>
        <Button onClick={() => revertKey('HolidayRate')} size="large" ><RollbackOutlined />Trở về</Button>
        <Button type="primary" onClick={() => saveKey('HolidayRate')} size="large" ><SaveOutlined />Lưu</Button>
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
            label="Tỉ lệ phạt (% lần lương cơ bản trên phút)"
            name="penaltyRate"
            rules={[
              { required: true, message: 'Vui lòng nhập tỉ lệ phạt!' },
            ]}
          >
            <InputNumber
              min={0}
              max={1}
              step={0.0000001}
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
              <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: '#f5222d' }}>
                Tỉ lệ hiện tại
              </p>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#f5222d' }}>
                {formatRate(settingsData?.PenaltyRate?.rate || 0)}%
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
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 24 }}>
        <Button onClick={() => revertKey('PenaltyRate')} size="large" ><RollbackOutlined />Trở về</Button>
        <Button type="primary" onClick={() => saveKey('PenaltyRate')} size="large" ><SaveOutlined />Lưu</Button>
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
            ]}
          >
            <InputNumber
              step={0.0000001}
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
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 24 }}>
        <Button onClick={() => revertKey('UnauthorizedAbsencePenaltyRate')} size="large" ><RollbackOutlined />Trở về</Button>
        <Button type="primary" onClick={() => saveKey('UnauthorizedAbsencePenaltyRate')} size="large" ><SaveOutlined />Lưu</Button>
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
              Mặc định: Thứ 2 đến Thứ 6 (ngày làm việc làm việc)
            </li>
            <li style={{ color: '#666', marginBottom: '4px' }}>
              Có thể chọn thêm Thứ 7, Chủ nhật nếu công ty làm việc cuối tuần
            </li>
            <li style={{ color: '#666', marginBottom: '4px' }}>
              Phải chọn ít nhất 1 ngày làm việc trong tuần
            </li>
          </ul>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 24 }}>
          <Button onClick={() => revertKey('WorkingDays')} size="large" style={{ minWidth: 120, padding: '8px 18px' }}>Trở về</Button>
          <CheckPermission permissionKey="settings" requiredType="update">
            <Button type="primary" onClick={() => saveKey('WorkingDays')} size="large" style={{ minWidth: 120, padding: '8px 18px' }}>Lưu</Button>
          </CheckPermission>
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
            type="line"
            size="large"
            style={{ margin: 0 }}
          >
            {/* Working hours tab removed per request */}
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

            <TabPane
              tab={
                <span>
                  <TeamOutlined />
                  Bảo hiểm xã hội
                </span>
              }
              key="BHXH"
            >
              <Card title={<><TeamOutlined /> Bảo hiểm xã hội (BHXH)</>}>
                <Form.Item
                  label="Phần trăm BHXH (từ phía nhân viên)"
                  name="BHXH"
                  rules={[{ required: true, message: 'Vui lòng nhập BHXH' }, { type: 'number', min: 0, max: 100 }]}
                >
                  <InputNumber min={0} max={100} step={0.1} precision={2} style={{ width: '100%' }} formatter={v => `${v}%`} parser={v => v!.replace('%', '') as any} />
                </Form.Item>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 12 }}>
                  <Button onClick={() => revertKey('BHXH')}><RollbackOutlined />Trở về</Button>
                  <CheckPermission permissionKey="settings" requiredType="update">
                    <Button type="primary" onClick={() => saveKey('BHXH')}><SaveOutlined />Lưu</Button>
                  </CheckPermission>
                </div>
              </Card>
            </TabPane>

            <TabPane
              tab={<span><MedicineBoxOutlined /> Bảo hiểm y tế</span>}
              key="BHYT"
            >
              <Card title={<><MedicineBoxOutlined /> Bảo hiểm y tế (BHYT)</>}>
                <Form.Item
                  label="Phần trăm BHYT (từ phía nhân viên)"
                  name="BHYT"
                  rules={[{ required: true, message: 'Vui lòng nhập BHYT' }, { type: 'number', min: 0, max: 100 }]}
                >
                  <InputNumber min={0} max={100} step={0.1} precision={2} style={{ width: '100%' }} formatter={v => `${v}%`} parser={v => v!.replace('%', '') as any} />
                </Form.Item>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 12 }}>
                  <Button onClick={() => revertKey('BHYT')}><RollbackOutlined />Trở về</Button>
                  <CheckPermission permissionKey="settings" requiredType="update">
                    <Button type="primary" onClick={() => saveKey('BHYT')}><SaveOutlined />Lưu</Button>
                  </CheckPermission>
                </div>
              </Card>
            </TabPane>


            <TabPane tab={<span><FileTextOutlined /> Thuế thu nhập cá nhân</span>} key="TNCN">
              <Card title={<><FileTextOutlined /> Thuế thu nhập cá nhân (TNCN)</>}>
                <Form.Item label="Cấu hình TNCN (phần trăm mẫu / placeholder)" name="TNCN" rules={[{ required: true, message: 'Vui lòng nhập TNCN' }, { type: 'number', min: 0, max: 100 }]}>
                  <InputNumber min={0} max={100} step={0.1} precision={2} style={{ width: '100%' }} formatter={v => `${v}%`} parser={v => v!.replace('%', '') as any} />
                </Form.Item>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 12 }}>
                  <Button onClick={() => revertKey('TNCN')}><RollbackOutlined />Trở về</Button>
                  <CheckPermission permissionKey="settings" requiredType="update">
                    <Button type="primary" onClick={() => saveKey('TNCN')}><SaveOutlined />Lưu</Button>
                  </CheckPermission>
                </div>
              </Card>
            </TabPane>

          </Tabs>
        </Form>
      </Spin>
    </div>
  );
};

export default SettingsComponent;
