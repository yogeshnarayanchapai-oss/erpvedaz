# Lead Reassignment Lock Until Status Change

Once a lead is assigned to a calling staff member (status = 'ASSIGNED'), the lead cannot be reassigned to another staff member by Lead/Manager/Admin until the currently assigned staff changes the lead's status.

## Business Rule
- When a lead is assigned, its status becomes 'ASSIGNED'
- The lead CANNOT be reassigned until the assigned staff changes its status to: CONFIRMED, FOLLOW_UP, CALL_NOT_RECEIVED, or CANCELLED
- This prevents immediate reassignments that cause counting discrepancies
- This enforces staff accountability - they must work on assigned leads before they can be moved

## Implementation
- `AdminLeads.tsx` - handleBulkReassign checks for ASSIGNED status and blocks with error message
- `LeadsAll.tsx` - handleBulkReassign checks for ASSIGNED status and blocks with error message
- `AdminTransferLeadsModal.tsx` - Already only transfers unassigned leads (pool_status = 'IN_POOL', assigned_to_user_id = null)

## Error Message
"Cannot reassign X lead(s) with ASSIGNED status. Staff must first work on the lead (change status to CONFIRMED, FOLLOW_UP, CNR, or CANCELLED)."
