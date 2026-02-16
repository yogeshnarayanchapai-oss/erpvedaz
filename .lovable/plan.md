

# Cloud Balance Optimization Plan

## Current Situation
Tapai ko ERP Vedaz project le $24.23 Cloud balance kharcha gareko xa. Yo mainly **backend functions** (edge functions) ko execution time bata aako ho. AI usage ta $0.00 dekhaaudai xa, so sabai cost edge function run huda lageko ho.

## Main Cost Drivers (Kharcha Kaha Bata Aako Xa)

### 1. Scheduled Backup (Sabai Bhanda Thulo Cost)
- Yo function le **sabai stores** ko **sabai tables** backup garxa, each table ma 50,000 rows samma query garxa
- Har ek store ko lagi ~20+ lookup tables load garxa data enrich garna
- Google Drive ma upload garxa
- Yesle ekdam lamo time run hunxa = high cost

### 2. AI Functions Auto-Fetching
- `ai-stock-reorder` ra `ai-insights` le `useQuery` use gareko xa -- page visit garda automatic call hunxa
- `staleTime: 5 min` matrai xa, so 5 min paxi feri call hunxa
- Yo AI function le pahila dherai database queries garxa, ani AI gateway call garxa

### 3. Frequent Polling (Every Minute)
- Notifications: `refetchInterval: 60000` (har minute query)
- Dashboard Quick Stats: `refetchInterval: 60000` (har minute query)
- Performance Notifications: `refetchInterval: 5 * 60 * 1000` (har 5 min)

### 4. Cron-Triggered Functions
- `mark-absent-employees`, `backfill-absent-records`, `create-saturday-records` -- yo haru scheduled cron bata call hunxa

---

## Optimization Plan (Kasari Kam Garne)

### Step 1: Backup Function Optimize Garne
- Backup frequency ghataune (daily instead of more frequent)
- Only changed data backup garne (incremental backup) ya backup size limit garne
- Lookup map enrichment optional banaaune (needed ta garni, nabhaye skip)

### Step 2: AI Functions Lazy Load Garne
- `useAiStockReorder` ra `useAiInsights` lai **auto-fetch** bata **manual trigger** (button click) ma change garne
- `useQuery` ko satta `useMutation` use garne, jasle user le button click garema matra call garxa
- `staleTime` badhaune: 5 min -> 30 min or more

### Step 3: Polling Frequency Reduce Garne
- Notifications `refetchInterval`: 60 sec -> 5 min (300000ms)
- Dashboard Quick Stats `refetchInterval`: 60 sec -> 5 min
- Supabase Realtime use garne polling ko satta (notifications table ma)

### Step 4: Cron Functions Review Garne
- `mark-absent-employees` lai dinko 1 choti matra run garne (evening 6pm)
- `backfill-absent-records` lai weekly matra run garne
- `create-saturday-records` lai weekly Friday evening matra

---

## Technical Details

### AI Hooks Change (useQuery -> useMutation + manual trigger)

**Before (auto-fetches, costs money on every page visit):**
```typescript
// useAiStockReorder.ts - uses useQuery (auto-fetch)
export function useAiStockReorder({ storeId }) {
  return useQuery({
    queryKey: ['ai-stock-reorder', storeId],
    queryFn: async () => { /* calls edge function */ },
    enabled: !!storeId,  // auto-calls when storeId exists
    staleTime: 5 * 60 * 1000,
  });
}
```

**After (manual trigger only, saves money):**
```typescript
// useAiStockReorder.ts - uses useMutation (manual only)
export function useAiStockReorder() {
  return useMutation({
    mutationFn: async ({ storeId, warehouseId, lookbackDays }) => {
      /* calls edge function */
    },
  });
}
// UI: Button click -> mutate({ storeId, ... })
```

### Polling Reduction
```typescript
// Before
refetchInterval: 60000  // every 1 minute

// After  
refetchInterval: 300000  // every 5 minutes
```

### Backup Optimization
- Add a check: if last backup was less than 24 hours ago, skip
- Remove lookup map enrichment (saves ~20 database queries per backup)
- Limit table query to 10,000 rows instead of 50,000

---

## Expected Savings

| Area | Current Cost Pattern | After Optimization | Estimated Saving |
|------|---------------------|-------------------|-----------------|
| Backup | Heavy, possibly multiple times/day | Once daily, lighter queries | ~40-50% |
| AI Auto-fetch | Every page visit + 5 min refetch | Manual button click only | ~60-70% |
| Polling | Every 1 minute | Every 5 minutes | ~80% |
| Cron functions | Possibly too frequent | Optimized schedule | ~30% |

Overall estimated saving: **50-70% reduction** in Cloud usage.

## Important Note
System bigrinna pardaina -- sabai features eutai kaam garxa, bas unnecessary automatic calls hataune ho. User le chaaheko bela manual button click garera nai AI analysis ra backup garna sakinxa.
