import { useMemo } from 'react';
import { useEffectiveRole } from './useEffectiveRole';

/**
 * Hook to check if the current user can edit accounting data.
 * Only OWNER and ACCOUNTANT roles can edit; ADMIN and others can only view.
 */
export function useAccountingEditAccess() {
  const { effectiveRole } = useEffectiveRole();
  
  const canEdit = useMemo(() => {
    return effectiveRole === 'OWNER' || effectiveRole === 'ACCOUNTANT';
  }, [effectiveRole]);
  
  return { canEdit, effectiveRole };
}
