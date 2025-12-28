#!/usr/bin/env node

const https = require('https');

const ACCOUNT_ID = 'ee34e44964865d1bccb86107d578c55a';
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const WORKERS = ['mypasswordchecker', 'mypasswordchecker-api', 'mypasswordchecker-api-production'];

function graphqlQuery(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query, variables });

    const req = https.request({
      hostname: 'api.cloudflare.com',
      path: '/client/v4/graphql',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.errors) {
            reject(new Error(`GraphQL Error: ${JSON.stringify(parsed.errors)}`));
          } else {
            resolve(parsed.data);
          }
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function analyzeMonth(year, month) {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📅 Analyzing: ${monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
  console.log(`${'═'.repeat(60)}\n`);

  let monthTotalDuration = 0;
  let monthTotalRequests = 0;

  for (const worker of WORKERS) {
    const query = `
      query WorkersAnalytics($accountTag: string!, $scriptName: string!, $start: Time!, $end: Time!) {
        viewer {
          accounts(filter: { accountTag: $accountTag }) {
            workersInvocationsAdaptive(
              filter: {
                scriptName: $scriptName
                datetime_geq: $start
                datetime_lt: $end
              }
              limit: 10000
            ) {
              sum {
                requests
                errors
                subrequests
                duration
              }
            }
          }
        }
      }
    `;

    const variables = {
      accountTag: ACCOUNT_ID,
      scriptName: worker,
      start: monthStart.toISOString(),
      end: monthEnd.toISOString()
    };

    try {
      const data = await graphqlQuery(query, variables);
      const invocations = data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive;

      if (invocations && invocations.length > 0) {
        let totalRequests = 0;
        let totalDuration = 0;
        let totalErrors = 0;
        let totalSubrequests = 0;

        invocations.forEach(record => {
          if (record.sum) {
            totalRequests += record.sum.requests || 0;
            totalDuration += record.sum.duration || 0;
            totalErrors += record.sum.errors || 0;
            totalSubrequests += record.sum.subrequests || 0;
          }
        });

        monthTotalDuration += totalDuration;
        monthTotalRequests += totalRequests;

        console.log(`🔍 ${worker}`);
        console.log(`   Requests: ${totalRequests.toLocaleString()}`);
        console.log(`   Duration: ${totalDuration.toLocaleString()}ms`);
        console.log(`   Avg: ${(totalDuration/totalRequests).toFixed(2)}ms/req`);
        console.log(`   Errors: ${totalErrors.toLocaleString()}`);
        console.log(`   Subrequests: ${totalSubrequests.toLocaleString()}\n`);
      }
    } catch (err) {
      console.log(`⚠️  ${worker}: ${err.message}\n`);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`📊 Month Total: ${monthTotalDuration.toLocaleString()}ms from ${monthTotalRequests.toLocaleString()} requests`);
  if (monthTotalDuration > 15000) {
    const overage = monthTotalDuration - 15000;
    console.log(`   ⚠️  OVERAGE: ${overage.toLocaleString()}ms (${((overage/15000)*100).toFixed(1)}% over limit)`);
  } else {
    console.log(`   ✅ Within free tier limit`);
  }

  return { month: `${year}-${String(month).padStart(2, '0')}`, duration: monthTotalDuration, requests: monthTotalRequests };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔬 Historical CPU Analysis - MyPasswordChecker.com');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Account:', ACCOUNT_ID);
  console.log('Period: September 2025 - December 2025');

  const results = [];

  // Analyze September through December 2025
  results.push(await analyzeMonth(2025, 9));   // September
  results.push(await analyzeMonth(2025, 10));  // October
  results.push(await analyzeMonth(2025, 11));  // November
  results.push(await analyzeMonth(2025, 12));  // December (partial)

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📈 TREND ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════\n');

  results.forEach(r => {
    const status = r.duration > 15000 ? '⚠️  OVERAGE' : '✅ OK';
    console.log(`${r.month}: ${r.duration.toLocaleString().padStart(10)}ms  ${status}`);
  });

  console.log('\n✅ Analysis complete!\n');
}

main().catch(console.error);
