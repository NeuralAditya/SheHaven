import { motion, AnimatePresence } from "framer-motion";
import { SheHavenLogo } from "./SheHavenLogo";

interface SplashScreenProps {
  visible: boolean;
}

export function SplashScreen({ visible }: SplashScreenProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #4c0519 100%)",
          }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.7, ease: "easeInOut" } }}
        >
          {/* Animated background rings */}
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full border border-rose-500/10"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div
            className="absolute w-[400px] h-[400px] rounded-full border border-rose-500/15"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
          />
          <motion.div
            className="absolute w-[300px] h-[300px] rounded-full border border-rose-500/20"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 1 }}
          />

          {/* Logo entrance */}
          <motion.div
            className="flex flex-col items-center gap-6"
            initial={{ scale: 0.4, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          >
            {/* Shield icon */}
            <motion.div
              initial={{ rotate: -10 }}
              animate={{ rotate: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <SheHavenLogo size="xl" variant="icon" />
            </motion.div>

            {/* Brand name */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="text-center"
            >
              <p
                className="font-bold text-5xl text-white"
                style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: "-0.02em" }}
              >
                She<span style={{ color: "#fb7185" }}>Haven</span>
              </p>
              <motion.p
                className="text-rose-300 text-sm tracking-widest uppercase mt-2 font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.7 }}
              >
                Your Safety. Always.
              </motion.p>
            </motion.div>
          </motion.div>

          {/* Loading bar */}
          <motion.div
            className="absolute bottom-16 w-48 h-0.5 bg-white/10 rounded-full overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.div
              className="h-full bg-rose-400 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.8, delay: 0.3, ease: "easeInOut" }}
            />
          </motion.div>

          <motion.p
            className="absolute bottom-10 text-xs text-white/30 tracking-wider"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            Preparing your safety map...
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
