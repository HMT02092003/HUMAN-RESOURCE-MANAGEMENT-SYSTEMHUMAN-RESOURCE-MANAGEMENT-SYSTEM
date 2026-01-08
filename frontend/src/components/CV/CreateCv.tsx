"use client";

import React, { useEffect, useState } from 'react';
import { Form, Upload, Button, Select, message, Row, Col } from 'antd';
import { RollbackOutlined, UploadOutlined, SaveOutlined } from '@ant-design/icons';
const { Dragger } = Upload;
import jobService from '@/service/jobService';
import UserService from '@/service/userService';
// Use a small inline SVG (sparkles) for the icon to match the screenshot.
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { getDecodedToken } from '@/utils/decode-token';
import CVAnalysisAnimation from './CVAnalysisAnimation';

const { Option } = Select;

const CreateCv: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  // fileList stores AntD Upload file objects to keep UI in sync with Dragger
  const [fileList, setFileList] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const [initialUser, setInitialUser] = useState<string | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    // try to preselect current user from token
    try {
      const token = Cookies.get('token');
      if (token) {
        const decoded = getDecodedToken(token);
        const uid = decoded?.user?.id || decoded?.user?.user_id || decoded?.user?.userId;
        if (uid) setInitialUser(uid);
      }
    } catch (e) {
      // ignore
    }

    // Request a large pageSize so the select contains all users in one call
    UserService.getAllUsersAll({ page: 1, pageSize: 10000 })
      .then(resp => {
        const list = Array.isArray(resp) ? resp : (resp?.results || resp?.data || resp || []);
        if (mounted) setUsers(Array.isArray(list) ? list : []);
      })
      .catch(() => message.error('Không thể tải danh sách người dùng'));

    return () => { mounted = false; };
  }, []);

  // beforeUpload receives an AntD UploadFile; prevent automatic upload and keep file in state
  const beforeUpload = (file: any) => {
    // allow only PDF
    if (file.type !== 'application/pdf') {
      message.error('Chỉ chấp nhận file PDF');
      return Upload.LIST_IGNORE;
    }
    setFileList([file]);
    return false; // prevent auto upload
  };

  const onRemove = (file: any) => {
    setFileList([]);
  };

  const handleSubmit = async (values: any) => {
    if (fileList.length === 0) {
      message.error('Vui lòng chọn file CV');
      return;
    }
    setSubmitting(true);
    try {
      // AntD Upload stores the actual File in originFileObj for controlled uploads
      const fileObj = fileList[0]?.originFileObj || fileList[0];
      const userId = values.user || initialUser;

      await jobService.uploadCv({ file: fileObj, user_id: userId });

      message.success('Đã tạo CV, đang xử lý');
      router.push('/CV');
    } catch (err: any) {
      message.error(err?.message || 'Tạo CV thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  // Defensive resolution in case module interop wraps default export
  const AnalysisComp: any = (CVAnalysisAnimation as any)?.default || CVAnalysisAnimation;
  // Runtime debug logs to help identify invalid element type issues
  // (will appear in browser console)
  if (typeof window !== 'undefined') {
    try {
      // eslint-disable-next-line no-console
      console.log('CVAnalysisAnimation import:', CVAnalysisAnimation);
      // eslint-disable-next-line no-console
      console.log('Resolved AnalysisComp:', AnalysisComp, 'type:', typeof AnalysisComp);
    } catch (e) {
      // ignore
    }
  }

  const canRenderAnalysisComp = typeof AnalysisComp === 'function' || (AnalysisComp && AnalysisComp.prototype && AnalysisComp.prototype.isReactComponent);

  return (
    <Form layout="vertical" onFinish={handleSubmit}>
      <Row gutter={24} style={{ display: 'flex', justifyContent: 'center' }}>
        <Col xs={24} md={16}>
          <Form.Item
            label="Chủ sở hữu"
            name="user"
            initialValue={initialUser}
            rules={[{ required: true, message: 'Chọn người sở hữu' }]}
          >
            <Select placeholder="Chọn người dùng">
              {users.map(u => {
                const id = u.id || u.userId || u.user_id;
                const label = u.fullName || u.username;
                return <Option key={id} value={id}>{label}</Option>;
              })}
            </Select>
          </Form.Item>
        </Col>

        <Col xs={24} md={16}>
          <Form.Item label="File CV (PDF)">
            <Dragger
              multiple={false}
              accept="application/pdf"
              beforeUpload={beforeUpload}
              fileList={fileList}
              onRemove={onRemove}
              maxCount={1}
              style={{ padding: 12 }}
            >
              <p className="ant-upload-drag-icon"><UploadOutlined /></p>
              <p className="ant-upload-text">Click hoặc kéo thả file vào khu vực này để upload</p>
              <p className="ant-upload-hint">Hỗ trợ file PDF. Một file duy nhất.</p>
            </Dragger>
          </Form.Item>
        </Col>
      </Row>

      <Row justify="center">
        <Col>
          <Form.Item style={{ margin: 0 }}>
            <Row align="middle" gutter={8}>
              <Col>
                <Button onClick={() => router.back()} disabled={submitting}>
                  <RollbackOutlined /> Trở về
                </Button>
              </Col>
              <Col>
                {/* Standard AntD Button with Save icon; shows loading while submitting */}
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={submitting}
                  disabled={submitting}
                  style={
                    submitting
                      ? {
                          background: 'linear-gradient(90deg,#1677ff,#06b6d4)',
                          border: 'none',
                          color: '#fff',
                          boxShadow: '0 6px 18px rgba(7,12,60,0.12)',
                          transition: 'background 200ms ease, box-shadow 200ms ease'
                        }
                      : undefined
                  }
                >
                  {submitting ? 'Đang phân tích CV' : 'Tạo mới CV'}
                </Button>
              </Col>
            </Row>
          </Form.Item>
        </Col>
      </Row>
      {/* Fullscreen overlay shown while submitting (minimal: single white icon + text) */}
      {submitting && (
        <div className="cv-fullscreen-overlay">
          <div className="cv-overlay-content">
            {canRenderAnalysisComp ? (
              <AnalysisComp size={84} />
            ) : (
              <svg width="84" height="84" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2l1.8 3.6L17.6 7l-3.8 1.4L12 12l-1.8-3.6L6.4 7l3.8-1.4L12 2z" fill="#fff" />
              </svg>
            )}
            <div className="cv-overlay-text">Đang phân tích CV</div>
          </div>
          <style>{`
            .cv-fullscreen-overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:1200;background:rgba(0,0,0,0.5)}
            .cv-overlay-content{display:flex;flex-direction:column;align-items:center;justify-content:center}
            .cv-overlay-text{color:#fff;font-weight:700;font-size:18px;margin-top:12px}
          `}</style>
        </div>
      )}
    </Form>
  );
};

export default CreateCv;
