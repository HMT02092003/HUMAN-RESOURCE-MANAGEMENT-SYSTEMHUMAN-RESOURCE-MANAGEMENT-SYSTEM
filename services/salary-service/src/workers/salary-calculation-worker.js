/**
 * ====================================================================
 * Salary Calculation Worker - Xử lý tính lương bằng AI
 * ====================================================================
 * 
 * Worker này:
 * 1. Lấy message từ RabbitMQ queue: salary_calculation_queue
 * 2. Gọi AI Service để phân tích và tính lương
 * 3. Tính toán lương dựa trên các yếu tố: KPI, chuyên cần, overtime...
 * 4. Cập nhật database với kết quả
 * 5. Đổi trạng thái thành WAITING_APPROVAL
 */

import dotenv from 'dotenv';
dotenv.config();

import rabbitmqManager from '../utils/rabbitmq.js';
import knex from '../lib/Databases/Connection.ts';
import axios from 'axios';
import AttendanceService from '../integrations/AttendanceService';
import PayslipCalculationService from '../services/payslipCalculationService';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:4006';
const ATTENDANCE_SERVICE_URL = process.env.ATTENDANCE_SERVICE_URL || 'http://localhost:4003';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4009';

class SalaryCalculationWorker {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Bắt đầu worker
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️  Worker đang chạy rồi');
      return;
    }

    this.isRunning = true;
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  💰 Salary Calculation Worker đang khởi động...        ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Kết nối RabbitMQ trước khi lắng nghe queue
    console.log('🔌 Đang kết nối RabbitMQ...');

    let connected = false;
    let retryCount = 0;
    const maxRetries = 5;

    while (!connected && retryCount < maxRetries) {
      connected = await rabbitmqManager.connect();
      if (!connected) {
        retryCount++;
        console.log(`⚠️  Không kết nối được RabbitMQ. Thử lại lần ${retryCount}/${maxRetries} sau 5 giây...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    if (!connected) {
      console.log('⚠️  Không kết nối được RabbitMQ sau các lần thử ban đầu.');
      console.log('⏳ Sẽ giữ worker chạy và retry ngầm mỗi 30 giây...');

      setInterval(async () => {
        if (!rabbitmqManager.isConnected) {
          console.log('🔄 Thử kết nối lại RabbitMQ (Background)...');
          const reconnected = await rabbitmqManager.connect();
          if (reconnected) {
            console.log('✅ Đã kết nối thành công RabbitMQ!');
            await rabbitmqManager.consumeQueue('salary_calculation_queue', this.handleSalaryCalculation.bind(this));
            console.log('✅ Worker đã sẵn sàng xử lý message!');
          }
        }
      }, 30000);
      return;
    }

    // Lắng nghe queue
    console.log('🚀 Bắt đầu lắng nghe queue: salary_calculation_queue');
    await rabbitmqManager.consumeQueue('salary_calculation_queue', this.handleSalaryCalculation.bind(this));
    console.log('✅ Worker đã sẵn sàng xử lý message!');

    // Database poller DISABLED - không cần task_queue table nữa
    // this.startDatabasePoller();
  }

  /**
   * Xử lý message tính lương từ queue
   * Luôn dùng service tính toán đầy đủ (phụ cấp, bảo hiểm, thuế, khấu trừ)
   */
  async handleSalaryCalculation(data) {
    const { year, month, userIds, requestedBy, forceRecalculate, authToken } = data;

    console.log('\n🔴🔴🔴 [WORKER] NHẬN ĐƯỢC MESSAGE TỪ QUEUE! 🔴🔴🔴');
    console.log(`💰 Bắt đầu tính lương cho tháng: ${month}/${year}`);
    console.log(`👥 Số lượng users: ${userIds?.length || 'TẤT CẢ'}`);
    console.log(`🎯 RequestedBy: ${requestedBy}, forceRecalculate: ${!!forceRecalculate}`);

    try {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;

      // Xóa bảng lương cũ nếu forceRecalculate
      if (forceRecalculate) {
        const deleteQuery = knex('monthly_payslips').where({ year: Number(year), month: Number(month) });
        if (userIds && userIds.length > 0) {
          deleteQuery.whereIn('user_id', userIds.map(id => String(id)));
        }
        const deleted = await deleteQuery.del();
        console.log(`🔄 Đã xóa ${deleted} bảng lương cũ để tính lại`);
      }

      // Gọi service tính toán đầy đủ
      console.log('💼 Đang gọi PayslipCalculationService để tính lương đầy đủ...');
      const result = await PayslipCalculationService.calculateAndInsertPayslipsForMonth(monthStr, { authToken });

      console.log('\n' + '='.repeat(60));
      console.log(`📊 KẾT QUẢ TÍNH LƯƠNG THÁNG ${month}/${year}`);
      console.log(`✅ Thành công: ${result.inserted || 0}`);
      console.log(`⏭️  Bỏ qua: ${result.skipped || 0}`);
      if (result.usersWithoutContracts?.length > 0) {
        console.log(`⚠️  Không có hợp đồng: ${result.usersWithoutContracts.length}`);
      }
      if (result.usersWithoutSalaryProfile?.length > 0) {
        console.log(`⚠️  Không có cấu hình lương: ${result.usersWithoutSalaryProfile.length}`);
      }
      console.log('='.repeat(60) + '\n');

      // Gửi thông báo chi tiết cho người yêu cầu
      if (requestedBy) {
        try {
          let notificationContent = `Đã hoàn thành tính lương tháng ${month}/${year}.\n`;
          notificationContent += `✅ Thành công: ${result.inserted || 0} nhân viên\n`;

          if (result.skipped > 0) {
            notificationContent += `⏭️ Đã bỏ qua: ${result.skipped} (đã tồn tại)\n`;
          }

          if (result.usersWithoutContracts?.length > 0) {
            notificationContent += `⚠️ ${result.usersWithoutContracts.length} nhân viên không có hợp đồng hiệu lực\n`;
          }

          if (result.usersWithoutSalaryProfile?.length > 0) {
            notificationContent += `⚠️ ${result.usersWithoutSalaryProfile.length} nhân viên chưa có cấu hình lương\n`;
          }

          await axios.post(`${NOTIFICATION_SERVICE_URL}/internal/send`, {
            userIds: [requestedBy],
            title: result.inserted > 0 ? '💰 Tính lương hoàn thành' : '⚠️ Tính lương có vấn đề',
            content: notificationContent.trim(),
            type: 'SALARY_CALCULATION_COMPLETED',
            data: {
              month,
              year,
              inserted: result.inserted || 0,
              skipped: result.skipped || 0,
              usersWithoutContracts: result.usersWithoutContracts || [],
              usersWithoutSalaryProfile: result.usersWithoutSalaryProfile || []
            }
          });
          console.log(`📢 Đã gửi thông báo tới user ${requestedBy}`);
        } catch (notifError) {
          console.error('⚠️  Lỗi gửi thông báo:', notifError.message);
        }
      }

    } catch (error) {
      console.error('❌ LỖI NGHIÊM TRỌNG khi tính lương:', error.message);
      console.error(error.stack);

      // Gửi thông báo lỗi
      if (requestedBy) {
        try {
          await axios.post(`${NOTIFICATION_SERVICE_URL}/internal/send`, {
            userIds: [requestedBy],
            title: '❌ Lỗi tính lương',
            content: `Không thể tính lương tháng ${month}/${year}. Lỗi: ${error.message}`,
            type: 'SALARY_CALCULATION_ERROR',
            data: { month, year, error: error.message }
          });
        } catch (notifError) {
          console.error('⚠️  Không gửi được thông báo lỗi:', notifError.message);
        }
      }
    }
  }

  /**
   * Tính lương cho 1 user cụ thể
   */
  async calculateSalaryForUser(employeeId, year, month) {
    // 1. Lấy dữ liệu chuyên cần
    const attendanceData = await this.getAttendanceData(employeeId, month, year);

    // 2. Lấy salary profile
    const salaryProfile = await this.getSalaryProfile(employeeId);

    // 3. Gọi AI Service để tính lương
    const calculationResult = await this.callAISalaryCalculation({
      employeeId,
      salaryProfile,
      attendanceData,
      month,
      year
    });

    // 4. Tạo payslip record với kết quả tính toán
    const insertData = {
      user_id: String(employeeId),
      year: Number(year),
      month: Number(month),
      base_salary: String(calculationResult.base_salary || 0),
      gross_salary: String(calculationResult.total_salary || 0),
      net_salary: String(calculationResult.net_salary || calculationResult.total_salary || 0),
      status: 'WAITING_APPROVAL',
      notes: JSON.stringify(calculationResult),
      created_at: new Date(),
      updated_at: new Date()
    };

    const [inserted] = await knex('monthly_payslips').insert(insertData).returning('*');
    const payslipId = inserted?.id || inserted[0]?.id;

    console.log(`💵 Tổng lương: ${calculationResult.total_salary?.toLocaleString() || 0} VNĐ`);

    return payslipId;
  }

  /**
   * OLD METHOD - Removed, không cần nữa
   */

  /**
   * Lấy dữ liệu chuyên cần từ Attendance Service
   */
  async getAttendanceData(employeeId, month, year) {
    try {
      const url = `${ATTENDANCE_SERVICE_URL}/user/${employeeId}/monthly-full`;
      console.log(`🔗 Calling attendance API: ${url}?year=${year}&month=${month}`);

      const response = await axios.get(url, {
        params: { year, month },
        timeout: 10000
      });

      console.log(`✅ Attendance API response:`, response.data.success ? 'SUCCESS' : 'FAILED');

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error('Không lấy được dữ liệu chuyên cần');

    } catch (error) {
      console.error('❌ Lỗi lấy dữ liệu chuyên cần:', error.message);
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Data:', error.response.data);
      }
      // Trả về dữ liệu mặc định nếu lỗi
      return {
        working_days: 22,
        absent_days: 0,
        late_count: 0,
        overtime_hours: 0
      };
    }
  }

  /**
   * Lấy thông tin lương cơ bản từ database
   */
  async getSalaryProfile(employeeId) {
    try {
      const profile = await knex('employee_salary_profiles')
        .where('user_id', employeeId)
        .first();

      if (!profile) {
        console.warn(`⚠️  Không tìm thấy salary profile cho User ${employeeId}, dùng giá trị mặc định`);
        // Trả về giá trị mặc định thay vì throw error
        return {
          user_id: employeeId,
          base_salary: 5000000, // 5 triệu VNĐ mặc định
          allowances: 0,
          position_allowance: 0,
          transport_allowance: 0,
          meal_allowance: 0
        };
      }

      return profile;

    } catch (error) {
      console.error('❌ Lỗi lấy salary profile:', error.message);
      throw error;
    }
  }

  /**
   * Gọi AI Service để tính lương thông minh
   */
  async callAISalaryCalculation(data) {
    try {
      const url = `${AI_SERVICE_URL}/calculate-salary`;
      console.log(`🤖 Calling AI Service: ${url}`);

      const response = await axios.post(url, {
        employee_id: data.employeeId,
        base_salary: data.salaryProfile.base_salary,
        allowances: data.salaryProfile.allowances,
        attendance: data.attendanceData,
        month: data.month,
        year: data.year,
        calculation_type: 'comprehensive' // Tính toán toàn diện
      }, {
        timeout: 30000 // 30s timeout
      });

      console.log(`✅ AI Service response:`, response.data.success ? 'SUCCESS' : 'FAILED');

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'AI Service error');
      }

    } catch (error) {
      console.error('❌ AI Service không khả dụng:', error.message);
      console.log('🔄 Fallback: Tính lương theo công thức cơ bản');

      // Fallback: Tính lương đơn giản khi AI không hoạt động hoặc endpoint không tồn tại
      return this.calculateSalaryBasic(data);
    }
  }

  /**
   * Tính lương cơ bản (fallback khi AI không hoạt động)
   */
  calculateSalaryBasic(data) {
    const { salaryProfile, attendanceData } = data;

    const baseSalary = parseFloat(salaryProfile.base_salary);
    const workingDays = attendanceData.working_days;
    const standardDays = 22;

    // Lương theo ngày công
    const salaryPerDay = baseSalary / standardDays;
    const actualSalary = salaryPerDay * workingDays;

    // Phụ cấp
    const allowances = parseFloat(salaryProfile.allowances || 0);

    // Overtime
    const overtimePay = attendanceData.overtime_hours * (salaryPerDay / 8) * 1.5;

    // Tổng lương
    const totalSalary = actualSalary + allowances + overtimePay;

    return {
      base_salary: baseSalary,
      actual_salary: actualSalary,
      allowances: allowances,
      overtime_pay: overtimePay,
      deductions: 0,
      total_salary: totalSalary,
      calculation_method: 'basic_fallback',
      breakdown: {
        working_days: workingDays,
        standard_days: standardDays,
        salary_per_day: salaryPerDay,
        overtime_hours: attendanceData.overtime_hours
      }
    };
  }

  /**
   * Cập nhật trạng thái payslip
   */
  async updatePayslipStatus(payslipId, status, additionalData = {}) {
    try {
      await knex('monthly_payslips')
        .where('id', payslipId)
        .update({
          status: status,
          ...additionalData,
          updated_at: new Date()
        });

      console.log(`📝 Đã cập nhật status: ${status} cho Payslip ${payslipId}`);

    } catch (error) {
      console.error('❌ Lỗi cập nhật database:', error.message);
      throw error;
    }
  }

  /**
   * Poll database để xử lý tasks khi RabbitMQ offline
   */
  startDatabasePoller() {
    console.log('📊 Bật Database Poller (xử lý fallback tasks)...');

    setInterval(async () => {
      try {
        const tasks = await knex('task_queue')
          .where('status', 'pending')
          .where('queue_name', 'salary_calculation_queue')
          .where('retry_count', '<', knex.raw('max_retries'))
          .orderBy('created_at', 'asc')
          .limit(5);

        if (tasks.length > 0) {
          console.log(`\n📦 Tìm thấy ${tasks.length} pending tasks trong database`);

          for (const task of tasks) {
            try {
              await knex('task_queue')
                .where('id', task.id)
                .update({
                  status: 'processing',
                  processed_at: new Date()
                });

              const payload = JSON.parse(task.payload);
              await this.handleSalaryCalculation(payload);

              await knex('task_queue')
                .where('id', task.id)
                .update({
                  status: 'completed',
                  completed_at: new Date()
                });

            } catch (error) {
              console.error(`❌ Lỗi xử lý task ${task.id}:`, error.message);

              await knex('task_queue')
                .where('id', task.id)
                .update({
                  status: 'pending',
                  retry_count: task.retry_count + 1,
                  error_message: error.message
                });
            }
          }
        }

      } catch (error) {
        console.error('❌ Lỗi database poller:', error.message);
      }

    }, 10000); // Poll mỗi 10 giây
  }

  /**
   * Dừng worker
   */
  async stop() {
    this.isRunning = false;
    await rabbitmqManager.close();
    console.log('🛑 Worker đã dừng');
  }
}

export default SalaryCalculationWorker;
