/**
 * Storage cleanup utility to prevent excessive localStorage/cache buildup
 * Called on app startup to clean old/expired data
 * Optimized for minimal browser storage footprint
 */

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MAX_CART_ITEMS_PER_STORE = 20; // Reduced from 50
const MAX_NOTIFICATIONS = 20; // Reduced from 50
const MAX_STORAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB warning threshold

export function cleanupStorage() {
  try {
    const now = Date.now();
    const keysToRemove: string[] = [];
    const cartKeys: string[] = [];
    const notificationKeys: string[] = [];

    // Scan localStorage for cleanup candidates
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Clean lead drafts older than 6 hours (reduced from 7 days)
      if (key.startsWith('lead_draft_')) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const parsed = JSON.parse(value);
            if (parsed.timestamp && (now - parsed.timestamp > SIX_HOURS_MS)) {
              keysToRemove.push(key);
            }
          }
        } catch {
          keysToRemove.push(key); // Remove if can't parse
        }
      }

      // Track cart keys for size limiting
      if (key.startsWith('cart_')) {
        cartKeys.push(key);
      }

      // Track notification keys for cleanup
      if (key.startsWith('lead_notifications_')) {
        notificationKeys.push(key);
      }

      // Clean notification read/dismissed data older than 6 hours
      if (key.startsWith('notification_read_') || key.startsWith('notification_dismissed_')) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const parsed = JSON.parse(value);
            if (parsed.timestamp && (now - parsed.timestamp > SIX_HOURS_MS)) {
              keysToRemove.push(key);
            }
          }
        } catch {
          keysToRemove.push(key);
        }
      }

      // Clean old cache entries
      if (key.includes('_cache_') || key.includes('-cache-')) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const parsed = JSON.parse(value);
            if (parsed.expiry && parsed.expiry < now) {
              keysToRemove.push(key);
            }
          }
        } catch {
          keysToRemove.push(key);
        }
      }

      // Clean tanstack query persisted cache if present
      if (key.includes('tanstack') || key.includes('react-query')) {
        keysToRemove.push(key);
      }
    }

    // Remove old keys
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Limit cart storage per store
    cartKeys.forEach(cartKey => {
      try {
        const value = localStorage.getItem(cartKey);
        if (value) {
          const cart = JSON.parse(value);
          if (Array.isArray(cart) && cart.length > MAX_CART_ITEMS_PER_STORE) {
            // Keep only the most recent items
            const trimmed = cart.slice(-MAX_CART_ITEMS_PER_STORE);
            localStorage.setItem(cartKey, JSON.stringify(trimmed));
          }
        }
      } catch {
        // Ignore parse errors for cart
      }
    });

    // Limit notification storage
    notificationKeys.forEach(notifKey => {
      try {
        const value = localStorage.getItem(notifKey);
        if (value) {
          const notifications = JSON.parse(value);
          if (Array.isArray(notifications)) {
            // Filter old notifications (>6 hours) and limit count
            const sixHoursAgo = now - SIX_HOURS_MS;
            const filtered = notifications
              .filter((n: any) => new Date(n.timestamp).getTime() > sixHoursAgo)
              .slice(0, MAX_NOTIFICATIONS);
            
            if (filtered.length !== notifications.length) {
              localStorage.setItem(notifKey, JSON.stringify(filtered));
            }
          }
        }
      } catch {
        // Ignore parse errors
      }
    });

    // Log cleanup results
    if (keysToRemove.length > 0) {
      console.log(`[StorageCleanup] Removed ${keysToRemove.length} expired items`);
    }

    // Check total localStorage size and warn if high
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += key.length + value.length;
        }
      }
    }
    if (totalSize > MAX_STORAGE_SIZE_BYTES) {
      console.warn(`[StorageCleanup] localStorage is ${(totalSize / 1024 / 1024).toFixed(2)}MB - consider clearing old data`);
    }
  } catch (e) {
    console.warn('[StorageCleanup] Failed to clean storage:', e);
  }
}

/**
 * Clean up runtime caches (CacheStorage) - keeps precache/workbox intact
 * Only removes API/runtime caches to reduce storage
 */
async function cleanupRuntimeCaches() {
  try {
    if (!('caches' in window)) return;
    
    const cacheNames = await caches.keys();
    for (const name of cacheNames) {
      // Only delete runtime caches, NOT precache/workbox caches
      if (
        name.includes('supabase') ||
        name.includes('api') ||
        name.includes('runtime')
      ) {
        await caches.delete(name);
        console.log(`[StorageCleanup] Cleared cache: ${name}`);
      }
    }
  } catch (e) {
    console.warn('[StorageCleanup] Failed to cleanup caches:', e);
  }
}

/**
 * Periodic cleanup during long sessions (every 30 minutes)
 */
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startPeriodicCleanup() {
  if (cleanupInterval) return;
  
  cleanupInterval = setInterval(() => {
    cleanupStorage();
  }, 30 * 60 * 1000); // Every 30 minutes
}

// Run cleanup on module load (app startup)
cleanupStorage();
cleanupRuntimeCaches();
startPeriodicCleanup();

// Export for manual cleanup if needed
export { cleanupRuntimeCaches, startPeriodicCleanup };
