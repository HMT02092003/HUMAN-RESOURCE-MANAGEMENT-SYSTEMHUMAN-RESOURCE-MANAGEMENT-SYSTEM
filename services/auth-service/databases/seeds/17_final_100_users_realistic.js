/**
 * REALISTIC SEED: 100 Users với Cấu Trúc Thực Tế
 * 
 * Structure:
 * - 1 Admin (admin / 123456@)
 * - Mỗi phòng: 1 Trưởng phòng + 1 Phó phòng + 2 Team Leaders + Nhân viên
 * - Phòng Nhân sự & Tài chính: Ít người, scope phòng ban → toàn cục
 * - Phòng Công nghệ, Kinh doanh, Marketing: Nhiều người
 * 
 * Phân quyền:
 * - Admin (roleId=1): Toàn quyền
 * - Leader (roleId=3): Trưởng phòng/Phó/Team Lead - scope phòng ban
 * - Employee (roleId=2): Nhân viên - scope cá nhân
 * - Accountant (roleId=4): Tài chính - scope phòng ban → toàn cục
 * - HR (roleId=5): Nhân sự - scope phòng ban → toàn cục
 */

import bcrypt from 'bcryptjs';
import knex from 'knex';

const authDb = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456',
    database: 'auth_service'
  }
});

const employeeDb = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456',
    database: 'employee_service'
  }
});

