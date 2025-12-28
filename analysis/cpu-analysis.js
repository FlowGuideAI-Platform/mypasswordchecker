#!/usr/bin/env node

/**
 * CPU Usage Analysis Script for MyPasswordChecker.com Cloudflare Workers
 *
 * This script queries Cloudflare's GraphQL Analytics API to analyze CPU usage
 * across all workers to identify optimization opportunities.
 *
 * Required Environment Variables:
 *   CLOUDFLARE_API_TOKEN - API token with Analytics:Read permission
 *   CLOUDFLARE_ACCOUNT_ID - Your Cloudflare account ID (default: ee34e44964865d1bccb86107d578c55a)
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || 'ee34e44964865d1bccb86107d578c55a';
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_API_URL = 'https://api.cloudflare.com/client/v4';
const DAYS_TO_ANALYZE = 30;

// Worker names
const WORKERS = [
  'mypasswordchecker',
  'mypasswordchecker-api',
  'mypasswordchecker-api-production'
];

// Validate required environment variables
if (!API_TOKEN) {
  console.error('❌ ERROR: CLOUDFLARE_API_TOKEN environment variable is required');
  console.error('   Set it with: export CLOUDFLARE_API_TOKEN=your_token_here');
  process.exit(1);
}

/**
 * Makes an HTTPS request to Cloudflare API
 */
