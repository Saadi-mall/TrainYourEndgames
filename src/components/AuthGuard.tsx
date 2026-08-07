"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, type AuthSession } from "@/lib/lichessAuth";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null | "checking">("checking");

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.replace("/login");
    } else {
      setSession(s);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (session === "checking" || session === null) {
    return <main className="min-h-screen" />;
  }

  return <>{children}</>;
}
