
const knex = require('knex');

// Configuration for connecting to both services
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

const USER_ID = 3; // Using User 3 as test subject
const YEAR = 2026;
const MONTH = 2;

async function seed() {
    console.log('🌱 Starting Comprehensive Seeding for User', USER_ID);

    try {
        // 1. Clear existing data for User 3 in Feb 2026
        console.log('🧹 Clearing old data...');

        // Clear Applications
        await applicationDb('applications')
            .where('userId', USER_ID)
            .whereRaw(`"data"->>'date' LIKE '${YEAR}-0${MONTH}%' OR "data"->>'overtimeDate' LIKE '${YEAR}-0${MONTH}%'`)
            .del();

        // Clear Attendance
        await attendanceDb('time_attendances')
            .where('userId', USER_ID)
            .whereRaw(`TO_CHAR(date, 'YYYY-MM') = '${YEAR}-0${MONTH}'`)
            .del();

        console.log('✅ Cleared old data.');

        // 2. Insert Applications
        console.log('📝 Inserting Applications...');

        const apps = [
            // Feb 3: OT Normal Day (17:00 - 19:00)
            {
                userId: USER_ID,
                type: 'overtime',
                status: 1,
                data: JSON.stringify({
                    reason: 'Làm thêm dự án',
                    startTime: '17:00',
                    endTime: '19:00',
                    overtimeDate: `${YEAR}-0${MONTH}-03`,
                    duration: 2
                }),
                created_at: new Date(),
                updated_at: new Date()
            },
            // Feb 4: Approved Leave (Paid)
            {
                userId: USER_ID,
                type: 'leave',
                status: 1,
                data: JSON.stringify({
                    reason: 'Nghỉ phép năm',
                    leaveType: 'annual_leave',
                    isPaidLeave: true,
                    startDate: `${YEAR}-0${MONTH}-04`,
                    endDate: `${YEAR}-0${MONTH}-04`
                }),
                created_at: new Date(),
                updated_at: new Date()
            },
            // Feb 5: Approved Leave (Unpaid)
            {
                userId: USER_ID,
                type: 'leave',
                status: 1,
                data: JSON.stringify({
                    reason: 'Việc riêng',
                    leaveType: 'personal_leave',
                    isPaidLeave: false,
                    startDate: `${YEAR}-0${MONTH}-05`,
                    endDate: `${YEAR}-0${MONTH}-05`
                }),
                created_at: new Date(),
                updated_at: new Date()
            },
            // Feb 6: Business Trip
            {
                userId: USER_ID,
                type: 'business-trip',
                status: 1,
                data: JSON.stringify({
                    title: 'Gặp khách hàng',
                    destination: 'Hà Nội',
                    startDate: `${YEAR}-0${MONTH}-06`,
                    endDate: `${YEAR}-0${MONTH}-06`
                }),
                created_at: new Date(),
                updated_at: new Date()
            },
            // Feb 8 (Sunday): OT Holiday/Weekend (08:00 - 12:00)
            {
                userId: USER_ID,
                type: 'overtime',
                status: 1,
                data: JSON.stringify({
                    reason: 'Support hệ thống cuối tuần',
                    startTime: '08:00',
                    endTime: '12:00',
                    overtimeDate: `${YEAR}-0${MONTH}-08`,
                    duration: 4
                }),
                created_at: new Date(),
                updated_at: new Date()
            }
        ];

        await applicationDb('applications').insert(apps);
        console.log(`✅ Inserted ${apps.length} applications.`);

        // 3. Insert Attendance Records
        console.log('⏰ Inserting Attendance Records...');

        const attendances = [
            // Feb 2 (Mon): Normal Day, No OT. On time.
            {
                userId: USER_ID,
                date: `${YEAR}-0${MONTH}-02`,
                checkInTime: `${YEAR}-0${MONTH}-02 07:55:00`,
                checkOutTime: `${YEAR}-0${MONTH}-02 17:05:00`,
                totalWorkingUnit: 1.0,
                dailyTotalWorkHours: 8.0
            },
            // Feb 3 (Tue): Normal Day + OT. On time + OT checked out late.
            {
                userId: USER_ID,
                date: `${YEAR}-0${MONTH}-03`,
                checkInTime: `${YEAR}-0${MONTH}-03 07:50:00`,
                checkOutTime: `${YEAR}-0${MONTH}-03 19:10:00`, // Worked until 19:10 (OT 17:00-19:00 registered)
                totalWorkingUnit: 1.375, // 1 + 2h OT * 1.5 / 8 = 1 + 0.375
                dailyTotalWorkHours: 10.0
            },
            // Feb 7 (Sat): Weekend, No app, but check-in (should default 0 units if logic works)
            {
                userId: USER_ID,
                date: `${YEAR}-0${MONTH}-07`,
                checkInTime: `${YEAR}-0${MONTH}-07 09:00:00`,
                checkOutTime: `${YEAR}-0${MONTH}-07 12:00:00`,
                totalWorkingUnit: 0,
                dailyTotalWorkHours: 3.0
            },
            // Feb 8 (Sun): Weekend + OT.
            {
                userId: USER_ID,
                date: `${YEAR}-0${MONTH}-08`,
                checkInTime: `${YEAR}-0${MONTH}-08 07:45:00`,
                checkOutTime: `${YEAR}-0${MONTH}-08 12:05:00`,
                // OT registered 8-12. Worked full.
                totalWorkingUnit: 0, // Let backend calc
                dailyTotalWorkHours: 0 // Let backend calc
            }
        ];

        await attendanceDb('time_attendances').insert(attendances);
        console.log(`✅ Inserted ${attendances.length} attendance records.`);

        // 4. Force Recalculate Logic Trigger (Optional - usually API does this)
        console.log('ℹ️ You can now run the bulk-calculate API or verify in Frontend.');

    } catch (error) {
        console.error('❌ Error during seeding:', error);
    } finally {
        await attendanceDb.destroy();
        await applicationDb.destroy();
        await authDb.destroy();
    }
}

seed();
