# Automated HIBP Data Update Options

## Current Implementation: k-Anonymity API Proxy (Phase 2)
**Status**: ✅ Deployed
- Uses HIBP's free k-anonymity API in real-time
- No local storage required
- Always up-to-date (HIBP updates weekly)
- **Cost**: $0 (API is free)
- **Limitation**: Requires external API call for each check (adds latency ~100-300ms)

---

## Problem Statement

You want automated updates of HIBP breach data to potentially:
1. **Reduce latency** - Local lookups vs API calls
2. **Reduce dependency** - Not reliant on HIBP API uptime
3. **Scale better** - No external API rate limits
4. **Save costs** - Reduce Worker CPU time spent on external fetches

---

## Option 1: Hybrid Approach (Recommended)

### Architecture
- **Continue using k-anonymity API** for most users (Tiers 1-4)
- **Add local Bloom Filter** for high-volume tiers (Large Quantum, Super Quantum)

### Implementation
1. **Download HIBP dataset** (~40GB compressed, ~100GB uncompressed)
2. **Build Bloom Filter** (3-5GB optimized for 1B passwords at 1% false positive rate)
3. **Store in Cloudflare R2** (object storage)
4. **Load into Workers** on cold start (or use KV/R2 streaming)
5. **Monthly update job** via Cron Trigger

### Costs (Monthly)
- **R2 Storage**: 5GB × $0.015 = $0.075/month
- **R2 Operations**: ~1 read/day × 30 = 30 × $0.36/1M = negligible
- **Worker Cron**: 1 monthly update job = negligible
- **Total**: ~$0.08/month

### Pros
- ✅ Low latency (<10ms) for premium customers
- ✅ No external API dependency for high-volume users
- ✅ Still use free HIBP API for lower tiers
- ✅ Automatic monthly updates via Cron Trigger
- ✅ Minimal cost increase

### Cons
- ⚠️ More complex implementation
- ⚠️ Bloom Filter has ~1% false positive rate
- ⚠️ Need to maintain update job
- ⚠️ Initial build time ~30-60 minutes

---

## Option 2: Full Local Dataset with D1

### Architecture
1. Download full HIBP dataset (1 billion passwords)
2. Store all SHA-1 hashes in D1 database
3. Query locally for every breach check

### Costs (Monthly)
- **D1 Storage**: 100GB × $0.75/GB = $75/month (😱)
- **D1 Reads**: 1B passwords × 1 read average = 1B × $0.001/1M = $1,000/month (😱😱😱)
- **Total**: ~$1,075/month

### Verdict
❌ **NOT RECOMMENDED** - D1 is optimized for small relational data, not 1 billion row lookups. Would destroy your margins and exceed D1's practical limits.

---

## Option 3: Full Local Dataset with R2 + Binary Search

### Architecture
1. Download HIBP dataset sorted by hash
2. Store as binary file in R2
3. Use binary search to find passwords
4. Cache frequent lookups in KV

### Implementation Steps
1. Download sorted SHA-1 file (40GB compressed)
2. Store in R2
3. Implement binary search in Worker
4. Cache results in KV for repeat queries

### Costs (Monthly)
- **R2 Storage**: 40GB × $0.015 = $0.60/month
- **R2 Reads**: ~100K checks × 1 read = 100K × $0.36/1M = $0.036/month
- **KV Reads**: Cache hits (free within limits)
- **Total**: ~$0.64/month

### Pros
- ✅ Complete dataset locally
- ✅ Binary search is fast (~26 lookups for 1B records)
- ✅ Very cheap
- ✅ No false positives

### Cons
- ⚠️ More complex than API proxy
- ⚠️ Need to handle R2 range requests efficiently
- ⚠️ Manual update process (download new dataset monthly)
- ⚠️ Binary search requires multiple R2 range reads per lookup

---

## Option 4: Cloudflare Cron + Scheduled Updates

### Architecture
1. Use current k-anonymity API (keep it simple)
2. Add Cloudflare Cron Trigger to check for HIBP updates
3. Send notification when new dataset available
4. Optionally: Auto-download and rebuild Bloom Filter

### Implementation
```javascript
// In wrangler.toml
[triggers]
crons = ["0 0 1 * *"] // First day of every month at midnight

// In worker
export default {
  async scheduled(event, env, ctx) {
    // Check HIBP for new dataset
    // If found, trigger rebuild process
    // Send admin notification
  }
}
```

### Costs
- **Cron execution**: Free (within Workers Paid plan)
- **Notification**: Free (email/webhook)
- **Total**: $0/month

### Pros
- ✅ Fully automated
- ✅ No manual intervention
- ✅ Works with any of the above options
- ✅ Free

### Cons
- ⚠️ Still need to decide on storage approach

---

## Option 5: Hybrid Bloom Filter with API Fallback (BEST BALANCE)

### Architecture Flow
```
User requests breach check
    ↓
1. Check local Bloom Filter (3-5GB in R2)
    ↓
    Bloom says "definitely not pwned" → Return safe ✅
    ↓
    Bloom says "maybe pwned" (could be false positive)
        ↓
    2. Fallback to HIBP k-anonymity API for confirmation
        ↓
        API confirms: pwned ⚠️ or safe ✅
```

