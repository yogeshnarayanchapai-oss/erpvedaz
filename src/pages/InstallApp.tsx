import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Download, 
  Smartphone, 
  Share, 
  Plus, 
  Check, 
  ArrowRight,
  Chrome,
  Apple,
  Wifi,
  Bell,
  Zap
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);

    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const android = /Android/.test(navigator.userAgent);
    setIsIOS(iOS);
    setIsAndroid(android);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const features = [
    { icon: Zap, title: "Fast & Responsive", desc: "Native app जस्तो experience" },
    { icon: Wifi, title: "Offline Support", desc: "Internet नभएपनि काम गर्छ" },
    { icon: Bell, title: "Push Notifications", desc: "Real-time alerts पाउनुहोस्" },
  ];

  if (isStandalone || installed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-4 rounded-full bg-green-500/10 p-4">
              <Check className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle className="text-2xl">App Installed!</CardTitle>
            <CardDescription>
              Vedaz Store तपाईंको home screen मा install भइसक्यो
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href="/">Dashboard मा जानुहोस्</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Hero Section */}
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="mx-auto mb-6 rounded-2xl bg-primary/10 p-6 w-24 h-24 flex items-center justify-center">
            <Smartphone className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Vedaz Store App Install गर्नुहोस्
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Home screen मा add गरेर native app जस्तै experience पाउनुहोस्। 
            एक click मा access, offline support, र push notifications।
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          {features.map((feature, i) => (
            <Card key={i} className="text-center">
              <CardContent className="pt-6">
                <div className="mx-auto mb-3 rounded-lg bg-primary/10 p-3 w-12 h-12 flex items-center justify-center">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Install Instructions */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Android/Chrome */}
          <Card className={isAndroid || (!isIOS && !isAndroid) ? "ring-2 ring-primary" : ""}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-500/10 p-2">
                  <Chrome className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Android / Chrome</CardTitle>
                  <CardDescription>Chrome browser प्रयोग गर्नुहोस्</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {deferredPrompt ? (
                <Button onClick={handleInstall} className="w-full gap-2" size="lg">
                  <Download className="h-5 w-5" />
                  Install Vedaz App
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-1.5 mt-0.5">
                      <span className="text-xs font-bold text-primary">1</span>
                    </div>
                    <p className="text-sm">Chrome browser मा यो page open गर्नुहोस्</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-1.5 mt-0.5">
                      <span className="text-xs font-bold text-primary">2</span>
                    </div>
                    <p className="text-sm">Menu (⋮) button tap गर्नुहोस्</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-1.5 mt-0.5">
                      <span className="text-xs font-bold text-primary">3</span>
                    </div>
                    <p className="text-sm">"Install app" वा "Add to Home screen" select गर्नुहोस्</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* iOS */}
          <Card className={isIOS ? "ring-2 ring-primary" : ""}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gray-500/10 p-2">
                  <Apple className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">iPhone / iPad</CardTitle>
                  <CardDescription>Safari browser प्रयोग गर्नुहोस्</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-1.5 mt-0.5">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <p className="text-sm">Safari browser मा यो page open गर्नुहोस्</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-1.5 mt-0.5">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Share className="h-4 w-4 text-primary" />
                  <span>Share button tap गर्नुहोस्</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-1.5 mt-0.5">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Plus className="h-4 w-4 text-primary" />
                  <span>"Add to Home Screen" select गर्नुहोस्</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-1.5 mt-0.5">
                  <span className="text-xs font-bold text-primary">4</span>
                </div>
                <p className="text-sm">"Add" confirm गर्नुहोस्</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Back to Dashboard */}
        <div className="text-center mt-12">
          <Button variant="outline" asChild>
            <a href="/" className="gap-2">
              Dashboard मा जानुहोस्
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
