"use client";

import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Monitor, Share, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isAppInstalled =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isAppInstalled);

    // Check if iOS
    const iOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Check if dismissed before
    const wasDismissed = localStorage.getItem("pwa-install-dismissed");
    if (wasDismissed) {
      const dismissedTime = parseInt(wasDismissed);
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after 3 seconds on the page
      setTimeout(() => {
        if (!dismissed) {
          setShowPrompt(true);
        }
      }, 3000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Show iOS prompt after delay if on iOS and not installed
    if (iOS && !isAppInstalled && !dismissed) {
      setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, [dismissed]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowPrompt(false);
        setDeferredPrompt(null);
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  // Don't show if already installed or dismissed
  if (isStandalone || dismissed) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md"
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-primary to-accent p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur">
                    {isIOS ? (
                      <Smartphone className="w-6 h-6" />
                    ) : (
                      <Monitor className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Install App</h3>
                    <p className="text-sm opacity-90">
                      Get the best experience
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {isIOS ? (
                // iOS instructions
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Install this app on your iPhone for quick access:
                  </p>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Share className="w-5 h-5 text-primary" />
                    <span className="text-sm">
                      Tap the <strong>Share</strong> button below
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Download className="w-5 h-5 text-primary" />
                    <span className="text-sm">
                      Select <strong>"Add to Home Screen"</strong>
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleDismiss}
                  >
                    Got it!
                  </Button>
                </div>
              ) : (
                // Android/Desktop install
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <Download className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        Install Periodic Test App
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Access tests offline, get notifications, and enjoy a
                        native app experience.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={handleDismiss}>
                      Not now
                    </Button>
                    <Button variant="gradient" onClick={handleInstall}>
                      <Download className="w-4 h-4 mr-2" />
                      Install
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Features strip */}
            <div className="px-4 pb-4">
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-success rounded-full"></span>
                  Works offline
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-info rounded-full"></span>
                  Fast access
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-warning rounded-full"></span>
                  Notifications
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Install button component for use in settings or elsewhere
export function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isAppInstalled = window.matchMedia(
      "(display-mode: standalone)",
    ).matches;
    setIsInstalled(isAppInstalled);

    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () =>
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    }
  };

  if (isInstalled) {
    return (
      <Button variant="outline" disabled className="w-full">
        <Download className="w-4 h-4 mr-2" />
        App Installed ✓
      </Button>
    );
  }

  if (isIOS) {
    return (
      <div className="p-4 bg-muted/50 rounded-lg text-center">
        <p className="text-sm text-muted-foreground mb-2">To install on iOS:</p>
        <p className="text-sm">
          Tap <Share className="w-4 h-4 inline" /> → "Add to Home Screen"
        </p>
      </div>
    );
  }

  if (!deferredPrompt) {
    return (
      <Button variant="outline" disabled className="w-full">
        <Download className="w-4 h-4 mr-2" />
        Open in browser to install
      </Button>
    );
  }

  return (
    <Button variant="gradient" onClick={handleInstall} className="w-full">
      <Download className="w-4 h-4 mr-2" />
      Install App
    </Button>
  );
}
