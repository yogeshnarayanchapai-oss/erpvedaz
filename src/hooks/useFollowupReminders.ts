import { useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Lead } from './useLeads';

interface UseFollowupRemindersOptions {
  userId: string | undefined;
  leads: Lead[];
  onReminderTriggered?: (lead: Lead) => void;
}

export function useFollowupReminders({ userId, leads, onReminderTriggered }: UseFollowupRemindersOptions) {
  const queryClient = useQueryClient();

  // Get follow-up leads that are due now
  const dueFollowups = useMemo(() => {
    if (!leads) return [];
    const now = new Date();
    
    return leads.filter(lead => {
      if (lead.status !== 'FOLLOW_UP') return false;
      if (!lead.next_followup_at) return false;
      if (lead.is_followup_reminded) return false;
      
      const followupTime = new Date(lead.next_followup_at);
      return followupTime <= now;
    });
  }, [leads]);

  // Get overdue follow-ups
  const overdueFollowups = useMemo(() => {
    if (!leads) return [];
    const now = new Date();
    
    return leads.filter(lead => {
      if (lead.status !== 'FOLLOW_UP') return false;
      if (!lead.next_followup_at) return false;
      if (lead.followup_completed) return false;
      
      const followupTime = new Date(lead.next_followup_at);
      return followupTime < now;
    });
  }, [leads]);

  // Mark lead as reminded
  const markAsReminded = useCallback(async (leadId: string) => {
    try {
      await supabase
        .from('leads')
        .update({ is_followup_reminded: true })
        .eq('id', leadId);
      
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (error) {
      console.error('Failed to mark lead as reminded:', error);
    }
  }, [queryClient]);

  // Check for due follow-ups every minute
  useEffect(() => {
    if (!userId || !leads.length) return;

    const checkReminders = () => {
      dueFollowups.forEach(lead => {
        if (!lead.is_followup_reminded) {
          toast.info(
            `Follow-Up Reminder: Call ${lead.client_name} now.`,
            {
              duration: 10000,
              action: {
                label: 'View',
                onClick: () => onReminderTriggered?.(lead),
              },
            }
          );
          markAsReminded(lead.id);
        }
      });
    };

    // Initial check
    checkReminders();

    // Check every 5 minutes to save Cloud balance
    const interval = setInterval(checkReminders, 300000);

    return () => clearInterval(interval);
  }, [userId, leads, dueFollowups, markAsReminded, onReminderTriggered]);

  return {
    dueFollowups,
    overdueFollowups,
    markAsReminded,
  };
}

// Hook for follow-up statistics
export function useFollowupStats(leads: Lead[], dateRange?: { from: string; to: string }) {
  return useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const followupLeads = leads.filter(l => l.status === 'FOLLOW_UP');
    
    // Today's follow-ups due
    const todayFollowupsDue = followupLeads.filter(l => {
      if (!l.next_followup_at) return false;
      const followupDate = l.next_followup_at.split('T')[0];
      return followupDate === today;
    });

    // Pending follow-ups (due but not completed)
    const pendingFollowups = followupLeads.filter(l => {
      if (!l.next_followup_at) return false;
      if (l.followup_completed) return false;
      const followupTime = new Date(l.next_followup_at);
      return followupTime <= now;
    });

    // Overdue follow-ups (past due time and not completed)
    const overdueFollowups = followupLeads.filter(l => {
      if (!l.next_followup_at) return false;
      if (l.followup_completed) return false;
      const followupTime = new Date(l.next_followup_at);
      // Consider overdue if more than 1 hour past due time
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      return followupTime < oneHourAgo;
    });

    // Completed follow-ups today - count leads where:
    // 1. followup_completed = true
    // 2. updated_at is TODAY (any change happened today)
    const completedFollowupsToday = leads.filter(l => {
      if (!l.followup_completed) return false;
      if (!l.updated_at) return false;
      const updatedDate = l.updated_at.split('T')[0];
      return updatedDate === today;
    });

    // Upcoming follow-ups (scheduled for future)
    const upcomingFollowups = followupLeads.filter(l => {
      if (!l.next_followup_at) return false;
      const followupTime = new Date(l.next_followup_at);
      return followupTime > now;
    });

    return {
      todayFollowupsDue: todayFollowupsDue.length,
      pendingFollowups: pendingFollowups.length,
      overdueFollowups: overdueFollowups.length,
      completedFollowupsToday: completedFollowupsToday.length,
      upcomingFollowups: upcomingFollowups.length,
      totalFollowups: followupLeads.length,
      followupLeadsList: followupLeads,
      overdueLeadsList: overdueFollowups,
      pendingLeadsList: pendingFollowups,
      upcomingLeadsList: upcomingFollowups,
    };
  }, [leads]);
}
