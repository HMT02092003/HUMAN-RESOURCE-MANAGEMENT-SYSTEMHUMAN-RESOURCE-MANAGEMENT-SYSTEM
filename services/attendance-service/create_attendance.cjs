const knex = require('knex');

const db = knex({
    client: 'pg',
    connection: 'postgresql://postgres:123456@localhost:5433/attendance_service'
});

function randomOffsetMinutes(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function dateAddMinutes(dateStr, mins) {
    const d = new Date(dateStr);
    d.setMinutes(d.getMinutes() + mins);
    return d.toISOString();
}

async function main() {
    try {
        const attendances = [];
        const now = new Date().toISOString();

        // Standard time in UTC: checkin 01:00Z (08:00 local), checkout 10:30Z (17:30 local)
        // We add some randomness

        // User ID 3: Day 4 and 5 of March 2026
        const userId3Days = ['2026-03-04', '2026-03-05'];
        for (const date of userId3Days) {
            const baseCheckIn = `${date}T01:00:00.000Z`;
            const baseCheckOut = `${date}T10:30:00.000Z`;

            const inOffset = randomOffsetMinutes(-10, 15); // check in between 07:50 and 08:15
            const outOffset = randomOffsetMinutes(-5, 60); // check out between 17:25 and 18:30

            attendances.push({
                userId: 3,
                date: date,
                checkInTime: dateAddMinutes(baseCheckIn, inOffset),
                checkOutTime: dateAddMinutes(baseCheckOut, outOffset),
                dailyTotalWorkHours: (9.5 * 60 + outOffset - inOffset - 60) / 60, // approx, minus 1 hr lunch
                dailyWorkingUnit: inOffset <= 15 ? 1.0 : (inOffset <= 60 ? 0.5 : 0),
                totalWorkingUnit: inOffset <= 15 ? 1.0 : (inOffset <= 60 ? 0.5 : 0),
                created_at: now,
                updated_at: now
            });
        }

        // tech_mid022 (id: 25) and mailtn (id: 173): March 3 to 6
        const upToTodayDates = ['2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06'];
        const otherUserIds = [25, 173];

        for (const uId of otherUserIds) {
            for (const date of upToTodayDates) {
                const baseCheckIn = `${date}T01:00:00.000Z`;
                const baseCheckOut = `${date}T10:30:00.000Z`;

                const inOffset = randomOffsetMinutes(-15, 20);
                const outOffset = randomOffsetMinutes(0, 45);

                attendances.push({
                    userId: uId,
                    date: date,
                    checkInTime: dateAddMinutes(baseCheckIn, inOffset),
                    checkOutTime: dateAddMinutes(baseCheckOut, outOffset),
                    dailyTotalWorkHours: (9.5 * 60 + outOffset - inOffset - 60) / 60,
                    dailyWorkingUnit: inOffset <= 15 ? 1.0 : (inOffset <= 60 ? 0.5 : 0),
                    totalWorkingUnit: inOffset <= 15 ? 1.0 : (inOffset <= 60 ? 0.5 : 0),
                    created_at: now,
                    updated_at: now
                });
            }
        }

        // Insert or update
        for (const record of attendances) {
            const existing = await db('time_attendances').where({ userId: record.userId, date: record.date }).first();
            if (existing) {
                await db('time_attendances').where({ id: existing.id }).update(record);
            } else {
                await db('time_attendances').insert(record);
            }
        }

        console.log('Successfully inserted/updated realistic attendance records!');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await db.destroy();
    }
}

main();
