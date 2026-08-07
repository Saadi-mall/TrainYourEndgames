"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { handleCallback } from "@/lib/lichessAuth";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    const oauthError = params.get("error");

    if (oauthError) {
      setError(`Lichess declined: ${oauthError}`);
      return;
    }
    if (!code || !state) {
      setError("Missing code or state from Lichess redirect.");
      return;
    }

    handleCallback(code, state)
      .then(() => router.replace("/"))
      .catch((e: Error) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      {error ? (
        <>
          <p className="text-sm text-red-400">{error}</p>
          <a href="/login" className="text-sm text-accent hover:text-accent-strong">
            Back to login
          </a>
        </>
      ) : (
        <p className="text-sm text-muted">Finishing sign-in…</p>
      )}
    </main>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<main className="min-h-screen" />}>
      <CallbackInner />
    </Suspense>
  );
}
