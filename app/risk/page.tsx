"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Risk analysis is integrated into Audit Log — redirect legacy route */
export default function RiskPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/audit-log");
  }, [router]);
  return null;
}
