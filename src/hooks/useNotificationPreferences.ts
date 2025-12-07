import { useState, useEffect, useCallback } from 'react';
import { 
  requestNotificationPermission, 
  getNotificationPermission,
  registerServiceWorker,
  isNotificationSupported,
  NotificationPermission
} from '@/lib/browserNotifications';

export interface NotificationPreferences {
  soundEnabled: boolean;
  toastEnabled: boolean;
  emailEnabled: boolean;
  browserEnabled: boolean;
}

const STORAGE_KEY = 'notification_preferences';

const defaultPreferences: NotificationPreferences = {
  soundEnabled: true,
  toastEnabled: true,
  emailEnabled: false,
  browserEnabled: false,
};

function getStoredPreferences(userId: string): NotificationPreferences {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    if (stored) {
      return { ...defaultPreferences, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Error reading notification preferences:', e);
  }
  return defaultPreferences;
}

function storePreferences(userId: string, preferences: NotificationPreferences) {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(preferences));
  } catch (e) {
    console.error('Error storing notification preferences:', e);
  }
}

export function useNotificationPreferences(userId: string | undefined) {
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');
  const [browserSupported, setBrowserSupported] = useState(false);

  useEffect(() => {
    setBrowserSupported(isNotificationSupported());
    setBrowserPermission(getNotificationPermission());
    
    if (userId) {
      setPreferences(getStoredPreferences(userId));
    }
  }, [userId]);

  // Register service worker on mount
  useEffect(() => {
    if (browserSupported) {
      registerServiceWorker();
    }
  }, [browserSupported]);

  const updatePreference = useCallback(<K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    setPreferences(prev => {
      const updated = { ...prev, [key]: value };
      if (userId) {
        storePreferences(userId, updated);
      }
      return updated;
    });
  }, [userId]);

  const toggleSound = useCallback(() => {
    updatePreference('soundEnabled', !preferences.soundEnabled);
  }, [preferences.soundEnabled, updatePreference]);

  const toggleToast = useCallback(() => {
    updatePreference('toastEnabled', !preferences.toastEnabled);
  }, [preferences.toastEnabled, updatePreference]);

  const toggleEmail = useCallback(() => {
    updatePreference('emailEnabled', !preferences.emailEnabled);
  }, [preferences.emailEnabled, updatePreference]);

  const toggleBrowser = useCallback(async () => {
    if (!preferences.browserEnabled) {
      // Request permission when enabling
      const permission = await requestNotificationPermission();
      setBrowserPermission(permission);
      
      if (permission === 'granted') {
        updatePreference('browserEnabled', true);
      }
    } else {
      updatePreference('browserEnabled', false);
    }
  }, [preferences.browserEnabled, updatePreference]);

  return {
    preferences,
    browserPermission,
    browserSupported,
    updatePreference,
    toggleSound,
    toggleToast,
    toggleEmail,
    toggleBrowser,
  };
}
