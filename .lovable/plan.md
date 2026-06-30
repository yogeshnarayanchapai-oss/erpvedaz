# Daily Task Assignment Plan — Role-wise

System ma active 34 staff xan. Tini lai role anusar daily checkout tasks assign garne plan. Approve gare paxi `daily_checkout_tasks` table ma bulk insert garerai dinxu (sort_order sahit, target_role anusar — yaslai jun role ma assign garyo tyo role ka sabai users lai automatically apply hunx).

## Role-wise Active Staff Count
- OWNER: 1 (Yogesh)
- ADMIN: 4 (Anil, Darshan, Man, Ramesh)
- SALES_MANAGER: 2 (Amit, Kamal)
- LEADS: 3
- CALLING: 16
- LOGISTICS: 6
- HR: 1 (Hemanta)
- ACCOUNTANT: 1 (Hemant)

## Tasks per Role (Daily Frequency)

### CALLING (16 staff)
1. Aajako assigned sabai naya leads ma call gareko
2. Follow-up due leads sabai complete gareko
3. CNR leads (no response) lai retry call gareko (minimum 2 attempt)
4. Confirmed orders ko address & product detail double-check gareko
5. Cancel/CNR ko proper remark with reason lekheko
6. Daily target achievement update gareko

### LEADS (3 staff)
1. Naya leads system ma pull/upload gareko (SocialBox/manual)
2. Duplicate phone check garera clean gareko
3. Leads calling staff lai assign/reassign gareko balanced way ma
4. Source-wise lead quality report check gareko
5. Pending unassigned leads zero ma rakheko

### LOGISTICS (6 staff)
1. Confirmed orders courier ma dispatch gareko (Inside + Outside valley)
2. Courier tracking update gareko (delivered/RTO/pending)
3. RTO orders inventory ma fir wapas entry gareko
4. COD settlement courier sanga reconcile gareko
5. Pending dispatch orders zero ma rakheko
6. Customer delivery issue/complaint solve gareko

### ADMIN (4 staff)
1. Daily P/L review gareko
2. Staff performance & target progress check gareko
3. Pending high-alert issues solve gareko
4. Inventory low-stock alerts review gareko
5. Today ko sales vs target comparison gareko
6. Team chat ma important update reply gareko

### SALES_MANAGER (2 staff)
1. Sales dashboard ma aajako revenue review gareko
2. Calling staff ko performance monitor gareko
3. Lead conversion rate check gareko
4. Product-wise sales target progress check gareko
5. Underperforming staff lai feedback/coaching diyeko

### HR (1 staff — Hemanta)
1. Attendance & leave requests review/approve gareko
2. Absent/late staff lai follow-up gareko
3. Pending HR tickets/documents process gareko
4. Birthday/anniversary wishes pathayeko (if any)
5. Daily task submission compliance check gareko

### ACCOUNTANT (1 staff — Hemant)
1. Daily transactions (income/expense) entry & verify gareko
2. Party payments (received/paid) reconcile gareko
3. Consignment payments update gareko
4. Bank/cash ledger balance check gareko
5. Pending bills/invoices process gareko

### OWNER (1 — Yogesh)
1. Daily P/L & Net cash position review gareko
2. All store ko summary check gareko
3. Critical alerts (consignment in-hand negative, high RTO) review gareko

## Database Action (after approval)
Insert into `daily_checkout_tasks` for each role:
- `title` = task text
- `target_role` = role (CALLING/LEADS/etc)
- `assigned_staff_id` = NULL (role-wide)
- `frequency` = 'daily'
- `is_active` = true
- `sort_order` = 1..N per role
- `store_id` = default store (will use existing active store)
- `created_by` = OWNER id

Total tasks: ~40 rows across 8 roles.

## Question before execution
1. Sabai store ma same task chahincha ki specific store ma matra? (Currently single-store default ma rakhne plan x.)
2. Kunai task add/remove/edit garna parx ki list lai as-is approve garne?
