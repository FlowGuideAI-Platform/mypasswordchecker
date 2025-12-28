# MyPasswordChecker.com - CPU Usage Analysis Tool

This tool analyzes CPU usage across your Cloudflare Workers to identify optimization opportunities and reduce your monthly overage charges.

## Current Situation

- **Monthly CPU Usage**: 27,327ms (182% over free tier)
- **Free Tier Limit**: 15,000ms
- **Overage**: 12,327ms
- **Monthly Cost**: ~$140
- **Account ID**: ee34e44964865d1bccb86107d578c55a

## Goal

Reduce CPU usage by 45% to stay within the free tier and eliminate the $140/month charge.

## Prerequisites

1. **Node.js** - Version 14 or higher
2. **Cloudflare API Token** - With Analytics:Read permission

## Getting Your Cloudflare API Token

### Step 1: Login to Cloudflare
Visit: https://dash.cloudflare.com/login

**IMPORTANT**: Use the correct account login URL based on your account ID:
- **OLD Account** (ee34e44964865d1bccb86107d578c55a): Use your regular Cloudflare login

### Step 2: Create an API Token

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Click "Get started" next to "Create Custom Token"
4. Configure the token:
   - **Token name**: `MyPasswordChecker CPU Analysis`
   - **Permissions**:
     - Account → Analytics → Read
     - Account → Workers Scripts → Read
   - **Account Resources**: Include → Your account (ee34e44964865d1bccb86107d578c55a)
   - **Zone Resources**: Not needed (leave as "All zones")
5. Click "Continue to summary"
6. Click "Create Token"
7. **COPY THE TOKEN** - You won't be able to see it again!

### Step 3: Test Your Token (Optional)

```bash
curl -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Installation

No installation needed! The script uses only Node.js built-in modules.

```bash
cd "/Users/jack/Projects - Xcode/MyPasswordChecker.com/analysis"
```

## Usage

### Set Your API Token

```bash
export CLOUDFLARE_API_TOKEN="your_token_here"
```

To make it permanent (add to your `~/.zshrc` or `~/.bashrc`):
```bash
echo 'export CLOUDFLARE_API_TOKEN="your_token_here"' >> ~/.zshrc
source ~/.zshrc
```

### Run the Analysis

```bash
npm run analyze
```

Or directly:
```bash
node cpu-analysis.js
```

### Analyze a Different Time Period

By default, the script analyzes the last 30 days. To change this, edit the `DAYS_TO_ANALYZE` constant in `cpu-analysis.js`.

## Output

The script will:

1. **Display real-time progress** in the terminal
2. **Generate a detailed JSON report**: `cpu-usage-report.json`
3. **Show optimization recommendations** based on the data

### Terminal Output Example

```
═══════════════════════════════════════════════════════════
🔬 MyPasswordChecker.com - CPU Usage Analysis
═══════════════════════════════════════════════════════════
📅 Analysis Period: Last 30 days
🏢 Account ID: ee34e44964865d1bccb86107d578c55a
═══════════════════════════════════════════════════════════

📋 Fetching list of workers...
✅ Found 3 worker(s)

🔍 Analyzing worker: mypasswordchecker
   ✅ Requests: 12,345
   ⏱️  Total CPU: 8,234ms
   📊 Avg CPU/request: 0.67ms
   🔄 Subrequests: 1,234

[... more workers ...]

═══════════════════════════════════════════════════════════
📊 SUMMARY
═══════════════════════════════════════════════════════════

Total CPU Usage: 27,327ms (0.46 minutes)
Total Requests: 45,678
Average CPU/Request: 0.60ms

📈 30-Day Projection: 27,327ms
   Free Tier Limit: 15,000ms
   ⚠️  OVERAGE: 12,327ms (82.2% over limit)
   💰 Estimated Monthly Cost: $140.00

🎯 OPTIMIZATION TARGET:
   Need to reduce CPU by 12,327ms (45.1%)

═══════════════════════════════════════════════════════════
🔍 BY WORKER
═══════════════════════════════════════════════════════════

1. mypasswordchecker-api-production
   CPU Usage: 15,234ms (55.8% of total)
   Requests: 23,456
   Avg CPU/Request: 0.65ms
   Error Rate: 0.12%
   Subrequests: 45,678

[... more workers ...]
```

### JSON Report Structure

The `cpu-usage-report.json` file contains:

```json
{
  "generatedAt": "2025-12-26T...",
  "analysisPeriod": {
    "days": 30,
    "startDate": "...",
    "endDate": "..."
  },
  "accountId": "ee34e44964865d1bccb86107d578c55a",
  "summary": {
    "totalCPUms": 27327,
    "totalRequests": 45678,
    "avgCPUPerRequest": 0.598,
    "monthlyProjection": 27327,
    "overage": 12327,
    "withinLimits": false
  },
  "byWorker": [
    {
      "name": "mypasswordchecker-api-production",
      "cpuMs": 15234,
      "requests": 23456,
      "avgMs": 0.65,
      "percentOfTotal": 55.8
    }
  ],
  "optimizationRecommendations": [
    {
      "title": "Implement Cloudflare Cache API",
      "priority": "HIGH",
      "description": "Cache frequently accessed data...",
      "potentialSavings": "Could reduce CPU by 30-50%"
    }
  ]
}
```

## What to Look For

### 1. High CPU per Request
- **Target**: <5ms per request
- **If higher**: Look for inefficient algorithms, unnecessary processing

### 2. High Subrequest Ratio
- **Target**: <2 subrequests per request
- **If higher**: Consider batching API calls or caching

### 3. Error Rate
- **Target**: <1%
- **If higher**: Errors consume CPU through retries and error handling

### 4. Uneven Distribution
- If one worker uses 80%+ of CPU, focus optimization efforts there

## Next Steps

After running the analysis:

1. **Review the report** - Identify which worker uses the most CPU
2. **Check the recommendations** - Follow the prioritized optimization suggestions
3. **Examine worker code** - Look for:
   - Database queries that could be cached
   - API calls that could be batched
   - Expensive computations that could be simplified
   - Unnecessary JSON parsing/stringifying
4. **Implement optimizations** - Start with highest-priority items
5. **Re-run analysis** - Verify improvements

## Troubleshooting

### Error: "CLOUDFLARE_API_TOKEN environment variable is required"
- Make sure you've set the token: `export CLOUDFLARE_API_TOKEN="your_token"`
- Verify it's set: `echo $CLOUDFLARE_API_TOKEN`

### Error: "API Error: Authentication error"
- Your token might be invalid or expired
- Create a new token following the steps above
- Ensure the token has Analytics:Read permission

### Error: "No data available for worker"
- The worker might not have received requests in the analysis period
- Try increasing `DAYS_TO_ANALYZE` in the script
- Verify the worker name is correct

### GraphQL Errors
- Cloudflare's GraphQL API might have changed
- Check Cloudflare's documentation: https://developers.cloudflare.com/analytics/graphql-api/

## Additional Resources

- [Cloudflare Workers Analytics](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)
- [Cloudflare GraphQL Analytics API](https://developers.cloudflare.com/analytics/graphql-api/)
- [Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/)

## Support

If you encounter issues:
1. Check the error message carefully
2. Verify your API token has the correct permissions
3. Ensure you're using the correct account ID
4. Check Cloudflare's status page: https://www.cloudflarestatus.com/
