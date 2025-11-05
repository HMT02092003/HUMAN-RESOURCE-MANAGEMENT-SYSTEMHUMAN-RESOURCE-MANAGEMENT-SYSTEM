/**
 * Verify employee-service database structure
 */

const knex = require('knex');
require('dotenv').config();

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_DATABASE } = process.env;

const db = knex({
  client: 'pg',
  connection: {
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_DATABASE,
    port: DB_PORT || 5432
  }
});

async function verifyData() {
  try {
    console.log('\n=== Verifying Employee Service Database ===\n');

    // Check departments
    const departments = await db('departments').select('*').orderBy('id');
    console.log('📋 Departments:');
    console.log('┌────┬────────────────────┬──────────────────────────────────────────────────┐');
    console.log('│ ID │ Name               │ Description                                      │');
    console.log('├────┼────────────────────┼──────────────────────────────────────────────────┤');
    departments.forEach(d => {
      const id = String(d.id).padEnd(2);
      const name = String(d.name).padEnd(18).slice(0, 18);
      const desc = String(d.description).padEnd(48).slice(0, 48);
      console.log(`│ ${id} │ ${name} │ ${desc} │`);
    });
    console.log('└────┴────────────────────┴──────────────────────────────────────────────────┘');

    // Check chevrons
    const chevrons = await db('chevrons').select('*').orderBy('id');
    console.log('\n📊 Chevrons (Positions):');
    console.log('┌────┬─────────────────────┬─────────────┬──────────────────────────────────────┐');
    console.log('│ ID │ Name                │ Coefficient │ Description                          │');
    console.log('├────┼─────────────────────┼─────────────┼──────────────────────────────────────┤');
    chevrons.forEach(c => {
      const id = String(c.id).padEnd(2);
      const name = String(c.name).padEnd(19).slice(0, 19);
      const coef = String(c.chevronCoefficient || '-').padEnd(11);
      const desc = String(c.description).padEnd(36).slice(0, 36);
      console.log(`│ ${id} │ ${name} │ ${coef} │ ${desc} │`);
    });
    console.log('└────┴─────────────────────┴─────────────┴──────────────────────────────────────┘');

    // Check contract types
    const contractTypes = await db('contract_types').select('*').orderBy('id');
    console.log('\n📄 Contract Types:');
    contractTypes.forEach(ct => {
      console.log(`   ${ct.id}. ${ct.name} (${ct.duration || 'Không xác định thời hạn'})`);
    });

    // Check contracts statistics
    const contracts = await db('contracts').select('*');
    const contractStats = {};
    contracts.forEach(c => {
      contractStats[c.contractTypeId] = (contractStats[c.contractTypeId] || 0) + 1;
    });
    
    console.log('\n📈 Contract Statistics:');
    console.log(`   Total contracts: ${contracts.length}`);
    Object.keys(contractStats).forEach(typeId => {
      const type = contractTypes.find(ct => ct.id === Number(typeId));
      console.log(`   - ${type?.name}: ${contractStats[typeId]} contracts`);
    });

    console.log('\n✅ Employee service verification complete!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.destroy();
  }
}

verifyData();
