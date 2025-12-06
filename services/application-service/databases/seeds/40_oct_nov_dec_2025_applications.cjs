/**/**

 * SEED: Đơn từ Oct/Nov/Dec 2025 (100 Employees) * SEED CHÍNH: Đơn từ Oct/Nov/Dec 2025 (100 Employees)

 *  * 

 * Chỉ tạo 2 loại đơn: * Đồng bộ với attendance-service seed để đảm bảo:

 * 1. NGHỈ PHÉP (leave): * - Các ngày nghỉ phép có đơn leave được duyệt

 *    - Nghỉ phép có lương (paid): tính công * - Các ngày công tác có đơn business-trip được duyệt

 *    - Nghỉ không lương (regular): không tính công * - Các ngày OT có đơn overtime được duyệt

 *  * - Các ngày quên chấm công có đơn forgot-check

 * 2. CÔNG TÁC (business-trip): * 

 *    - Có thể kéo dài nhiều ngày (1-5 ngày) * Khung giờ chuẩn: 08:00 - 17:00

 *    - Ngày cuối tuần (T7/CN) nếu công tác sẽ được tính OT * Tháng 12: chỉ đến ngày 5/12/2025 (ngày hiện tại)

 *  */

 * Khung giờ chuẩn: 08:00 - 17:00

 * Tháng 12: chỉ đến ngày 5/12/2025exports.seed = async function(knex) {

 */  console.log('\n' + '='.repeat(70));

  console.log('📋 SEED CHÍNH: Đơn từ Oct/Nov/Dec 2025');

exports.seed = async function(knex) {  console.log('   Bao gồm: leave, business-trip, overtime, forgot-check');

  console.log('\n' + '='.repeat(70));  console.log('='.repeat(70));

  console.log('📋 SEED: Đơn từ Oct/Nov/Dec 2025 (Leave + Business Trip)');  

  console.log('='.repeat(70));  // Xóa dữ liệu applications tháng 10, 11, 12/2025

    await knex('applications')

  // Xóa dữ liệu applications tháng 10, 11, 12/2025    .whereRaw("created_at >= '2025-10-01' AND created_at <= '2025-12-31'")

  await knex('applications')    .del();

    .whereRaw("created_at >= '2025-10-01' AND created_at <= '2025-12-31'")  console.log('\n🗑️  Đã xóa dữ liệu cũ');

    .del();  

  console.log('\n🗑️  Đã xóa dữ liệu cũ');  // Helper: Lấy ngày làm việc trong một tháng (loại bỏ T7 và CN)

    const getWorkingDays = (year, month, maxDay = null) => {

  // Danh sách ngày lễ trong tháng 10-12/2025    const daysInMonth = new Date(year, month + 1, 0).getDate();

  const holidays = new Set([    const lastDay = maxDay ? Math.min(maxDay, daysInMonth) : daysInMonth;

    '2025-12-24', '2025-12-25', // Giáng sinh    const workingDays = [];

  ]);    

      for (let day = 1; day <= lastDay; day++) {

  // Helper: Kiểm tra có phải ngày làm việc không      const date = new Date(year, month, day);

  const isWorkingDay = (year, month, day) => {      const dayOfWeek = date.getDay();

    const date = new Date(year, month, day);      if (dayOfWeek !== 0 && dayOfWeek !== 6) {

    const dayOfWeek = date.getDay();        workingDays.push(day);

    const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;      }

    return dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(dateStr);    }

  };    return workingDays;

    };

  // Helper: Lấy ngày làm việc trong một tháng

  const getWorkingDays = (year, month, maxDay = null) => {  const applications = [];

    const daysInMonth = new Date(year, month + 1, 0).getDate();  

    const lastDay = maxDay ? Math.min(maxDay, daysInMonth) : daysInMonth;  // Các tháng cần seed (tháng 12 chỉ đến ngày 5)

    const workingDays = [];  const months = [

        { year: 2025, month: 9, name: 'October 2025', maxDay: null },    // Tháng 10 (full)

    for (let day = 1; day <= lastDay; day++) {    { year: 2025, month: 10, name: 'November 2025', maxDay: null },  // Tháng 11 (full)

      if (isWorkingDay(year, month, day)) {    { year: 2025, month: 11, name: 'December 2025', maxDay: 5 }      // Tháng 12 (đến ngày 5)

        workingDays.push(day);  ];

      }

    }  let stats = { leave: 0, businessTrip: 0, overtime: 0, forgotCheck: 0 };

    return workingDays;

  };  for (const { year, month, name, maxDay } of months) {

    const workingDays = getWorkingDays(year, month, maxDay);

  const applications = [];    console.log(`\n📅 ${name}: ${workingDays.length} ngày làm việc`);

      

  // Các tháng cần seed    for (let userId = 1; userId <= 100; userId++) {

  const months = [      const usedDays = new Set();

    { year: 2025, month: 9, name: 'October 2025', maxDay: null },      

    { year: 2025, month: 10, name: 'November 2025', maxDay: null },      // Random số lượng đơn từ cho mỗi loại (đảm bảo có đủ case)

    { year: 2025, month: 11, name: 'December 2025', maxDay: 5 }      const numLeave = Math.floor(Math.random() * 3); // 0-2 đơn nghỉ phép

  ];      const numTrip = Math.floor(Math.random() * 2);  // 0-1 đơn công tác  

      const numOT = Math.floor(Math.random() * 4);    // 0-3 đơn OT

  let stats = { leave: 0, businessTrip: 0, totalLeaveDays: 0, totalTripDays: 0 };      const numForgot = Math.floor(Math.random() * 2); // 0-1 đơn quên chấm công



  // Lý do nghỉ phép      // === ĐƠN NGHỈ PHÉP ===

  const leaveReasons = {      for (let i = 0; i < numLeave; i++) {

    paid: ['Nghỉ phép năm', 'Nghỉ cưới', 'Nghỉ phép theo quy định'],        let day;

    regular: ['Nghỉ việc riêng', 'Nghỉ không lương'],        let attempts = 0;

    sick: ['Nghỉ ốm', 'Khám bệnh', 'Chăm sóc người thân ốm']        do { 

  };          day = workingDays[Math.floor(Math.random() * workingDays.length)]; 

            attempts++;

  // Địa điểm công tác        } while (usedDays.has(day) && attempts < 20);

  const tripDestinations = [        

    'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng',         if (!usedDays.has(day)) {

    'Bình Dương', 'Nha Trang', 'Huế', 'Vũng Tàu',          usedDays.add(day);

    'Quảng Ninh', 'Đồng Nai'          const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

  ];          const leaveTypes = ['paid', 'unpaid', 'sick'];

  const tripPurposes = [          const reasons = [

    'Họp với khách hàng',            'Nghỉ phép năm',

    'Khảo sát dự án mới',            'Nghỉ việc riêng', 

    'Đào tạo chi nhánh',            'Khám bệnh',

    'Triển khai hệ thống',            'Chăm sóc người thân',

    'Hội thảo ngành',            'Nghỉ cưới',

    'Kiểm tra tiến độ dự án',            'Nghỉ tang'

    'Ký kết hợp đồng'          ];

  ];          

          applications.push({

  for (const { year, month, name, maxDay } of months) {            type: 'leave',

    const workingDays = getWorkingDays(year, month, maxDay);            status: 1, // approved

    const daysInMonth = maxDay || new Date(year, month + 1, 0).getDate();            data: JSON.stringify({ 

    console.log(`\n📅 ${name}: ${workingDays.length} ngày làm việc`);              reason: reasons[Math.floor(Math.random() * reasons.length)],

                  leaveType: leaveTypes[Math.floor(Math.random() * leaveTypes.length)],

    for (let userId = 1; userId <= 100; userId++) {              startDate: dateStr, 

      const usedDays = new Set();              endDate: dateStr, 

                    totalDays: 1 

      // Random số lượng đơn từ            }),

      const numLeave = Math.floor(Math.random() * 3); // 0-2 đơn nghỉ phép            userId, 

      const numTrip = Math.floor(Math.random() * 2);  // 0-1 đơn công tác            approvedBy: 2, 

            approvedDate: new Date(year, month, Math.max(1, day - 1)),

      // === ĐƠN NGHỈ PHÉP ===            created_at: new Date(year, month, Math.max(1, day - 2)), 

      for (let i = 0; i < numLeave; i++) {            updated_at: new Date(year, month, Math.max(1, day - 1))

        let startDay;          });

        let attempts = 0;          stats.leave++;

        do {         }

          startDay = workingDays[Math.floor(Math.random() * workingDays.length)];       }

          attempts++;

        } while (usedDays.has(startDay) && attempts < 30);      // === ĐƠN CÔNG TÁC ===

              for (let i = 0; i < numTrip; i++) {

        if (!usedDays.has(startDay)) {        let day;

          // Random số ngày nghỉ (1-3 ngày)        let attempts = 0;

          const duration = Math.random() > 0.7 ? (Math.random() > 0.5 ? 3 : 2) : 1;        do { 

                    day = workingDays[Math.floor(Math.random() * workingDays.length)]; 

          let endDay = startDay;          attempts++;

          let actualDays = 1;        } while (usedDays.has(day) && attempts < 20);

                  

          for (let d = 1; d < duration; d++) {        if (!usedDays.has(day)) {

            const nextDay = startDay + d;          usedDays.add(day);

            if (nextDay <= daysInMonth && !usedDays.has(nextDay)) {          const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

              endDay = nextDay;          const locations = ['Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng', 'Bình Dương', 'Nha Trang', 'Huế'];

              actualDays++;          const purposes = ['Họp khách hàng', 'Khảo sát dự án', 'Đào tạo nhân viên', 'Triển khai hệ thống', 'Hội thảo'];

              usedDays.add(nextDay);          

            }          applications.push({

          }            type: 'business-trip',

          usedDays.add(startDay);            status: 1,

                      data: JSON.stringify({ 

          const startDateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(startDay).padStart(2,'0')}`;              reason: purposes[Math.floor(Math.random() * purposes.length)],

          const endDateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(endDay).padStart(2,'0')}`;              location: 'TP.HCM',

                        destination: locations[Math.floor(Math.random() * locations.length)],

          // Random loại nghỉ: paid (60%), regular (30%), sick (10%)              startDate: dateStr, 

          const rand = Math.random();              endDate: dateStr, 

          let leaveType, applicationCategory;              totalDays: 1 

          if (rand < 0.6) {            }),

            leaveType = 'paid';            userId, 

            applicationCategory = 'paid';            approvedBy: 2, 

          } else if (rand < 0.9) {            approvedDate: new Date(year, month, Math.max(1, day - 1)),

            leaveType = 'regular';            created_at: new Date(year, month, Math.max(1, day - 3)), 

            applicationCategory = 'regular';            updated_at: new Date(year, month, Math.max(1, day - 1))

          } else {          });

            leaveType = 'sick';          stats.businessTrip++;

            applicationCategory = 'paid';        }

          }      }

          

          const reasons = leaveReasons[leaveType] || leaveReasons.paid;      // === ĐƠN LÀM THÊM GIỜ (OT) ===

          const reason = reasons[Math.floor(Math.random() * reasons.length)];      for (let i = 0; i < numOT; i++) {

                  const day = workingDays[Math.floor(Math.random() * workingDays.length)];

          applications.push({        const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

            type: 'leave',        const hours = [1, 1.5, 2, 2.5, 3][Math.floor(Math.random() * 5)];

            status: 1,        

            data: JSON.stringify({         // OT sau 17:00

              reason,        const startHour = 17;

              leaveType,        const endHour = startHour + Math.ceil(hours);

              applicationCategory,        const reasons = [

              startDate: startDateStr,           'Hoàn thành dự án gấp',

              endDate: endDateStr,           'Deadline khách hàng',

              totalDays: actualDays           'Họp với đối tác nước ngoài',

            }),          'Xử lý sự cố hệ thống',

            userId,           'Báo cáo cuối tháng'

            approvedBy: 2,         ];

            approvedDate: new Date(year, month, Math.max(1, startDay - 1)),        

            created_at: new Date(year, month, Math.max(1, startDay - 2)),         applications.push({

            updated_at: new Date(year, month, Math.max(1, startDay - 1))          type: 'overtime',

          });          status: 1,

          stats.leave++;          data: JSON.stringify({ 

          stats.totalLeaveDays += actualDays;            reason: reasons[Math.floor(Math.random() * reasons.length)],

        }            date: dateStr,

      }            startTime: `${String(startHour).padStart(2,'0')}:00`,

            endTime: `${String(endHour).padStart(2,'0')}:00`,

      // === ĐƠN CÔNG TÁC ===            totalHours: hours 

      for (let i = 0; i < numTrip; i++) {          }),

        let startDay;          userId, 

        let attempts = 0;          approvedBy: 2, 

        do {           approvedDate: new Date(year, month, day, 18, 30),

          startDay = workingDays[Math.floor(Math.random() * workingDays.length)];           created_at: new Date(year, month, day, 18, 0), 

          attempts++;          updated_at: new Date(year, month, day, 18, 30)

        } while (usedDays.has(startDay) && attempts < 30);        });

                stats.overtime++;

        if (!usedDays.has(startDay)) {      }

          // Random số ngày công tác (1-5 ngày, có thể qua cuối tuần)

          const duration = Math.random() > 0.6       // === ĐƠN QUÊN CHẤM CÔNG ===

            ? (Math.random() > 0.5 ? (Math.floor(Math.random() * 3) + 3) : 2)      for (let i = 0; i < numForgot; i++) {

            : 1;        let day;

                  let attempts = 0;

          const endDay = Math.min(startDay + duration - 1, daysInMonth);        do { 

          const actualDays = endDay - startDay + 1;          day = workingDays[Math.floor(Math.random() * workingDays.length)]; 

                    attempts++;

          for (let d = startDay; d <= endDay; d++) {        } while (usedDays.has(day) && attempts < 20);

            usedDays.add(d);        

          }        if (!usedDays.has(day)) {

                    usedDays.add(day);

          const startDateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(startDay).padStart(2,'0')}`;          const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

          const endDateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(endDay).padStart(2,'0')}`;          const forgotType = Math.random() > 0.5 ? 'check-in' : 'check-out';

                    

          const destination = tripDestinations[Math.floor(Math.random() * tripDestinations.length)];          // Thời gian thực tế theo khung 8h-17h

          const purpose = tripPurposes[Math.floor(Math.random() * tripPurposes.length)];          const actualMinute = Math.floor(Math.random() * 15);

          const estimatedCost = Math.floor(Math.random() * 10 + 1) * 1000000;          const actualTime = forgotType === 'check-in' 

                      ? `${dateStr}T08:${String(actualMinute).padStart(2,'0')}:00+07:00`

          applications.push({            : `${dateStr}T17:${String(actualMinute).padStart(2,'0')}:00+07:00`;

            type: 'business-trip',          

            status: 1,          applications.push({

            data: JSON.stringify({             type: 'forgot-check',

              reason: purpose,            status: 1,

              purpose,            data: JSON.stringify({ 

              location: 'TP.HCM',              reason: `Quên ${forgotType === 'check-in' ? 'chấm công vào' : 'chấm công ra'}`,

              destination,              forgotDate: dateStr,

              startDate: startDateStr,               forgotType: forgotType,

              endDate: endDateStr,               actualTime: actualTime

              totalDays: actualDays,            }),

              estimatedCost            userId, 

            }),            approvedBy: 2, 

            userId,             approvedDate: new Date(year, month, Math.min(day + 1, workingDays[workingDays.length - 1])),

            approvedBy: 2,             created_at: new Date(year, month, day, 18, 0), 

            approvedDate: new Date(year, month, Math.max(1, startDay - 1)),            updated_at: new Date(year, month, Math.min(day + 1, workingDays[workingDays.length - 1]))

            created_at: new Date(year, month, Math.max(1, startDay - 3)),           });

            updated_at: new Date(year, month, Math.max(1, startDay - 1))          stats.forgotCheck++;

          });        }

          stats.businessTrip++;      }

          stats.totalTripDays += actualDays;    }

        }  }

      }

    }  // Insert theo batch để tránh quá tải

  }  console.log('\n💾 Đang insert dữ liệu...');

  for (let i = 0; i < applications.length; i += 100) {

  // Insert theo batch    await knex('applications').insert(applications.slice(i, i + 100));

  console.log('\n💾 Đang insert dữ liệu...');    if ((i + 100) % 500 === 0) {

  for (let i = 0; i < applications.length; i += 100) {      process.stdout.write(`   Inserted ${i + 100}/${applications.length}\r`);

    await knex('applications').insert(applications.slice(i, i + 100));    }

  }  }



  console.log('\n' + '='.repeat(70));  console.log('\n\n' + '='.repeat(70));

  console.log('✅ HOÀN THÀNH SEED ĐƠN TỪ!');  console.log('✅ HOÀN THÀNH SEED ĐƠN TỪ!');

  console.log(`   📊 Tổng: ${applications.length} đơn từ`);  console.log(`   📊 Tổng: ${applications.length} đơn từ`);

  console.log(`   🏖️ Nghỉ phép: ${stats.leave} đơn (${stats.totalLeaveDays} ngày)`);  console.log(`   🏖️ Nghỉ phép: ${stats.leave}`);

  console.log(`   🚗 Công tác: ${stats.businessTrip} đơn (${stats.totalTripDays} ngày)`);  console.log(`   🚗 Công tác: ${stats.businessTrip}`);

  console.log('='.repeat(70));  console.log(`   ⏰ Làm thêm giờ: ${stats.overtime}`);

};  console.log(`   📝 Quên chấm công: ${stats.forgotCheck}`);

  console.log('='.repeat(70));
};
