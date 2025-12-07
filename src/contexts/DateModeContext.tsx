import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useHRSettings, useUpdateHRSettings } from '@/hooks/useHRSettings';

type DateDisplayMode = 'AD' | 'BS' | 'AD+BS';

interface DateModeContextType {
  dateMode: DateDisplayMode;
  setDateMode: (mode: DateDisplayMode) => void;
  isLoading: boolean;
}

const DateModeContext = createContext<DateModeContextType | undefined>(undefined);

export function DateModeProvider({ children }: { children: ReactNode }) {
  const { data: settings, isLoading: settingsLoading } = useHRSettings();
  const updateSettings = useUpdateHRSettings();
  const [dateMode, setDateModeState] = useState<DateDisplayMode>('AD');

  useEffect(() => {
    if (settings?.date_display_mode) {
      setDateModeState(settings.date_display_mode as DateDisplayMode);
    }
  }, [settings]);

  const setDateMode = (mode: DateDisplayMode) => {
    setDateModeState(mode);
    updateSettings.mutate({ date_display_mode: mode });
  };

  return (
    <DateModeContext.Provider value={{ dateMode, setDateMode, isLoading: settingsLoading }}>
      {children}
    </DateModeContext.Provider>
  );
}

export function useDateMode() {
  const context = useContext(DateModeContext);
  if (!context) {
    throw new Error('useDateMode must be used within a DateModeProvider');
  }
  return context;
}
