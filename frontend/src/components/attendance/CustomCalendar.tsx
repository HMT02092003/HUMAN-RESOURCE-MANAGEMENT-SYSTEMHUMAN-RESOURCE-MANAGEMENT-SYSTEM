import React from 'react';
import dayjs, { Dayjs } from 'dayjs';
import './CustomCalendar.css';

interface CustomCalendarProps {
  value: Dayjs;
  onDateSelect: (date: Dayjs) => void;
  cellRender: (date: Dayjs, isCurrentMonth: boolean) => React.ReactNode;
  isMobile?: boolean;
}

const CustomCalendar: React.FC<CustomCalendarProps> = ({ 
  value, 
  onDateSelect, 
  cellRender,
  isMobile = false 
}) => {
  // Lấy ngày đầu tháng và cuối tháng
  const startOfMonth = value.startOf('month');
  const endOfMonth = value.endOf('month');
  const daysInMonth = value.daysInMonth();

  // Tìm ngày Thứ 2 đầu tiên của tuần chứa ngày 1
  const startDay = startOfMonth.day(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  // Convert to Monday-based index where Monday=0 and Sunday=6
  const daysFromMonday = (startDay + 6) % 7; // Số ngày từ T2 đến ngày 1
  
  const startDate = startOfMonth.subtract(daysFromMonday, 'day');

  // Tạo mảng 6 tuần (42 ngày)
  const days: Dayjs[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(startDate.add(i, 'day'));
  }

  // Header các ngày trong tuần (T2 -> CN)
  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  return (
    <div className={`custom-calendar ${isMobile ? 'mobile' : ''}`}>
      {/* Header ngày trong tuần */}
      <div className="calendar-header">
        {weekDays.map((day, index) => (
          <div key={index} className="header-cell">
            {day}
          </div>
        ))}
      </div>

      {/* Body các ngày */}
      <div className="calendar-body">
        {days.map((date, index) => {
          const isCurrentMonth = date.month() === value.month();
          const isToday = date.isSame(dayjs(), 'day');
          const isSelected = date.isSame(value, 'day');

          return (
            <div
              key={index}
              className={`calendar-cell ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => onDateSelect(date)}
            >
              <div className="cell-header">
                <span className="date-number">{date.date()}</span>
              </div>
              <div className="cell-content">
                {cellRender(date, isCurrentMonth)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CustomCalendar;
