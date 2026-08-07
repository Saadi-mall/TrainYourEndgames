"use client";

import { useState } from "react";
import { beginLogin } from "@/lib/lichessAuth";

export default function LoginPage() {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setStarting(true);
    setError(null);
    try {
      await beginLogin();
    } catch {
      setError("Couldn't start the Lichess login. Please try again.");
      setStarting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-8 px-6 text-center">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Chess Informant · Encyclopedia of Chess Endings</p>
        <h1 className="mt-2 font-serif text-4xl text-foreground">Endgame Trainer</h1>
        <p className="mt-3 text-sm text-muted">
          Sign in with your Lichess account to track your own progress.
        </p>
      </div>

      <button
        type="button"
        onClick={handleLogin}
        disabled={starting}
        className="flex items-center gap-2 rounded-lg bg-accent px-6 py-3 font-medium text-neutral-900 transition hover:bg-accent-strong disabled:opacity-60"
      >
        {starting ? "Redirecting to Lichess…" : "Sign in with Lichess"}
      </button>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </main>
  );
}