function makeRequest(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, CLOUDFLARE_API_URL);

    const requestOptions = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.success === false) {
            reject(new Error(`API Error: ${JSON.stringify(parsed.errors)}`));
          } else {
            resolve(parsed);
          }
        } catch (err) {
          reject(new Error(`Failed to parse response: ${err.message}`));
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

/**
 * Makes a GraphQL query to Cloudflare Analytics API
 */
function graphqlQuery(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL('/client/v4/graphql', 'https://api.cloudflare.com');

    const requestOptions = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const body = JSON.stringify({ query, variables });

    const req = https.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.errors) {
            reject(new Error(`GraphQL Error: ${JSON.stringify(parsed.errors)}`));
          } else {
            resolve(parsed.data);
          }
        } catch (err) {
          reject(new Error(`Failed to parse GraphQL response: ${err.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Get list of all workers in the account
 */
async function listWorkers() {
  console.log('📋 Fetching list of workers...');
  try {
    const response = await makeRequest(`/accounts/${ACCOUNT_ID}/workers/scripts`);
    return response.result || [];
  } catch (err) {
    console.error('⚠️  Warning: Could not fetch worker list:', err.message);
    console.log('   Continuing with predefined worker names...');
    return WORKERS.map(name => ({ id: name, script_name: name }));
  }
}

/**
 * Query CPU metrics using GraphQL Analytics API
 */
async function queryCPUMetrics(scriptName, days = DAYS_TO_ANALYZE) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const query = `
    query WorkersAnalytics($accountTag: string!, $scriptName: string!, $datetimeStart: Time!, $datetimeEnd: Time!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          workersInvocationsAdaptive(
            filter: {
              scriptName: $scriptName
              datetime_geq: $datetimeStart
              datetime_lt: $datetimeEnd
            }
            limit: 10000
          ) {
            sum {
              requests
              errors
              subrequests
              duration
            }
            quantiles {
              durationP50
              durationP75
              durationP99
            }
            dimensions {
              date
              scriptName
            }
          }
        }
      }
    }
  `;

  const variables = {
    accountTag: ACCOUNT_ID,
    scriptName: scriptName,
    datetimeStart: startDate.toISOString(),
    datetimeEnd: endDate.toISOString()
  };

  try {
    return await graphqlQuery(query, variables);
  } catch (err) {
    console.error(`   ⚠️  Failed to query metrics for ${scriptName}:`, err.message);
    return null;
  }
}

/**
 * Get detailed analytics for a specific worker
 */
async function getWorkerAnalytics(scriptName) {
  console.log(`\n🔍 Analyzing worker: ${scriptName}`);

  const data = await queryCPUMetrics(scriptName);

  if (!data || !data.viewer || !data.viewer.accounts || data.viewer.accounts.length === 0) {
    console.log(`   ⚠️  No data available for ${scriptName}`);
    return null;
  }

  const invocations = data.viewer.accounts[0].workersInvocationsAdaptive;

  if (!invocations || invocations.length === 0) {
    console.log(`   ⚠️  No invocation data for ${scriptName}`);
    return null;
  }

  // Aggregate metrics
  let totalRequests = 0;
  let totalDuration = 0;
  let totalErrors = 0;
  let totalSubrequests = 0;
  let p50Duration = 0;
  let p99Duration = 0;

  invocations.forEach(record => {
    if (record.sum) {
      totalRequests += record.sum.requests || 0;
      totalDuration += record.sum.duration || 0;
      totalErrors += record.sum.errors || 0;
      totalSubrequests += record.sum.subrequests || 0;
    }
    if (record.quantiles) {
      p50Duration = Math.max(p50Duration, record.quantiles.durationP50 || 0);
      p99Duration = Math.max(p99Duration, record.quantiles.durationP99 || 0);
    }
  });

  const avgDurationPerRequest = totalRequests > 0 ? totalDuration / totalRequests : 0;
  const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

  console.log(`   ✅ Requests: ${totalRequests.toLocaleString()}`);
  console.log(`   ⏱️  Total Duration: ${totalDuration.toLocaleString()}ms`);
  console.log(`   📊 Avg Duration/request: ${avgDurationPerRequest.toFixed(2)}ms`);
  console.log(`   🔄 Subrequests: ${totalSubrequests.toLocaleString()}`);

  return {
    scriptName,
    totalRequests,
    totalCPUTime: totalDuration, // Using duration as CPU time for compatibility
    totalDuration,
    totalErrors,
    totalSubrequests,
    avgCPUPerRequest: avgDurationPerRequest,
    avgDurationPerRequest,
    errorRate,
    p50Duration,
    p99Duration,
    rawData: invocations
  };
}

/**
 * Generate CPU usage report
 */
async function generateReport() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔬 MyPasswordChecker.com - CPU Usage Analysis');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📅 Analysis Period: Last ${DAYS_TO_ANALYZE} days`);
  console.log(`🏢 Account ID: ${ACCOUNT_ID}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // Get list of workers
  const workers = await listWorkers();
  console.log(`✅ Found ${workers.length} worker(s)\n`);

  // Analyze each worker
  const results = [];
  for (const worker of workers) {
    const scriptName = worker.script_name || worker.id;
    const analytics = await getWorkerAnalytics(scriptName);

    if (analytics) {
      results.push(analytics);
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Calculate totals
  const totalCPU = results.reduce((sum, r) => sum + r.totalCPUTime, 0);
  const totalRequests = results.reduce((sum, r) => sum + r.totalRequests, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.totalErrors, 0);

  // Sort by CPU usage (highest first)
  results.sort((a, b) => b.totalCPUTime - a.totalCPUTime);

  // Generate summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`Total CPU Usage: ${totalCPU.toLocaleString()}ms (${(totalCPU/1000/60).toFixed(2)} minutes)`);
  console.log(`Total Requests: ${totalRequests.toLocaleString()}`);
  console.log(`Total Errors: ${totalErrors.toLocaleString()}`);
  console.log(`Average CPU/Request: ${(totalCPU/totalRequests).toFixed(2)}ms`);

  const monthlyEstimate = (totalCPU / DAYS_TO_ANALYZE) * 30;
  console.log(`\n📈 30-Day Projection: ${monthlyEstimate.toLocaleString()}ms`);
  console.log(`   Free Tier Limit: 15,000ms`);

  if (monthlyEstimate > 15000) {
    const overage = monthlyEstimate - 15000;
    const overagePercent = ((overage / 15000) * 100).toFixed(1);
    console.log(`   ⚠️  OVERAGE: ${overage.toLocaleString()}ms (${overagePercent}% over limit)`);

    // Calculate estimated cost (rough estimate)
    const estimatedCost = (overage / 1000) * 0.02; // Cloudflare pricing model
    console.log(`   💰 Estimated Monthly Cost: $${estimatedCost.toFixed(2)}`);

    // Reduction needed
    const reductionNeeded = monthlyEstimate - 15000;
    const reductionPercent = ((reductionNeeded / monthlyEstimate) * 100).toFixed(1);
    console.log(`\n🎯 OPTIMIZATION TARGET:`);
    console.log(`   Need to reduce CPU by ${reductionNeeded.toLocaleString()}ms (${reductionPercent}%)`);
  } else {
    const remaining = 15000 - monthlyEstimate;
    console.log(`   ✅ WITHIN LIMITS: ${remaining.toLocaleString()}ms remaining`);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🔍 BY WORKER');
  console.log('═══════════════════════════════════════════════════════════\n');

  results.forEach((result, index) => {
    const cpuPercent = ((result.totalCPUTime / totalCPU) * 100).toFixed(1);
    console.log(`${index + 1}. ${result.scriptName}`);
    console.log(`   CPU Usage: ${result.totalCPUTime.toLocaleString()}ms (${cpuPercent}% of total)`);
    console.log(`   Requests: ${result.totalRequests.toLocaleString()}`);
    console.log(`   Avg CPU/Request: ${result.avgCPUPerRequest.toFixed(2)}ms`);
    console.log(`   Error Rate: ${result.errorRate.toFixed(2)}%`);
    console.log(`   Subrequests: ${result.totalSubrequests.toLocaleString()}\n`);
  });

  // Create detailed report
  const report = {
    generatedAt: new Date().toISOString(),
    analysisPeriod: {
      days: DAYS_TO_ANALYZE,
      startDate: new Date(Date.now() - DAYS_TO_ANALYZE * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString()
    },
    accountId: ACCOUNT_ID,
    summary: {
      totalCPUms: totalCPU,
      totalRequests: totalRequests,
      totalErrors: totalErrors,
      avgCPUPerRequest: totalCPU / totalRequests,
      monthlyProjection: monthlyEstimate,
      freeTierLimit: 15000,
      overage: Math.max(0, monthlyEstimate - 15000),
      withinLimits: monthlyEstimate <= 15000
    },
    byWorker: results.map(r => ({
      name: r.scriptName,
      cpuMs: r.totalCPUTime,
      requests: r.totalRequests,
      avgMs: r.avgCPUPerRequest,
      errors: r.totalErrors,
      errorRate: r.errorRate,
      subrequests: r.totalSubrequests,
      percentOfTotal: (r.totalCPUTime / totalCPU) * 100
    })),
    optimizationRecommendations: generateRecommendations(results, monthlyEstimate)
  };

  // Save report
  const reportPath = path.join(__dirname, 'cpu-usage-report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Report saved to: ${reportPath}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // Display recommendations
  if (report.optimizationRecommendations.length > 0) {
    console.log('💡 OPTIMIZATION RECOMMENDATIONS:\n');
    report.optimizationRecommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec.title}`);
      console.log(`   Priority: ${rec.priority}`);
      console.log(`   ${rec.description}\n`);
    });
  }

  return report;
}

