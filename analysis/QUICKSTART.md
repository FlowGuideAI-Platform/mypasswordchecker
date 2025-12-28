# Quick Start - CPU Analysis

## Step-by-Step Guide to Run Your First Analysis

### 1. Get Your Cloudflare API Token

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click **"Create Token"**
3. Click **"Create Custom Token"**
4. Set permissions:
   - **Account → Analytics → Read**
   - **Account → Workers Scripts → Read**
5. Set Account to: `ee34e44964865d1bccb86107d578c55a`
6. Click **"Create Token"**
7. **Copy the token** (you won't see it again!)

### 2. Set the Token in Your Terminal

```bash
export CLOUDFLARE_API_TOKEN="paste_your_token_here"
```

### 3. Navigate to the Analysis Directory

```bash
cd "/Users/jack/Projects - Xcode/MyPasswordChecker.com/analysis"
```

### 4. Run the Analysis

```bash
node cpu-analysis.js
```

### 5. Review the Results

The script will:
- Show real-time progress in the terminal
- Generate a report file: `cpu-usage-report.json`
- Display optimization recommendations

## What You'll See

```
═══════════════════════════════════════════════════════════
🔬 MyPasswordChecker.com - CPU Usage Analysis
═══════════════════════════════════════════════════════════

📅 Analysis Period: Last 30 days
🏢 Account ID: ee34e44964865d1bccb86107d578c55a

✅ Found 3 worker(s)

🔍 Analyzing worker: mypasswordchecker
   ✅ Requests: [number]
   ⏱️  Total CPU: [milliseconds]
   📊 Avg CPU/request: [ms]

[Analysis continues for all workers...]

📊 SUMMARY
Total CPU Usage: [total]ms
30-Day Projection: [projection]ms
⚠️  OVERAGE: [overage]ms

💡 OPTIMIZATION RECOMMENDATIONS:
1. [Specific recommendations based on your data]
2. [More recommendations...]
```

## Next Step

Once you have the analysis results, we can proceed to **Phase 0B** where we'll:
1. Review the specific bottlenecks
2. Identify which worker is using the most CPU
3. Plan targeted optimizations

## Need Help?

### Common Issues

**"API token required"**
- Make sure you ran: `export CLOUDFLARE_API_TOKEN="your_token"`
- Check it's set: `echo $CLOUDFLARE_API_TOKEN`

**"Authentication error"**
- Verify your token has Analytics:Read permission
- Make sure you're using the correct account

**"No data available"**
- Your workers might not have recent activity
- The analysis looks at the last 30 days

## Ready for the Analysis?

Just run:
```bash
node cpu-analysis.js
```

And let me know what you find! 🚀
