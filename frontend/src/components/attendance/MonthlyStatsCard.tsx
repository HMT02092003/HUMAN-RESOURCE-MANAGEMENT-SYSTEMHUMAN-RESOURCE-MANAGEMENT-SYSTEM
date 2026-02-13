'use client';

import React from 'react';
import { Card, Row, Col, Typography, Tag, Collapse } from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  MinusCircleOutlined,
  FieldTimeOutlined,
  TrophyOutlined,
  WarningOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';

const { Text } = Typography;

// Helper function để format số tiền theo kiểu Việt Nam (dấu chấm ngăn cách)
const formatVND = (amount: number): string => {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

interface MonthlyStatsCardProps {
  monthlyStats: any;
  otRate: number;
  isMobile: boolean;
  defaultShift?: { name: string; start_time: string; end_time: string };
}

const MonthlyStatsCard: React.FC<MonthlyStatsCardProps> = ({
  monthlyStats,
  otRate,
  isMobile,
  defaultShift = { name: 'Ca hành chính', start_time: '08:00', end_time: '17:00' }
}) => {
  return (
    <Card
      title="Thống kê tháng"
      style={{ marginBottom: 16 }}
      bodyStyle={{ padding: isMobile ? 12 : 16 }}
    >
      {/* ===== QUICK SUMMARY - 4 Metric Cards (mỗi hàng 1 thẻ) ===== */}
      <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
        {/* Hàng 1: Tổng công */}
        <Col span={24}>
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: 8,
            padding: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ fontSize: 13, color: '#15803d', fontWeight: 500 }}>Tổng công</div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#16a34a' }}>
              {(monthlyStats.totalWorkingUnits || 0).toFixed(1)}
            </div>
          </div>
        </Col>

        {/* Hàng 2: Công OT */}
        <Col span={24}>
          <div style={{
            background: '#fef3c7',
            border: '1px solid #fcd34d',
            borderRadius: 8,
            padding: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ fontSize: 13, color: '#b45309', fontWeight: 500 }}>Công OT</div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#d97706' }}>
              +{(monthlyStats.totalEffectiveOtWorkingUnits || (monthlyStats.totalOtWorkingUnits || 0) * otRate).toFixed(2)}
            </div>
          </div>
        </Col>

        {/* Hàng 3: Ngày làm việc */}
        <Col span={24}>
          <div style={{
            background: '#eff6ff',
            border: '1px solid #93c5fd',
            borderRadius: 8,
            padding: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ fontSize: 13, color: '#1d4ed8', fontWeight: 500 }}>Ngày làm việc</div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#2563eb' }}>
              {monthlyStats.presentDays}/{monthlyStats.totalDays}
            </div>
          </div>
        </Col>

        {/* Hàng 4: Tổng phạt */}
        <Col span={24}>
          <div style={{
            background: monthlyStats.totalPenalty > 0 ? '#fef2f2' : '#f0fdf4',
            border: monthlyStats.totalPenalty > 0 ? '1px solid #fca5a5' : '1px solid #86efac',
            borderRadius: 8,
            padding: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            overflow: 'hidden'
          }}>
            <div style={{ fontSize: 13, color: monthlyStats.totalPenalty > 0 ? '#b91c1c' : '#15803d', fontWeight: 500 }}>Tổng phạt</div>
            <div style={{
              fontSize: monthlyStats.totalPenalty >= 1000000 ? 16 : 20,
              fontWeight: 'bold',
              color: monthlyStats.totalPenalty > 0 ? '#dc2626' : '#16a34a',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {formatVND(monthlyStats.totalPenalty || 0)}đ
            </div>
          </div>
        </Col>
      </Row>

      {/* ===== COLLAPSIBLE DETAILS ===== */}
      <Collapse
        ghost
        defaultActiveKey={['days']}
        expandIconPosition="end"
        style={{ background: '#fafafa', borderRadius: 8 }}
        items={[
          {
            key: 'days',
            label: <Text strong style={{ fontSize: 13 }}><CalendarOutlined style={{ marginRight: 8 }} />Chi tiết ngày công</Text>,
            children: (
              <Row gutter={[8, 8]}>
                <Col span={8}>
                  <div style={{ textAlign: 'center', padding: 8, background: '#f6ffed', borderRadius: 6 }}>
                    <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                    <div style={{ fontSize: 18, fontWeight: 'bold', color: '#52c41a' }}>{monthlyStats.presentDays}</div>
                    <div style={{ fontSize: 10, color: '#8c8c8c' }}>Có mặt</div>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ textAlign: 'center', padding: 8, background: '#fffbe6', borderRadius: 6 }}>
                    <CalendarOutlined style={{ color: '#faad14', fontSize: 16 }} />
                    <div style={{ fontSize: 18, fontWeight: 'bold', color: '#faad14' }}>{monthlyStats.approvedLeaveDays || 0}</div>
                    <div style={{ fontSize: 10, color: '#8c8c8c' }}>Nghỉ phép</div>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ textAlign: 'center', padding: 8, background: '#e6f7ff', borderRadius: 6 }}>
                    <EnvironmentOutlined style={{ color: '#1890ff', fontSize: 16 }} />
                    <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1890ff' }}>{monthlyStats.businessTripDays || 0}</div>
                    <div style={{ fontSize: 10, color: '#8c8c8c' }}>Công tác</div>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ textAlign: 'center', padding: 8, background: '#fff1f0', borderRadius: 6 }}>
                    <ClockCircleOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
                    <div style={{ fontSize: 18, fontWeight: 'bold', color: '#ff4d4f' }}>{monthlyStats.lateDays}</div>
                    <div style={{ fontSize: 10, color: '#8c8c8c' }}>Đi muộn</div>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ textAlign: 'center', padding: 8, background: '#fff7e6', borderRadius: 6 }}>
                    <ExclamationCircleOutlined style={{ color: '#fa8c16', fontSize: 16 }} />
                    <div style={{ fontSize: 18, fontWeight: 'bold', color: '#fa8c16' }}>{monthlyStats.earlyLeaveDays}</div>
                    <div style={{ fontSize: 10, color: '#8c8c8c' }}>Về sớm</div>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ textAlign: 'center', padding: 8, background: '#fff0f6', borderRadius: 6 }}>
                    <MinusCircleOutlined style={{ color: '#cf1322', fontSize: 16 }} />
                    <div style={{ fontSize: 18, fontWeight: 'bold', color: '#cf1322' }}>{monthlyStats.unauthorizedAbsenceDays || 0}</div>
                    <div style={{ fontSize: 10, color: '#8c8c8c' }}>Không phép</div>
                  </div>
                </Col>
              </Row>
            )
          },
          {
            key: 'hours',
            label: <Text strong style={{ fontSize: 13 }}><ClockCircleOutlined style={{ marginRight: 8 }} />Thời gian làm việc</Text>,
            children: (
              <Row gutter={[8, 8]}>
                <Col span={12}>
                  <div style={{ textAlign: 'center', padding: 10, background: '#e6f7ff', borderRadius: 6 }}>
                    <FieldTimeOutlined style={{ color: '#1890ff', fontSize: 16 }} />
                    <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1890ff' }}>{monthlyStats.totalHours?.toFixed(1) || 0}h</div>
                    <div style={{ fontSize: 10, color: '#8c8c8c' }}>Tổng giờ làm</div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ textAlign: 'center', padding: 10, background: '#f9f0ff', borderRadius: 6 }}>
                    <TrophyOutlined style={{ color: '#722ed1', fontSize: 16 }} />
                    <div style={{ fontSize: 18, fontWeight: 'bold', color: '#722ed1' }}>{monthlyStats.overtimeHours?.toFixed(1) || 0}h</div>
                    <div style={{ fontSize: 10, color: '#8c8c8c' }}>Giờ tăng ca</div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ textAlign: 'center', padding: 10, background: '#f0f5ff', borderRadius: 6 }}>
                    <InfoCircleOutlined style={{ color: '#5b8cff', fontSize: 16 }} />
                    <div style={{ fontSize: 18, fontWeight: 'bold', color: '#5b8cff' }}>{monthlyStats.averageHours?.toFixed(1) || 0}h</div>
                    <div style={{ fontSize: 10, color: '#8c8c8c' }}>TB/ngày</div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ textAlign: 'center', padding: 10, background: '#fef3c7', borderRadius: 6 }}>
                    <TrophyOutlined style={{ color: '#d97706', fontSize: 16 }} />
                    <div style={{ fontSize: 18, fontWeight: 'bold', color: '#d97706' }}>+{(monthlyStats.totalEffectiveOtWorkingUnits || (monthlyStats.totalOtWorkingUnits || 0) * otRate).toFixed(2)}</div>
                    <div style={{ fontSize: 10, color: '#8c8c8c' }}>Công tăng ca</div>
                  </div>
                </Col>
              </Row>
            )
          },
          {
            key: 'penalty',
            label: (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <Text strong style={{ fontSize: 13 }}><DollarOutlined style={{ marginRight: 8 }} />Chi tiết tiền phạt</Text>
                {monthlyStats.totalPenalty > 0 && (
                  <Tag color="red" style={{ marginLeft: 8 }}>{formatVND(monthlyStats.totalPenalty)}đ</Tag>
                )}
              </div>
            ),
            children: (
              <div style={{ background: '#fff2f0', padding: 12, borderRadius: 8 }}>
                <Row gutter={[8, 8]}>
                  <Col span={24}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #ffccc7' }}>
                      <span>
                        <WarningOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                        Đi muộn ({monthlyStats.totalLateMinutes || 0} phút)
                      </span>
                      <Text strong style={{ color: '#ff4d4f' }}>{formatVND(monthlyStats.totalLatePenalty || 0)}đ</Text>
                    </div>
                  </Col>
                  <Col span={24}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #ffccc7' }}>
                      <span>
                        <ExclamationCircleOutlined style={{ color: '#fa8c16', marginRight: 8 }} />
                        Về sớm ({monthlyStats.totalEarlyLeaveMinutes || 0} phút)
                      </span>
                      <Text strong style={{ color: '#fa8c16' }}>{formatVND(monthlyStats.totalEarlyLeavePenalty || 0)}đ</Text>
                    </div>
                  </Col>
                  <Col span={24}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #ffccc7' }}>
                      <span>
                        <MinusCircleOutlined style={{ color: '#cf1322', marginRight: 8 }} />
                        Nghỉ không phép ({monthlyStats.unauthorizedAbsenceDays || 0} ngày)
                      </span>
                      <Text strong style={{ color: '#cf1322' }}>{formatVND(monthlyStats.totalUnauthorizedAbsencePenalty || 0)}đ</Text>
                    </div>
                  </Col>
                  <Col span={24}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', marginTop: 8 }}>
                      <Text strong>TỔNG CỘNG</Text>
                      <Text strong style={{ color: '#ff4d4f', fontSize: 16 }}>{formatVND(monthlyStats.totalPenalty || 0)}đ</Text>
                    </div>
                  </Col>
                </Row>
              </div>
            )
          }
        ]}
      />
    </Card>
  );
};

export default MonthlyStatsCard;
