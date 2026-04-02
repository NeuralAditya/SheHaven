import { Button } from "@/components/ui/button";
import { Copy, Radio, PhoneCall } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface LiveTrackingPanelProps {
  isTripActive: boolean;
  onFakeCall: () => void;
}

export function LiveTrackingPanel({ isTripActive, onFakeCall }: LiveTrackingPanelProps) {
  const { toast } = useToast();

  const handleShareLocation = () => {
    navigator.clipboard.writeText("https://saferoute.app/track/12345");
    toast({
      title: "Link Copied",
      description: "Live tracking link copied to clipboard.",
    });
  };

  return (
    <div className="fixed top-20 right-6 z-40 flex flex-col gap-3 items-end">
      {isTripActive && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-border shadow-sm"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
          <span className="text-xs font-bold text-red-500 tracking-wide uppercase">Live</span>
        </motion.div>
      )}

      <Button
        variant="secondary"
        size="icon"
        className="rounded-full shadow-md w-10 h-10"
        onClick={handleShareLocation}
      >
        <Copy className="h-4 w-4" />
      </Button>
      
      <Button
        variant="secondary"
        size="icon"
        className="rounded-full shadow-md w-10 h-10"
        onClick={onFakeCall}
      >
        <PhoneCall className="h-4 w-4" />
      </Button>
    </div>
  );
}