### Why This Is Best
- **Fast**: 90%+ queries answered by Bloom Filter (<10ms)
- **Accurate**: False positives confirmed via HIBP API
- **Cheap**: Most queries don't hit external API
- **Always current**: HIBP API provides latest data for edge cases
- **Reliable**: If Bloom Filter unavailable, fall back to API

### Implementation Steps
1. **Initial Setup** (one-time):
   - Download HIBP dataset using `haveibeenpwned-downloader`
   - Build Bloom Filter (Python script with `pybloom_live` or Rust)
   - Upload to R2 storage
   - Update Worker to load Bloom Filter on cold start

2. **Monthly Updates** (automated):
   - Cron Trigger downloads new HIBP dataset
   - Rebuilds Bloom Filter
   - Uploads to R2 (versioned)
   - Worker automatically uses new version

3. **Query Flow**:
   ```javascript
   async function checkBreach(passwordHash) {
     // 1. Load Bloom Filter from R2 (cached)
     const bloom = await loadBloomFilter();

     // 2. Quick Bloom check
     if (!bloom.contains(passwordHash)) {
       return { pwned: false, source: 'bloom_filter', confidence: 100 };
     }

     // 3. Bloom says "maybe" - verify with HIBP API
     const hibpResult = await queryHIBP_API(passwordHash);
     return { pwned: hibpResult.pwned, source: 'hibp_api', confidence: 100 };
   }
   ```

### Costs (Monthly)
- **R2 Storage**: 5GB Bloom Filter × $0.015 = $0.075
- **R2 Reads**: Daily cold starts × 30 = ~$0.01
- **HIBP API**: Free (only called for ~10% of queries)
- **Worker CPU**: Slightly higher (Bloom Filter lookups)
- **Total**: ~$0.10/month

### Performance Gains
- **Latency reduction**: 150-250ms → 5-10ms for 90%+ queries
- **API dependency**: 90% reduction in HIBP API calls
- **Scalability**: Can handle 10x more volume without external rate limits

---

## Recommended Implementation Timeline

### Phase 2 (Current): ✅ k-Anonymity API Proxy
- Already deployed
- $0/month cost
- Good enough for launch

### Phase 3 (Q1 2026): Bloom Filter + API Fallback
**Trigger**: When you hit 50K+ breach checks/month
- Build and deploy Bloom Filter
- Keep API fallback
- ~$0.10/month cost increase
- 90%+ latency improvement

### Phase 4 (Q2 2026): Full Automation
**Trigger**: When manually updating becomes annoying
- Add Cron Trigger for monthly updates
- Auto-download HIBP dataset
- Auto-rebuild Bloom Filter
- Zero manual intervention

---

## Technical Resources

### Download Tools
1. **Official .NET Downloader**: https://github.com/HaveIBeenPwned/PwnedPasswordsDownloader
   ```bash
   dotnet tool install --global haveibeenpwned-downloader
   haveibeenpwned-downloader pwnedpasswords
   ```

2. **Python Alternative**: https://pypi.org/project/hibp-downloader/
   ```bash
   pip install hibp-downloader
   hibp-downloader --output pwnedpasswords.txt
   ```

### Bloom Filter Libraries
1. **JavaScript/TypeScript**: `bloom-filters` (npm)
2. **Python**: `pybloom_live` or `bloom-filter2`
3. **Rust**: `probabilistic-collections` (compile to WASM for Workers)

### Dataset Info
- **Size**: ~40GB compressed, ~100GB uncompressed
- **Format**: Plain text, one line per hash
- **Structure**: `HASH:COUNT` (e.g., `000000005AD76BD555C1D6D771DE417A4B87E4B4:10`)
- **Updates**: Weekly (HIBP adds new breaches regularly)
- **Download**: Torrent or direct HTTPS
- **License**: Free for commercial use with attribution

---

## My Recommendation

**Start with Phase 2 (current k-anonymity API)** and monitor:
- Total breach check volume
- Average latency
- HIBP API uptime

**Move to Phase 3 (Bloom Filter hybrid) when**:
- You exceed 50K breach checks/month, OR
- Users complain about latency, OR
- You want to reduce external dependencies

**Estimated trigger point**: 500-1000 paid API customers

**Cost/benefit**: $0.10/month for 90%+ latency improvement and reduced dependency is a no-brainer when volume justifies the engineering time.

---

## Questions to Consider

1. **What's your expected breach check volume in 6 months?**
   - If < 50K/month: Stay with API proxy
   - If > 100K/month: Build Bloom Filter now

2. **How important is sub-10ms latency?**
   - Critical: Build Bloom Filter now
   - Nice-to-have: Wait until Phase 3

3. **Do you want full control over data?**
   - Yes: Build Bloom Filter
   - No: Trust HIBP API (it's rock solid)

4. **How much engineering time can you invest?**
   - Limited: Stick with API proxy (it works great)
   - Available: Build Bloom Filter for better performance

---

**Bottom Line**: The k-anonymity API proxy you have now is excellent for launch. Add Bloom Filter when volume justifies it. The cost is negligible either way (~$0.10/month difference).
