import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useTriggerSos } from "@workspace/api-client-react";
import { ShieldAlert, Mic } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface SosButtonProps {
  currentLocation: { lat: number; lng: number };
}

export function SosButton({ currentLocation }: SosButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isSent, setIsSent] = useState(false);
  
  const triggerSosMutation = useTriggerSos();
  const { toast } = useToast();

  const handleSosClick = () => {
    setIsDialogOpen(true);
    let count = 3;
    setCountdown(count);
    
    const timer = setInterval(() => {
      count -= 1;
      setCountdown(count);
      
      if (count === 0) {
        clearInterval(timer);
        executeSos();
      }
    }, 1000);

    // Store timer so we can clear it if cancelled
    (window as any).sosTimer = timer;
  };

  const cancelSos = () => {
    clearInterval((window as any).sosTimer);
    setCountdown(null);
    setIsDialogOpen(false);
  };

  const executeSos = () => {
    setCountdown(null);
    triggerSosMutation.mutate(
      {
        data: {
          lat: currentLocation.lat,
          lng: currentLocation.lng,
        }
      },
      {
        onSuccess: (data) => {
          setIsSent(true);
          toast({
            title: "Emergency Alert Active",
            description: `${data.contactsNotified} contacts notified. Audio recording started.`,
            variant: "destructive",
          });
          
          setTimeout(() => {
            setIsDialogOpen(false);
            setIsSent(false);
          }, 5000);
        }
      }
    );
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSosClick}
          className="relative group"
        >
          <div className="absolute -inset-4 bg-destructive/30 rounded-full blur-lg group-hover:bg-destructive/50 transition-all duration-300 animate-pulse"></div>
          <div className="relative bg-destructive text-white h-20 w-20 rounded-full flex flex-col items-center justify-center shadow-xl border-4 border-background overflow-hidden">
            <ShieldAlert className="w-8 h-8 mb-0.5" />
            <span className="font-bold tracking-widest text-sm">SOS</span>
          </div>
        </motion.button>
      </div>

      <AlertDialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open && countdown !== null) cancelSos();
      }}>
        <AlertDialogContent className="border-destructive/30 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-2xl text-destructive font-bold">
              {isSent ? "ALERT SENT" : "SENDING EMERGENCY ALERT"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-lg mt-4">
              <AnimatePresence mode="wait">
                {countdown !== null && (
                  <motion.div
                    key="countdown"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.5, opacity: 0 }}
                    className="text-6xl font-black text-destructive my-6"
                  >
                    {countdown}
                  </motion.div>
                )}
                {isSent && (
                  <motion.div
                    key="sent"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-6 space-y-4"
                  >
                    <div className="h-16 w-16 rounded-full bg-destructive/20 flex items-center justify-center mb-2 animate-pulse">
                      <ShieldAlert className="w-8 h-8 text-destructive" />
                    </div>
                    <p className="text-foreground font-medium">Your live location has been shared with 3 emergency contacts.</p>
                    
                    <div className="flex items-center gap-3 text-red-500 bg-red-500/10 px-4 py-2 rounded-full mt-4">
                      <Mic className="w-5 h-5 animate-pulse" />
                      <span className="font-semibold text-sm">Recording Audio...</span>
                    </div>
                  </motion.div>
                )}
                {triggerSosMutation.isPending && (
                  <div className="py-8">Sending...</div>
                )}
              </AnimatePresence>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            {countdown !== null && (
              <Button variant="outline" onClick={cancelSos} className="w-full text-lg h-12">
                Cancel (I'm Safe)
              </Button>
            )}
            {isSent && (
              <Button variant="default" onClick={() => setIsDialogOpen(false)} className="w-full">
                Dismiss
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}