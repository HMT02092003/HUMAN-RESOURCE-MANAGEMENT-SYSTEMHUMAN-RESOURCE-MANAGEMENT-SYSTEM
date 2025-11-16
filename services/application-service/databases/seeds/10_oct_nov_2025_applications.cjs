/**
 * SEED: Applications for October & November 2025
 * Tạo đơn nghỉ phép, công tác, OT tương ứng với attendance seed
 */

exports.seed = async function(knex) {
  console.log('\n📝 Seeding Applications for Oct & Nov 2025...\n');
  
  await knex('applications')
    .where('created_at', '>=', '2025-10-01')
    .where('created_at', '<=', '2025-11-30')
    .del();

  const applications = [];
  
  // October scenarios
  // User 3: Nghỉ phép Oct 15-17
  applications.push({
    userId: 3,
    type: 'leave',
    data: JSON.stringify({
      reason: 'Nghỉ phép năm',
      startDate: '2025-10-15',
      endDate: '2025-10-17',
      totalDays: 3,
      leaveType: 'annual'
    }),
    status: 1, // approved
    created_at: new Date('2025-10-10'),
    updated_at: new Date('2025-10-10')
  });

  // User 3: OT Oct 10
  applications.push({
    userId: 3,
    type: 'overtime',
    data: JSON.stringify({
      reason: 'Làm thêm giờ để hoàn thành dự án',
      date: '2025-10-10',
      startTime: '18:00',
      endTime: '20:30',
      totalHours: 2.5
    }),
    status: 1,
    created_at: new Date('2025-10-09'),
    updated_at: new Date('2025-10-09')
  });

  // User 5: Công tác Oct 8-10
  applications.push({
    userId: 5,
    type: 'business-trip',
    data: JSON.stringify({
      reason: 'Công tác Hà Nội - Họp khách hàng',
      startDate: '2025-10-08',
      endDate: '2025-10-10',
      totalDays: 3,
      destination: 'Hà Nội'
    }),
    status: 1,
    created_at: new Date('2025-10-05'),
    updated_at: new Date('2025-10-05')
  });

  // User 5: OT ngày lễ Oct 1
  applications.push({
    userId: 5,
    type: 'overtime',
    data: JSON.stringify({
      reason: 'Làm thêm ngày lễ - Xử lý công việc khẩn cấp',
      date: '2025-10-01',
      startTime: '18:00',
      endTime: '21:00',
      totalHours: 3
    }),
    status: 1,
    created_at: new Date('2025-09-28'),
    updated_at: new Date('2025-09-28')
  });

  // User 11: Công tác ngày lễ Oct 1-2
  applications.push({
    userId: 11,
    type: 'business-trip',
    data: JSON.stringify({
      reason: 'Công tác ngày lễ - Hội nghị quan trọng',
      startDate: '2025-10-01',
      endDate: '2025-10-02',
      totalDays: 2,
      destination: 'TP.HCM'
    }),
    status: 1,
    created_at: new Date('2025-09-25'),
    updated_at: new Date('2025-09-25')
  });

  // User 13: Nghỉ phép Oct 20-22
  applications.push({
    userId: 13,
    type: 'leave',
    data: JSON.stringify({
      reason: 'Nghỉ phép cá nhân',
      startDate: '2025-10-20',
      endDate: '2025-10-22',
      totalDays: 3,
      leaveType: 'personal'
    }),
    status: 1,
    created_at: new Date('2025-10-15'),
    updated_at: new Date('2025-10-15')
  });

  // User 17: OT nhiều ngày Oct 5, 10, 15, 20, 25
  for (const day of [5, 10, 15, 20, 25]) {
    applications.push({
      userId: 17,
      type: 'overtime',
      data: JSON.stringify({
        reason: `Làm thêm giờ ngày ${day}/10`,
        date: `2025-10-${String(day).padStart(2, '0')}`,
        startTime: '18:00',
        endTime: '20:00',
        totalHours: 2
      }),
      status: 1,
      created_at: new Date(`2025-10-${String(day - 1).padStart(2, '0')}`),
      updated_at: new Date(`2025-10-${String(day - 1).padStart(2, '0')}`)
    });
  }

  // November scenarios
  // User 4: Nghỉ phép Nov 11-12
  applications.push({
    userId: 4,
    type: 'leave',
    data: JSON.stringify({
      reason: 'Nghỉ phép năm',
      startDate: '2025-11-11',
      endDate: '2025-11-12',
      totalDays: 2,
      leaveType: 'annual'
    }),
    status: 1,
    created_at: new Date('2025-11-05'),
    updated_at: new Date('2025-11-05')
  });

  // User 4: OT Nov 5, 10
  for (const day of [5, 10]) {
    applications.push({
      userId: 4,
      type: 'overtime',
      data: JSON.stringify({
        reason: `Làm thêm giờ ngày ${day}/11`,
        date: `2025-11-${String(day).padStart(2, '0')}`,
        startTime: '18:00',
        endTime: '20:30',
        totalHours: 2.5
      }),
      status: 1,
      created_at: new Date(`2025-11-${String(day - 1).padStart(2, '0')}`),
      updated_at: new Date(`2025-11-${String(day - 1).padStart(2, '0')}`)
    });
  }

  // User 6: Công tác Nov 6-8
  applications.push({
    userId: 6,
    type: 'business-trip',
    data: JSON.stringify({
      reason: 'Công tác Đà Nẵng',
      startDate: '2025-11-06',
      endDate: '2025-11-08',
      totalDays: 3,
      destination: 'Đà Nẵng'
    }),
    status: 1,
    created_at: new Date('2025-11-03'),
    updated_at: new Date('2025-11-03')
  });

  // User 12: Nghỉ phép Nov 13-14
  applications.push({
    userId: 12,
    type: 'leave',
    data: JSON.stringify({
      reason: 'Nghỉ ốm',
      startDate: '2025-11-13',
      endDate: '2025-11-14',
      totalDays: 2,
      leaveType: 'sick'
    }),
    status: 1,
    created_at: new Date('2025-11-12'),
    updated_at: new Date('2025-11-12')
  });

  // User 14: OT nhiều Nov 3, 7, 11
  for (const day of [3, 7, 11]) {
    applications.push({
      userId: 14,
      type: 'overtime',
      data: JSON.stringify({
        reason: `Làm thêm giờ ngày ${day}/11`,
        date: `2025-11-${String(day).padStart(2, '0')}`,
        startTime: '18:00',
        endTime: '21:00',
        totalHours: 3
      }),
      status: 1,
      created_at: new Date(`2025-11-${String(day - 1).padStart(2, '0')}`),
      updated_at: new Date(`2025-11-${String(day - 1).padStart(2, '0')}`)
    });
  }

  // User 20: Công tác Nov 4-5
  applications.push({
    userId: 20,
    type: 'business-trip',
    data: JSON.stringify({
      reason: 'Công tác Cần Thơ',
      startDate: '2025-11-04',
      endDate: '2025-11-05',
      totalDays: 2,
      destination: 'Cần Thơ'
    }),
    status: 1,
    created_at: new Date('2025-11-01'),
    updated_at: new Date('2025-11-01')
  });

  await knex('applications').insert(applications);
  console.log(`   ✅ Created ${applications.length} applications`);
  console.log(`\n✅ Applications seed completed!\n`);
};