const salaryDb = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456',
    database: 'salary_service'
  }
});

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateISO(yearMin, yearMax) {
  const year = randInt(yearMin, yearMax);
  const month = randInt(1, 12);
  const day = randInt(1, 28);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00.000Z`;
}

function genPhone(i) {
  const prefixes = ['090','091','092','093','094','095','096','097','098','099'];
  const prefix = prefixes[i % prefixes.length];
  const tail = String(i).padStart(7, '0');
  return `${prefix}${tail}`;
}

function generateFamily() {
  const count = randInt(1, 3);
  const members = [];
  const relationships = [1,2,3,4,5,6,7,8];
  
  for (let i = 0; i < count; i++) {
    const rel = relationships[randInt(0, relationships.length - 1)];
    let birthday;
    if ([1,2,6,7].includes(rel)) birthday = randomDateISO(1940, 1975);
    else if (rel === 8) birthday = randomDateISO(2000, 2018);
    else birthday = randomDateISO(1970, 1995);
    
    members.push({
      name: `Người thân ${i + 1}`,
      birthday,
      relationship: rel
    });
  }
  return members;
}

// Cấu trúc phòng ban — phân bổ hợp lý 100 nhân sự
// Yêu cầu: Ban Giám đốc 4, Công nghệ 30, Kinh doanh 30, Marketing 15, Nhân sự 13, Tài chính 8
const DEPARTMENTS = [
  {
    id: 1, // Ban Giám đốc
    name: 'Ban Giám đốc',
    totalUsers: 4,
    structure: {
      manager: { count: 1, chevronId: 1, roleId: 3, prefix: 'director', salary: 45000000 }, // CEO
      deputy: { count: 1, chevronId: 2, roleId: 3, prefix: 'director_dep', salary: 30000000 },
      member: { count: 2, chevronId: 3, roleId: 3, prefix: 'director_mem', salary: 28000000 }
    }
  },
  {
    id: 2, // Phòng Công nghệ
    name: 'Phòng Công nghệ',
    totalUsers: 30,
    structure: {
      manager: { count: 1, chevronId: 3, roleId: 3, prefix: 'tech_lead', salary: 25000000 },
      deputy: { count: 1, chevronId: 4, roleId: 3, prefix: 'tech_deputy', salary: 20000000 },
      teamLead: { count: 3, chevronId: 5, roleId: 3, prefix: 'tech_tl', salary: 18000000 },
      senior: { count: 8, chevronId: 6, roleId: 2, prefix: 'tech_senior', salary: 15000000 },
      mid: { count: 11, chevronId: 7, roleId: 2, prefix: 'tech_mid', salary: 12000000 },
      junior: { count: 6, chevronId: 8, roleId: 2, prefix: 'tech_junior', salary: 9000000 }
    }
  },
  {
    id: 3, // Phòng Kinh doanh
    name: 'Phòng Kinh doanh',
    totalUsers: 30,
    structure: {
      manager: { count: 1, chevronId: 3, roleId: 3, prefix: 'sales_lead', salary: 22000000 },
      deputy: { count: 1, chevronId: 4, roleId: 3, prefix: 'sales_deputy', salary: 18000000 },
      teamLead: { count: 3, chevronId: 5, roleId: 3, prefix: 'sales_tl', salary: 16000000 },
      senior: { count: 8, chevronId: 6, roleId: 2, prefix: 'sales_senior', salary: 13000000 },
      mid: { count: 12, chevronId: 7, roleId: 2, prefix: 'sales_exec', salary: 11000000 },
      junior: { count: 5, chevronId: 8, roleId: 2, prefix: 'sales_junior', salary: 8000000 }
    }
  },
  {
    id: 4, // Phòng Marketing
    name: 'Phòng Marketing',
    totalUsers: 15,
    structure: {
      manager: { count: 1, chevronId: 3, roleId: 3, prefix: 'mkt_lead', salary: 20000000 },
      deputy: { count: 1, chevronId: 4, roleId: 3, prefix: 'mkt_deputy', salary: 17000000 },
      teamLead: { count: 2, chevronId: 5, roleId: 3, prefix: 'mkt_tl', salary: 15000000 },
      senior: { count: 4, chevronId: 6, roleId: 2, prefix: 'mkt_senior', salary: 12000000 },
      junior: { count: 7, chevronId: 7, roleId: 2, prefix: 'mkt_spec', salary: 10000000 }
    }
  },
  {
    id: 6, // Phòng Nhân sự
    name: 'Phòng Nhân sự',
    totalUsers: 13,
    structure: {
      manager: { count: 1, chevronId: 3, roleId: 5, prefix: 'hr_lead', salary: 21000000 },
      deputy: { count: 1, chevronId: 4, roleId: 5, prefix: 'hr_deputy', salary: 17000000 },
      teamLead: { count: 2, chevronId: 5, roleId: 5, prefix: 'hr_tl', salary: 15000000 },
      senior: { count: 3, chevronId: 6, roleId: 2, prefix: 'hr_senior', salary: 12000000 },
      mid: { count: 4, chevronId: 7, roleId: 2, prefix: 'hr_spec', salary: 10000000 },
      junior: { count: 2, chevronId: 8, roleId: 2, prefix: 'hr_junior', salary: 8000000 }
    }
  },
  {
    id: 5, // Phòng Tài chính
    name: 'Phòng Tài chính',
    totalUsers: 8,
    structure: {
      manager: { count: 1, chevronId: 3, roleId: 4, prefix: 'fin_lead', salary: 22000000 },
      deputy: { count: 1, chevronId: 4, roleId: 4, prefix: 'fin_deputy', salary: 18000000 },
      teamLead: { count: 1, chevronId: 5, roleId: 4, prefix: 'fin_tl', salary: 16000000 },
      senior: { count: 2, chevronId: 6, roleId: 4, prefix: 'fin_senior', salary: 13000000 },
      mid: { count: 3, chevronId: 7, roleId: 4, prefix: 'fin_acc', salary: 11000000 }
    }
  }
];

const MALE_NAMES = [
  'Nguyễn Văn Minh', 'Trần Văn Tuấn', 'Lê Đức Hải', 'Phạm Văn Long', 'Hoàng Văn Nam',
  'Vũ Minh Quân', 'Phan Văn Khoa', 'Đặng Văn Dũng', 'Bùi Văn Hùng', 'Đỗ Văn Phong',
  'Hồ Văn Sang', 'Ngô Văn Sơn', 'Dương Văn Thanh', 'Lý Văn Tiến', 'Võ Văn Trung',
  'Nguyễn Văn Tuấn', 'Trần Văn Tùng', 'Lê Văn Vinh', 'Phạm Văn Yến', 'Hoàng Văn An',
  'Phan Văn Chi', 'Vũ Văn Hiếu', 'Đặng Văn Minh', 'Bùi Văn Quân', 'Đỗ Văn Đức'
];

const FEMALE_NAMES = [
  'Trần Thị Hương', 'Hoàng Thị Lan', 'Phan Thị Thảo', 'Bùi Thị Mai', 'Hồ Thị Nga',
  'Dương Thị Linh', 'Võ Thị Hoa', 'Trần Thị Nhung', 'Phạm Thị Phúc', 'Vũ Thị Tâm',
  'Bùi Thị Thủy', 'Ngô Thị Tú', 'Lý Thị Uyên', 'Nguyễn Thị Xuân', 'Lê Thị Vũ',
  'Hoàng Thị Ý', 'Vũ Thị Bình', 'Bùi Thị Giang', 'Hồ Thị Khánh', 'Dương Thị Ngọc',
  'Võ Thị Quyên', 'Trần Thị Hà', 'Phạm Thị Hương', 'Phan Thị Lan', 'Đặng Thị Mai'
];

export async function seed(mainKnex) {
  console.log('\n🚀 ========================================');
  console.log('   SEED: 100 Users với Cấu Trúc Thực Tế');
  console.log('========================================\n');

  try {
    // Step 1: Clean data
    console.log('📝 Step 1: Cleaning existing data...');
    await authDb('users').del(); // Delete ALL users including admin
    await employeeDb('contracts').del(); // Delete ALL contracts
    await salaryDb('employee_salary_profiles').del();
    
    // Reset sequences
    await authDb.raw('ALTER SEQUENCE users_id_seq RESTART WITH 1');
    await employeeDb.raw('ALTER SEQUENCE contracts_id_seq RESTART WITH 1');
    console.log('   ✅ Cleaned old data & reset sequences\n');

    // Step 2: Create Admin
    console.log('📝 Step 2: Creating Admin user...');
    const hashedPassword = await bcrypt.hash('123456@', 10);
    
    const adminUser = {
      id: 2,
      username: 'admin',
      password: hashedPassword,
      fullName: 'Administrator',
      gender: 1,
      birthday: randomDateISO(1980, 1990),
      phone: genPhone(2),
      email: 'admin@company.com',
      startDate: new Date('2015-01-01'),
      dayOff: null,
      profileFamily: JSON.stringify(generateFamily()),
      chevronId: 1, // CEO
      departmentId: 1, // Ban Giám đốc
      status: 1,
      roleId: 1, // Admin
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await authDb('users').insert(adminUser);
    
    const adminContract = {
      id: 2,
      contractTypeId: 3, // Không thời hạn
      userId: '2',
      startDate: new Date('2015-01-01'),
      endDate: null,
      activeDay: new Date('2015-01-01'),
      created_at: new Date(),
      updated_at: new Date()
    };
    await employeeDb('contracts').insert(adminContract);

    const adminSalary = {
      user_id: '2',
      contract_id: 2,
      base_salary: 50000000,
      created_at: new Date(),
      updated_at: new Date()
    };
    await salaryDb('employee_salary_profiles').insert(adminSalary);
    
    console.log('   ✅ Created admin user');
    console.log('      Username: admin');
    console.log('      Password: 123456@');
    console.log('      Role: Admin (Full Access)\n');
    // Step 3: Create special accounts outside the 100 users: 'toanhm' (Tech head)
    console.log('📝 Step 3: Creating special accounts (toanhm) and then 100 department users...\n');

    // Create explicit tech head 'toanhm' outside the 100 staff
    const toanhmUser = {
      id: 3,
      username: 'toanhm',
      password: hashedPassword,
      fullName: 'Trần Quang Toàn',
      gender: 1,
      birthday: randomDateISO(1983, 1990),
      phone: genPhone(3),
      email: 'toanhm@company.com',
      startDate: new Date('2018-06-01'),
      dayOff: null,
      profileFamily: JSON.stringify(generateFamily()),
      chevronId: 3,
      departmentId: 2, // Phòng Công nghệ
      status: 1,
      roleId: 3, // Quản lý
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const toanhmContract = {
      id: 3,
      contractTypeId: 3,
      userId: '3',
      startDate: new Date('2018-06-01'),
      endDate: null,
      activeDay: new Date('2018-06-01'),
      created_at: new Date(),
      updated_at: new Date()
    };
    const toanhmSalary = {
      user_id: '3',
      contract_id: 3,
      base_salary: 25000000,
      created_at: new Date(),
      updated_at: new Date()
    };

    await authDb('users').insert(toanhmUser);
    await employeeDb('contracts').insert(toanhmContract);
    await salaryDb('employee_salary_profiles').insert(toanhmSalary);

    console.log('   ✅ Created special account: toanhm (Trưởng phòng Công nghệ)');

    // Step 4: Create department users
    console.log('📝 Step 4: Creating department users...\n');

    let userId = 4;
    let maleIdx = 0;
    let femaleIdx = 0;
    const allUsers = [];
    const allContracts = [];
    const allSalaries = [];

    for (const dept of DEPARTMENTS) {
      console.log(`   📂 ${dept.name} (${dept.totalUsers} users):`);
      
      // Process each level
      for (const [level, config] of Object.entries(dept.structure)) {
        for (let i = 0; i < config.count; i++) {
          let username, fullName;
          const isFemale = (userId % 2 === 0);
          fullName = isFemale ? FEMALE_NAMES[femaleIdx++ % FEMALE_NAMES.length] : MALE_NAMES[maleIdx++ % MALE_NAMES.length];
          const counter = userId - 3; // offset since ids 2=admin,3=toanhm
          username = `${config.prefix}${String(counter).padStart(3, '0')}`;

          const startYear = config.chevronId <= 5 ? 2019 : 2021;
          const startDate = new Date(`${startYear}-${randInt(1,12).toString().padStart(2,'0')}-01`);
          const femaleFlag = fullName.includes('Thị');

          // Role assignment: prefer explicit config.roleId when set (e.g., finance/hr use 4/5).
          // Otherwise managers/deputies/teamLead => roleId 3 (Leader), others => roleId 2 (Employee)
          const assignedRoleId = config.roleId ? config.roleId : (['manager', 'deputy', 'teamLead'].includes(level) ? 3 : 2);

          const user = {
            id: userId,
            username,
            password: hashedPassword,
            fullName,
            gender: femaleFlag ? 2 : 1,
            birthday: randomDateISO(1985, 1998),
            phone: genPhone(userId),
            email: `${username}@company.com`,
            startDate,
            dayOff: null,
            profileFamily: JSON.stringify(generateFamily()),
            chevronId: config.chevronId,
            departmentId: dept.id,
            status: 1,
            roleId: assignedRoleId,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          allUsers.push(user);

          // Contract
          let contractTypeId = 1;
          if (config.chevronId <= 3) contractTypeId = 3; // Manager/Deputy: Indefinite
          else if (config.chevronId <= 5) contractTypeId = 2; // Team Lead: Fixed term
          else contractTypeId = 1; // Others: Trial

          let endDate = null;
          if (contractTypeId === 2) {
            const end = new Date(startDate);
            end.setFullYear(end.getFullYear() + 2);
            endDate = end;
          }

          const contract = {
            id: userId,
            contractTypeId,
            userId: String(userId),
            startDate,
            endDate,
            activeDay: startDate,
            created_at: new Date(),
            updated_at: new Date()
          };
          allContracts.push(contract);

          // Salary
          const salary = {
            user_id: String(userId),
            contract_id: userId,
            base_salary: config.salary,
            created_at: new Date(),
            updated_at: new Date()
          };
          allSalaries.push(salary);

          userId++;
        }
      }
      console.log(`      ✅ Created ${dept.totalUsers} users`);
    }

    // Step 4: Insert all data
    console.log('\n📝 Step 4: Inserting data...');
    await authDb('users').insert(allUsers);
    console.log(`   ✅ Inserted ${allUsers.length} users`);

    await employeeDb('contracts').insert(allContracts);
    console.log(`   ✅ Inserted ${allContracts.length} contracts`);

    await salaryDb('employee_salary_profiles').insert(allSalaries);
    console.log(`   ✅ Inserted ${allSalaries.length} salary profiles`);

    // Step 5: Reset sequences
    console.log('\n📝 Step 5: Resetting sequences...');
    await authDb.raw("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))");
    await employeeDb.raw("SELECT setval('contracts_id_seq', (SELECT MAX(id) FROM contracts))");
    await salaryDb.raw("SELECT setval('employee_salary_profiles_id_seq', (SELECT MAX(id) FROM employee_salary_profiles))");
    console.log('   ✅ Sequences reset\n');

  // Summary
  const totalUsers = allUsers.length + 2; // +2 for admin and toanhm
    console.log('🎉 ========================================');
    console.log('   SEED COMPLETED SUCCESSFULLY!');
    console.log('========================================');
    console.log('   📊 Summary:');
  console.log(`   - Total Users: ${totalUsers}`);
  console.log(`   - Contracts: ${totalUsers}`);
  console.log(`   - Salary Profiles: ${totalUsers}`);
    console.log('\n   🔐 Role Distribution:');
    console.log(`   - Admin: 1 user`);
  const leaderCount = allUsers.filter(u => u.roleId === 3).length + 1; // +1 for toanhm
  console.log(`   - Leader: ${leaderCount} users (Trưởng phòng, Phó, Team Lead)`);
  console.log(`   - Employee: ${allUsers.filter(u => u.roleId === 2).length} users (scope: personal)`);
  console.log(`   - Accountant: ${allUsers.filter(u => u.roleId === 4).length} users (Tài chính)`);
  console.log(`   - HR: ${allUsers.filter(u => u.roleId === 5).length} users (Nhân sự)`);
    console.log('\n   📝 Key Login Accounts:');
    console.log('   ┌─────────────────┬──────────┬─────────────┬────────────────┐');
    console.log('   │ Username        │ Password │ Role        │ Department     │');
    console.log('   ├─────────────────┼──────────┼─────────────┼────────────────┤');
    console.log('   │ admin           │ 123456@  │ Admin       │ Ban Giám đốc   │');
  console.log('   │ toanhm          │ 123456@  │ Leader      │ Công nghệ      │');
  console.log('   │ tech_mid001     │ 123456@  │ Employee    │ Công nghệ      │');
  console.log('   │ sales_lead001   │ 123456@  │ Leader      │ Kinh doanh     │');
  console.log('   │ fin_lead001     │ 123456@  │ Leader      │ Tài chính      │');
  console.log('   │ hr_lead001      │ 123456@  │ Leader      │ Nhân sự        │');
    console.log('   └─────────────────┴──────────┴─────────────┴────────────────┘');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await authDb.destroy();
    await employeeDb.destroy();
    await salaryDb.destroy();
  }
}
