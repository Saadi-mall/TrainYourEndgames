"use client";

import { useEffect, useState } from "react";
import { getSession, logout, type AuthSession } from "@/lib/lichessAuth";

export default function UserBadge() {
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    setSession(getSession());
  }, []);

  if (!session) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      <span>{session.username}</span>
      <button
        type="button"
        onClick={logout}
        className="rounded border border-border px-2 py-0.5 transition hover:border-accent hover:text-accent"
      >
        Sign out
      </button>
    </div>
  );
}
