# Unified Lead Assignment Counting via lead_transfers.transferred_at

## Core Logic
All lead assignment counts across dashboards use `lead_transfers.transferred_at` as single source of truth.

## Counting Rule
```
Staff Lead Count = COUNT(DISTINCT lead_id) FROM lead_transfers 
                   WHERE to_user_id = staff_id 
                   AND DATE(transferred_at) BETWEEN dateFrom AND dateTo
                   AND store_id = current_store
```

## Reassignment Chain Example
Lead X: Ganesh (12/11) → Bijita (12/12) → Ram (12/13)
- Ganesh counts on 12/11 (his transferred_at)
- Bijita counts on 12/12 (her transferred_at)  
- Ram counts on 12/13 (his transferred_at)
- Historical counts NEVER decrease

## Hook: useLeadAssignmentCounts
- `excludeSelfCreated: false` → Calling Dashboard, Staff Leaderboard (include all)
- `excludeSelfCreated: true` → Admin Staff Transfer Summary (exclude self-created)

## Same-Day Reassignment Constraint
Leads with `lead.date === today` cannot be reassigned until the next day.

## Database Changes
- Added `store_id` column to `lead_transfers` table
- Created trigger `record_initial_lead_transfer` to auto-record initial assignments
- All transfer inserts now include `store_id`
