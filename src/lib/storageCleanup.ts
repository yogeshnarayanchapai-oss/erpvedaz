/**
 * Storage cleanup utility to prevent excessive localStorage/cache buildup
 * Called on app startup to clean old/expired data
 */

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CART_ITEMS_PER_STORE = 50;

export function cleanupStorage() {
  try {
    const now = Date.now();
    const keysToRemove: string[] = [];
    const cartKeys: string[] = [];

    // Scan localStorage for cleanup candidates
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Clean lead drafts older than 7 days
      if (key.startsWith('lead_draft_')) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const parsed = JSON.parse(value);
            if (parsed.timestamp && (now - parsed.timestamp > SEVEN_DAYS_MS)) {
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

      // Clean notification data older than 7 days
      if (key.startsWith('notification_read_') || key.startsWith('notification_dismissed_')) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const parsed = JSON.parse(value);
            if (parsed.timestamp && (now - parsed.timestamp > SEVEN_DAYS_MS)) {
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

    if (keysToRemove.length > 0) {
      console.log(`[StorageCleanup] Removed ${keysToRemove.length} expired items`);
    }
  } catch (e) {
    console.warn('[StorageCleanup] Failed to clean storage:', e);
  }
}

// Run cleanup on module load (app startup)
cleanupStorage();
