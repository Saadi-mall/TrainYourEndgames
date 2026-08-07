"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { totalCount, gradedCount } from "@/lib/positions";
import { getStats, resetCategory, EMPTY_STATS, type SessionStatsSummary } from "@/lib/session";
import { PAWN_ENDGAMES } from "@/lib/categories";
import UserBadge from "@/components/UserBadge";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function Home() {
  const [stats, setStats] = useState<SessionStatsSummary>(EMPTY_STATS);
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    setStats(getStats(PAWN_ENDGAMES.id));
  }, []);

  function handleResetConfirmed() {
    resetCategory(PAWN_ENDGAMES.id);
    setStats(getStats(PAWN_ENDGAMES.id));
    setConfirmingReset(false);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center gap-12 px-6 py-16">
      <div className="flex w-full justify-end">
        <UserBadge />
      </div>

      <header className="text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Chess Informant · Encyclopedia of Chess Endings</p>
        <h1 className="mt-2 font-serif text-4xl text-foreground">Endgame Trainer</h1>
        <p className="mt-3 text-sm text-muted">
          {totalCount} positions extracted from the Pawns volume · {gradedCount} auto-graded against
          Stockfish{stats.totalAttempts > 0 ? ` · ${stats.totalAttempts} attempts logged` : ""}.
        </p>
      </header>

      <section className="grid w-full gap-4 sm:grid-cols-2">
        <div className="group flex flex-col justify-between rounded-2xl border border-border bg-surface p-6 shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition hover:border-accent">
          <div>
            <div className="text-3xl">♟</div>
            <h2 className="mt-3 font-serif text-2xl text-foreground">{PAWN_ENDGAMES.label}</h2>
            <p className="mt-2 text-sm text-muted">
              A fresh diagram loads every time — play it out against Stockfish.
            </p>
            <p className="mt-2 text-sm font-medium text-accent">
              {stats.solvedPositions}/{totalCount} puzzles solved
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <Link
              href="/practice"
              className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-strong"
            >
              Start training →
            </Link>
            {stats.totalAttempts > 0 && (
              <button
                type="button"
                onClick={() => setConfirmingReset(true)}
                className="text-xs text-muted transition hover:text-red-400"
              >
                Reset progress
              </button>
            )}
          </div>
        </div>

        <Link
          href="/review"
          className="group flex flex-col justify-between rounded-2xl border border-border bg-surface-2 p-6 transition hover:border-accent"
        >
          <div>
            <div className="text-3xl">⚑</div>
            <h2 className="mt-3 font-serif text-2xl text-foreground">Review</h2>
            <p className="mt-2 text-sm text-muted">
              {stats.reviewQueueSize} position{stats.reviewQueueSize === 1 ? "" : "s"} you didn&apos;t win
              or draw as the book says. Beat the target result to clear them.
            </p>
          </div>
          <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-muted group-hover:text-accent">
            Review queue →
          </span>
        </Link>
      </section>

      {stats.totalAttempts > 0 && (
        <section className="w-full rounded-xl border border-border bg-surface p-5 text-sm text-muted">
          <h3 className="font-serif text-base text-foreground">Progress</h3>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <dt className="text-xs uppercase tracking-wide">Today</dt>
              <dd className="text-lg text-foreground">{stats.attemptsToday}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide">Solved</dt>
              <dd className="text-lg text-foreground">{stats.solved}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide">Unique positions</dt>
              <dd className="text-lg text-foreground">{stats.uniquePositionsSeen}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide">In review</dt>
              <dd className="text-lg text-foreground">{stats.reviewQueueSize}</dd>
            </div>
          </dl>
        </section>
      )}

      <ConfirmDialog
        open={confirmingReset}
        title={`Reset ${PAWN_ENDGAMES.label} progress?`}
        description={`This clears all solved/review history for ${PAWN_ENDGAMES.label} on this account — back to ${0}/${totalCount}. This can't be undone.`}
        confirmLabel="Reset progress"
        onConfirm={handleResetConfirmed}
        onCancel={() => setConfirmingReset(false)}
      />
    </main>
  );
}
