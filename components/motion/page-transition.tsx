"use client";

import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className="space-y-8"
    >
      {children}
    </motion.div>
  );
}
