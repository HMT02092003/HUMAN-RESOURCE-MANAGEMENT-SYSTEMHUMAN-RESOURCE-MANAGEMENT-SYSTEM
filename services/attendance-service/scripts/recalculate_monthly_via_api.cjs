#!/usr/bin/env node
/**
 * Recalculate monthly attendance by calling the attendance API per user/month.
 *
 * This file is CommonJS (.cjs) so it runs under projects with "type": "module" in package.json.
 */

const path = require('path');
const fs = require('fs');

// Simple arg parser
const argv = require('minimist')(process.argv.slice(2));
const MONTH = argv.month || process.env.MONTH;
const API_GATEWAY_URL = argv.apiUrl || process.env.API_GATEWAY_URL || `http://localhost:${process.env.API_GATEWAY_PORT || 4000}`;
const API_ENDPOINT = argv.endpoint || process.env.API_ENDPOINT || '/api/attendance/recalculate-month';
const AUTH_TOKEN = argv.auth || process.env.AUTH_TOKEN || process.env.AUTH;
const LIMIT = argv.limit ? parseInt(argv.limit, 10) : (process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : null);

if (!MONTH) {
  console.error('Error: MONTH is required (format YYYY-MM). Pass --month=YYYY-MM or set MONTH env var.');
  process.exit(1);
}

const knexfilePath = path.resolve(__dirname, '..', 'knexfile.js');
if (!fs.existsSync(knexfilePath)) {
  console.error('Cannot find knexfile at', knexfilePath);
  process.exit(2);
}

const knexfile = require(knexfilePath);
const Knex = require('knex');
const knex = Knex(knexfile.development || knexfile[process.env.NODE_ENV || 'development']);

const { URL } = require('url');

const postJson = (urlString, body, headers = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlString);
      const data = JSON.stringify(body);
      const opts = {
        method: 'POST',
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + (url.search || ''),
        headers: Object.assign({
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }, headers),
      };
      const lib = url.protocol === 'https:' ? require('https') : require('http');
      const req = lib.request(opts, (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => raw += chunk);
        res.on('end', () => {
          let parsed = null;
          try { parsed = JSON.parse(raw); } catch (e) { parsed = raw; }
          resolve({ status: res.statusCode, body: parsed });
        });
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
};

const [yearStr, monthStr] = MONTH.split('-');
const year = parseInt(yearStr, 10);
const month = parseInt(monthStr, 10);
if (!year || !month || month < 1 || month > 12) {
  console.error('Invalid MONTH format. Expect YYYY-MM');
  process.exit(3);
}
const firstDay = new Date(year, month - 1, 1);
const lastDay = new Date(year, month, 0);
const firstDate = firstDay.toISOString().slice(0,10);
const lastDate = lastDay.toISOString().slice(0,10);

const targetUrl = (base, endpoint) => {
  const cleanBase = base.replace(/\\/g, '');
  const cleanEndpoint = endpoint.replace(/^\//, '');
  return (cleanBase.replace(/\/$/, '') + '/' + cleanEndpoint).replace(/\\/g, '');
};

async function main() {
  console.log('Recalculate monthly via API for month:', MONTH);

  let rows = [];
  try {
    rows = await knex('monthly_attendances')
      .select('userId', 'month')
      .where('month', MONTH)
      .orderBy('userId', 'asc');
  } catch (err) {
    console.error('Error querying monthly_attendances:', err.message || err);
    await knex.destroy();
    process.exit(4);
  }

  if (!rows || rows.length === 0) {
    console.log('No monthly_attendances rows found for', MONTH, '\nFalling back to distinct userIds from time_attendances for the month', firstDate, '->', lastDate);
    try {
      const distinct = await knex('time_attendances')
        .distinct('userId')
        .whereRaw("date >= ? AND date <= ?", [firstDate, lastDate])
        .orderBy('userId', 'asc');
      rows = distinct.map(r => ({ userId: r.userId, month: MONTH }));
    } catch (err) {
      console.error('Error querying time_attendances fallback:', err.message || err);
      await knex.destroy();
      process.exit(5);
    }
  }

  console.log('Found', rows.length, 'records to process. limit:', LIMIT || 'none');

  const url = targetUrl(API_GATEWAY_URL, API_ENDPOINT);
  console.log('Will POST to:', url);

  const authHeader = AUTH_TOKEN ? { Authorization: AUTH_TOKEN } : {};

  let processed = 0;
  let success = 0;
  let failed = 0;
  const failures = [];

  for (const r of rows) {
    if (LIMIT && processed >= LIMIT) break;
    processed++;
    const payload = { userId: r.userId, month: MONTH };
    process.stdout.write(`Processing ${processed}/${rows.length} userId=${r.userId} ... `);
    try {
      const res = await postJson(url, payload, authHeader);
      if (res.status >= 200 && res.status < 300) {
        success++;
        console.log('OK', res.status);
      } else {
        failed++;
        failures.push({ userId: r.userId, status: res.status, body: res.body });
        console.log('FAIL', res.status, typeof res.body === 'object' ? JSON.stringify(res.body) : String(res.body).slice(0,120));
      }
    } catch (err) {
      failed++;
      failures.push({ userId: r.userId, error: err.message || err });
      console.log('ERR', err.message || err);
    }
  }

  console.log('\nSummary: processed=', processed, 'success=', success, 'failed=', failed);
  if (failures.length) {
    console.log('Failures details (first 10):', JSON.stringify(failures.slice(0,10), null, 2));
  }

  await knex.destroy();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  try { await knex.destroy(); } catch (_) {}
  process.exit(99);
});
