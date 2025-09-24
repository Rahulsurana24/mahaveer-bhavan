import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePWA } from '@/hooks/usePWA';
import { Download, X, Smartphone } from 'lucide-react';

export const PWAInstallPrompt = () => {
  const { canInstall, installApp } = usePWA();
  const [isDismissed, setIsDismissed] = useState(false);

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      setIsDismissed(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    // Store dismissal in localStorage to prevent showing again for 7 days
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Check if user has dismissed the prompt recently
  const dismissedTime = localStorage.getItem('pwa-install-dismissed');
  const shouldShow = canInstall && !isDismissed && (
    !dismissedTime || 
    Date.now() - parseInt(dismissedTime) > 7 * 24 * 60 * 60 * 1000 // 7 days
  );

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96"
        >
          <Card className="shadow-lg border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Install Mahaveer Bhavan</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Get the full app experience with offline access, push notifications, and faster loading.
                  </p>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleInstall} size="sm" className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Install App
                    </Button>
                    <Button 
                      onClick={handleDismiss} 
                      variant="ghost" 
                      size="sm"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};