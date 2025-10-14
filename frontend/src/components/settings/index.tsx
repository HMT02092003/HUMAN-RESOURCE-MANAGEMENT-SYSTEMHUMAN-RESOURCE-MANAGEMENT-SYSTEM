import React, { useState, useEffect } from 'react';
import { message, Button, Space, Card } from 'antd';
import { SettingOutlined, ReloadOutlined, HistoryOutlined } from '@ant-design/icons';
import SettingsComponent from './SettingsComponent';
import settingsService from '@/service/settingsService';
import '@/styles/settings.css';

const SettingsIndex: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [settingsData, setSettingsData] = useState<any>({
    WorkingHours: { start: '08:00', end: '17:00' },
    LunchBreak: { start: '12:00', end: '13:00' },
    OvertimeRate: { rate: 1.5 },
    HolidayRate: { rate: 3.0 }
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      console.log('Loading settings from backend...');
      const data = await settingsService.getAllSettings();
      
      if (data) {
        console.log('Settings loaded successfully:', data);
        setSettingsData(data);
      } else {
        console.log('No settings data, using default');
        message.info('Đang sử dụng cấu hình mặc định');
      }
      
    } catch (error: any) {
      console.error('Error loading settings:', error);
      
      if (error?.response?.status === 404) {
        message.warning('Chưa có cấu hình trong hệ thống. Đang sử dụng cấu hình mặc định.');
      } else if (error?.response?.status >= 500) {
        message.error('Lỗi server khi tải cấu hình. Đang sử dụng cấu hình mặc định.');
      } else {
        message.error('Không thể kết nối đến server. Đang sử dụng cấu hình mặc định.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (updatedSettings: any) => {
    try {
      console.log('Saving settings from index:', updatedSettings);
      let result: any;

      // If it's a single key update (child sends { Key: value }) call per-key endpoint
      const keys = Object.keys(updatedSettings || {});
      if (keys.length === 1) {
        const k = keys[0];
        result = await settingsService.updateSetting(k, updatedSettings[k]);
      } else {
        // Otherwise save each key sequentially
        for (const k of keys) {
          await settingsService.updateSetting(k, updatedSettings[k]);
        }
        result = updatedSettings;
      }

      console.log('Settings saved successfully:', result);
      setSettingsData(result);
      
      // Tự động tải lại sau khi lưu để đảm bảo đồng bộ
      setTimeout(() => {
        loadSettings();
      }, 500);
      
  return result;
    } catch (error: any) {
      console.error('Error saving settings:', error);
      
      if (error instanceof Error && error.message === 'Dữ liệu không hợp lệ') {
        throw error;
      }
      
      if (error?.response?.data?.error) {
        throw new Error(`Lỗi server: ${error.response.data.error}`);
      } else if (error?.response?.status >= 500) {
        throw new Error('Lỗi server nội bộ. Vui lòng thử lại sau!');
      } else if (error?.response?.status >= 400) {
        throw new Error('Dữ liệu không hợp lệ. Vui lòng kiểm tra lại!');
      } else {
        throw new Error('Không thể kết nối đến server. Vui lòng thử lại!');
      }
    }
  };

  return (
    <div style={{ padding: '0' }}>
      <SettingsComponent
        initialData={settingsData}
        onSave={handleSaveSettings}
        loading={loading}
      />
    </div>
  );
};

export default SettingsIndex;
