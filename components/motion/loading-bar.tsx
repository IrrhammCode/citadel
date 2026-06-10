"use client";

import { motion } from "framer-motion";

export function LoadingBar() {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
      <motion.div
        className="h-full w-1/3 rounded-full bg-emerald-500"
        animate={{ x: ["-100%", "400%"] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
