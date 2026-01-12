import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X, Loader2 } from "lucide-react";
import { useState } from "react";

export function PWAUpdatePrompt() {
  const [dismissed, setDismissed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log("SW registered:", r);
    },
    onRegisterError(error) {
      console.log("SW registration error", error);
    },
  });

  const handleUpdate = async () => {
    setIsUpdating(true);
    
    try {
      // Unregister all existing service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      // Trigger the service worker update
      await updateServiceWorker(true);
      
      // Force reload to get fresh content
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Update failed:', error);
      // Fallback: just reload the page
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  if (!needRefresh || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg p-4 border border-primary/20">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 bg-primary-foreground/10 rounded-full">
            <RefreshCw className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">Update Available!</h3>
            <p className="text-xs text-primary-foreground/80 mt-1">
              नयाँ version उपलब्ध छ। अपडेट गर्नुहोस्।
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleUpdate}
                disabled={isUpdating}
                className="flex-1 text-xs"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Update Now
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                disabled={isUpdating}
                className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
