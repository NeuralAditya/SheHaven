import { Phone, PhoneOff, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FakeCallScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FakeCallScreen({ isOpen, onClose }: FakeCallScreenProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] bg-zinc-900 text-white flex flex-col items-center justify-between py-20 px-8"
        >
          <div className="flex flex-col items-center space-y-6 mt-10">
            <div className="h-24 w-24 bg-zinc-700 rounded-full flex items-center justify-center relative">
              <span className="absolute inset-0 rounded-full border-2 border-green-500 opacity-50 animate-ping" />
              <User className="h-12 w-12 text-zinc-400" />
            </div>
            
            <div className="text-center space-y-2">
              <h2 className="text-4xl font-light tracking-wide">Mom</h2>
              <p className="text-zinc-400 text-lg">Incoming call...</p>
            </div>
          </div>

          <div className="flex justify-between w-full max-w-xs px-4 mb-10">
            <div className="flex flex-col items-center space-y-2">
              <button 
                onClick={onClose}
                className="h-16 w-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <PhoneOff className="h-8 w-8" />
              </button>
              <span className="text-sm text-zinc-400">Decline</span>
            </div>

            <div className="flex flex-col items-center space-y-2">
              <button 
                onClick={onClose}
                className="h-16 w-16 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors animate-bounce"
              >
                <Phone className="h-8 w-8" />
              </button>
              <span className="text-sm text-zinc-400">Accept</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}