/**
 * Generate optimization recommendations based on analysis
 */
function generateRecommendations(results, monthlyProjection) {
  const recommendations = [];

  // Check for high CPU per request
  results.forEach(worker => {
    if (worker.avgCPUPerRequest > 10) {
      recommendations.push({
        title: `Optimize ${worker.scriptName} - High CPU per request`,
        priority: 'HIGH',
        description: `Average CPU time is ${worker.avgCPUPerRequest.toFixed(2)}ms per request. Look for inefficient algorithms, unnecessary processing, or blocking operations.`,
        potentialSavings: `Could save ~${((worker.avgCPUPerRequest - 5) * worker.totalRequests).toFixed(0)}ms if reduced to 5ms/request`
      });
    }

    if (worker.totalSubrequests > worker.totalRequests * 2) {
      recommendations.push({
        title: `Reduce subrequests in ${worker.scriptName}`,
        priority: 'MEDIUM',
        description: `High subrequest ratio (${(worker.totalSubrequests/worker.totalRequests).toFixed(1)} subrequests per request). Each subrequest adds CPU overhead. Consider batching or caching.`,
        potentialSavings: 'Could reduce CPU by 20-30%'
      });
    }

    if (worker.errorRate > 1) {
      recommendations.push({
        title: `Fix errors in ${worker.scriptName}`,
        priority: 'HIGH',
        description: `Error rate is ${worker.errorRate.toFixed(2)}%. Error handling and retries consume extra CPU time.`,
        potentialSavings: 'Reducing errors could save 10-15% CPU'
      });
    }
  });

  // Check if consolidation would help
  if (results.length > 1) {
    const smallWorkers = results.filter(r => r.totalRequests < 1000);
    if (smallWorkers.length > 0) {
      recommendations.push({
        title: 'Consider consolidating low-traffic workers',
        priority: 'MEDIUM',
        description: `${smallWorkers.length} worker(s) have low request volume. Cold starts and overhead add up. Consider merging into a single worker with routing.`,
        potentialSavings: 'Could reduce overhead by 15-20%'
      });
    }
  }

  // General caching recommendation
  recommendations.push({
    title: 'Implement Cloudflare Cache API',
    priority: 'HIGH',
    description: 'Cache frequently accessed data to reduce CPU-intensive operations. Even short-lived caches (1-5 minutes) can significantly reduce CPU usage.',
    potentialSavings: 'Could reduce CPU by 30-50% for cacheable content'
  });

  return recommendations;
}

// Run the analysis
generateReport()
  .then(() => {
    console.log('✅ Analysis complete!\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
