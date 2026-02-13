
const knex = require('knex');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
const isSameOrAfter = require('dayjs/plugin/isSameOrAfter');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

// Configuration for connecting to services
const dbConfig = {
    client: 'pg',
    connection: {
        host: '127.0.0.1',
        port: 5433,
        user: 'postgres',
        password: '123456'
    }
};

const attendanceDb = knex({ ...dbConfig, connection: { ...dbConfig.connection, database: 'attendance_service' } });
const applicationDb = knex({ ...dbConfig, connection: { ...dbConfig.connection, database: 'application_service' } });
const authDb = knex({ ...dbConfig, connection: { ...dbConfig.connection, database: 'auth_service' } });

// Main seeding function
async function seedDetailedHistory() {
    console.log('🚀 Starting Realistic Data Seeding (Oct 2025 - Feb 2026)...');

    try {
        // 1. Get All Users
        const users = await authDb('users').select('id', 'username', 'email').orderBy('id');
        console.log(`👥 Found ${users.length} users.`);

        if (users.length === 0) {
            console.log('⚠️ No users found. Please seed users first.');
            return;
        }

        const START_DATE = dayjs('2025-10-01');
        const END_DATE = dayjs('2026-02-28');

        // 2. Clear Data Range
        console.log('🧹 Clearing existing data for target period...');

        // Helper to format for raw queries
        const dateRangeQuery = `"data"->>'date' >= '${START_DATE.format('YYYY-MM-DD')}' AND "data"->>'date' <= '${END_DATE.format('YYYY-MM-DD')}'`;
        const otDateRangeQuery = `"data"->>'overtimeDate' >= '${START_DATE.format('YYYY-MM-DD')}' AND "data"->>'overtimeDate' <= '${END_DATE.format('YYYY-MM-DD')}'`;

        // This delete is a bit broad, but safe for dev
        await applicationDb('applications')
            .whereRaw(`(${dateRangeQuery}) OR (${otDateRangeQuery})`)
            .del();

        await attendanceDb('time_attendances')
            .whereRaw(`date >= '${START_DATE.format('YYYY-MM-DD')}' AND date <= '${END_DATE.format('YYYY-MM-DD')}'`)
            .del();

        console.log('✅ Cleared old data.');

        // 3. Define Holidays (Simple list)
        const holidays = [
            '2026-01-01', // New Year
            '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20' // Tet Holiday approx
        ];

        // Helper to generate ISO string with VN Offset (+07:00)
        const getVnTime = (dateStr, timeStr) => {
            const timePart = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
            return `${dateStr}T${timePart}+07:00`;
        };

        // 4. Loop Days
        let currentDate = START_DATE;

        const allApplications = [];
        const allAttendances = [];

        while (currentDate.isSameOrBefore(END_DATE)) {
            const dateStr = currentDate.format('YYYY-MM-DD');
            const dayOfWeek = currentDate.day(); // 0 = Sun, 6 = Sat
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isHoliday = holidays.includes(dateStr);

            // Loop Users
            for (const user of users) {
                // Determine Scenario for this User on this Day
                const rand = Math.random();
                let scenario = 'NORMAL';

                if (isHoliday) {
                    scenario = (rand > 0.95) ? 'OT_HOLIDAY' : 'HOLIDAY_OFF';
                } else if (isWeekend) {
                    scenario = (rand > 0.95) ? 'OT_WEEKEND' : 'WEEKEND_OFF';
                } else {
                    // Normal Working Day
                    if (rand < 0.03) scenario = 'ABSENT';
                    else if (rand < 0.06) scenario = 'LEAVE_UNPAID';
                    else if (rand < 0.10) scenario = 'LEAVE_PAID';
                    else if (rand < 0.13) scenario = 'BUSINESS_TRIP';
                    else if (rand < 0.30) scenario = 'LATE_OR_EARLY';
                    else if (rand < 0.35) scenario = 'OT_NORMAL';
                    else scenario = 'NORMAL';
                }

                // Generate Data based on Scenario
                if (scenario === 'NORMAL') {
                    // 08:00 - 17:00 (Lunch 12-13)
                    // Arrive: 07:45 - 07:59
                    const inMinutes = 45 + Math.floor(Math.random() * 14);
                    const inTime = `07:${inMinutes}`;

                    // Leave: 17:01 - 17:15
                    const outMinutes = 1 + Math.floor(Math.random() * 14);
                    const outTime = `17:${outMinutes.toString().padStart(2, '0')}`;

                    allAttendances.push({
                        userId: user.id,
                        date: dateStr,
                        checkInTime: getVnTime(dateStr, inTime),
                        checkOutTime: getVnTime(dateStr, outTime),
                        totalWorkingUnit: 1.0,
                        dailyWorkingUnit: 1.0,
                        dailyTotalWorkHours: 8.0,
                        lateMinutes: 0,
                        earlyDepartureMinutes: 0,
                        lateArrivalPenalty: 0,
                        earlyLeavePenalty: 0
                    });
                }
                else if (scenario === 'LATE_OR_EARLY') {
                    const isLate = Math.random() > 0.4;
                    const isEarly = Math.random() > 0.4;

                    let inTimeStr = '07:55';
                    let lateMins = 0;
                    if (isLate) {
                        lateMins = 5 + Math.floor(Math.random() * 40);
                        const h = 8;
                        const m = lateMins;
                        const mm = m % 60;
                        const hh = h + Math.floor(m / 60);
                        inTimeStr = `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
                    }

                    let outTimeStr = '17:05';
                    let earlyMins = 0;
                    if (isEarly) {
                        earlyMins = 5 + Math.floor(Math.random() * 40);
                        const totalMin = 17 * 60 - earlyMins;
                        const hh = Math.floor(totalMin / 60);
                        const mm = totalMin % 60;
                        outTimeStr = `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
                    }

                    if (!isLate && !isEarly) {
                        lateMins = 10;
                        inTimeStr = '08:10';
                    }

                    let workHours = 8.0 - (lateMins / 60) - (earlyMins / 60);
                    if (workHours < 0) workHours = 0;
                    const unit = Number((workHours / 8.0).toFixed(2));

                    allAttendances.push({
                        userId: user.id,
                        date: dateStr,
                        checkInTime: getVnTime(dateStr, inTimeStr),
                        checkOutTime: getVnTime(dateStr, outTimeStr),
                        totalWorkingUnit: unit,
                        dailyWorkingUnit: unit,
                        dailyTotalWorkHours: Number(workHours.toFixed(2)),
                        lateMinutes: lateMins,
                        earlyDepartureMinutes: earlyMins,
                        lateArrivalPenalty: lateMins > 0 ? lateMins * 2000 : 0,
                        earlyLeavePenalty: earlyMins > 0 ? earlyMins * 2000 : 0
                    });
                }
                else if (scenario === 'ABSENT') {
                    // No attendance record -> Absent
                }
                else if (scenario === 'LEAVE_PAID' || scenario === 'LEAVE_UNPAID') {
                    const isPaid = (scenario === 'LEAVE_PAID');
                    allApplications.push({
                        userId: user.id,
                        type: 'leave',
                        status: 1,
                        data: JSON.stringify({
                            reason: isPaid ? 'Nghỉ phép năm' : 'Việc gia đình',
                            leaveType: isPaid ? 'annual_leave' : 'personal_leave',
                            isPaidLeave: isPaid,
                            startDate: dateStr,
                            endDate: dateStr
                        }),
                        created_at: new Date(),
                        updated_at: new Date()
                    });
                }
                else if (scenario === 'BUSINESS_TRIP') {
                    allApplications.push({
                        userId: user.id,
                        type: 'business-trip',
                        status: 1,
                        data: JSON.stringify({
                            title: 'Công tác tỉnh',
                            destination: 'Đà Nẵng',
                            startDate: dateStr,
                            endDate: dateStr
                        }),
                        created_at: new Date(),
                        updated_at: new Date()
                    });
                }
                else if (scenario === 'OT_NORMAL') {
                    // Normal work 8-17 + OT 17:00-19:00
                    allApplications.push({
                        userId: user.id,
                        type: 'overtime',
                        status: 1,
                        data: JSON.stringify({
                            reason: 'Chạy deadline',
                            startTime: '17:00',
                            endTime: '19:00',
                            overtimeDate: dateStr,
                            duration: 2
                        }),
                        created_at: new Date(),
                        updated_at: new Date()
                    });

                    allAttendances.push({
                        userId: user.id,
                        date: dateStr,
                        checkInTime: getVnTime(dateStr, '07:55'),
                        checkOutTime: getVnTime(dateStr, '19:05'),
                        totalWorkingUnit: 1.375, // 1 + 2 * 1.5 / 8
                        dailyWorkingUnit: 1.0,
                        dailyTotalWorkHours: 10.0,
                        lateMinutes: 0,
                        earlyDepartureMinutes: 0,
                        lateArrivalPenalty: 0,
                        earlyLeavePenalty: 0
                    });
                }
                else if (scenario === 'OT_WEEKEND' || scenario === 'OT_HOLIDAY') {
                    // OT 08:00 - 12:00
                    allApplications.push({
                        userId: user.id,
                        type: 'overtime',
                        status: 1,
                        data: JSON.stringify({
                            reason: scenario === 'OT_HOLIDAY' ? 'Trực lễ' : 'Hỗ trợ dự án',
                            startTime: '08:00',
                            endTime: '12:00',
                            overtimeDate: dateStr,
                            duration: 4
                        }),
                        created_at: new Date(),
                        updated_at: new Date()
                    });

                    allAttendances.push({
                        userId: user.id,
                        date: dateStr,
                        checkInTime: getVnTime(dateStr, '07:50'),
                        checkOutTime: getVnTime(dateStr, '12:05'),
                        totalWorkingUnit: 0.75, // 4 * 1.5 / 8
                        dailyWorkingUnit: 0,
                        otWorkingUnit: 0.75,
                        dailyTotalWorkHours: 4.0,
                        lateMinutes: 0,
                        earlyDepartureMinutes: 0,
                        lateArrivalPenalty: 0,
                        earlyLeavePenalty: 0
                    });
                }
            }

            currentDate = currentDate.add(1, 'day');
        }

        // 5. Perform Inserts
        if (allApplications.length > 0) {
            console.log(`📝 Inserting ${allApplications.length} applications...`);
            // Chunking
            const chunkSize = 100;
            for (let i = 0; i < allApplications.length; i += chunkSize) {
                await applicationDb('applications').insert(allApplications.slice(i, i + chunkSize));
            }
        }

        if (allAttendances.length > 0) {
            console.log(`⏰ Inserting ${allAttendances.length} attendance records...`);
            const chunkSize = 100;
            for (let i = 0; i < allAttendances.length; i += chunkSize) {
                await attendanceDb('time_attendances').insert(allAttendances.slice(i, i + chunkSize));
            }
        }

        console.log('🎉 Seeding Complete!');

    } catch (error) {
        console.error('❌ Error during seeding:', error);
    } finally {
        await attendanceDb.destroy();
        await applicationDb.destroy();
        await authDb.destroy();
    }
}

seedDetailedHistory();
