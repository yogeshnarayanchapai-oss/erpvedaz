import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, X, Smartphone, Share, Plus } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Check if user has dismissed before
      const dismissed = localStorage.getItem("pwa-prompt-dismissed");
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Show iOS prompt if not installed and not dismissed
    if (iOS && !standalone) {
      const dismissed = localStorage.getItem("pwa-prompt-dismissed");
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-prompt-dismissed", "true");
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
      <Card className="border-primary/20 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Install Vedaz App</CardTitle>
                <CardDescription className="text-xs">
                  Quick access from home screen
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isIOS ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Safari मा install गर्न:
              </p>
              <div className="flex items-center gap-2 text-xs">
                <Share className="h-4 w-4 text-primary" />
                <span>Share button tap गर्नुहोस्</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Plus className="h-4 w-4 text-primary" />
                <span>"Add to Home Screen" select गर्नुहोस्</span>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleInstall}
              className="w-full gap-2"
              size="sm"
            >
              <Download className="h-4 w-4" />
              Install Now
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
