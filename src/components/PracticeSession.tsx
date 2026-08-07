"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PracticeBoard from "@/components/PracticeBoard";
import UserBadge from "@/components/UserBadge";
import { allPositions, randomPosition } from "@/lib/positions";
import {
  recordGameEnd,
  recordSkip,
  getStats,
  getReviewQueue,
  meetsTarget,
  EMPTY_STATS,
  type SessionStatsSummary,
  type GameResult,
} from "@/lib/session";
import { getSkillLevel, setSkillLevel, skillLabel, MIN_SKILL, MAX_SKILL } from "@/lib/engineSettings";
import { PAWN_ENDGAMES } from "@/lib/categories";
import { positionId, type Position } from "@/types/position";

interface PracticeSessionProps {
  /** true = pull from the review queue (positions previously failed) instead of the full pool. */
  fromReviewQueue: boolean;
  /** Which puzzle category's pool/progress to use. Defaults to the only category there is today. */
  categoryId?: string;
}

export default function PracticeSession({ fromReviewQueue, categoryId = PAWN_ENDGAMES.id }: PracticeSessionProps) {
  const [position, setPosition] = useState<Position | null>(null);
  const [noPositions, setNoPositions] = useState(false);
  const [outcomeBanner, setOutcomeBanner] = useState<{ success: boolean | null; text: string } | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [stats, setStats] = useState<SessionStatsSummary>(EMPTY_STATS);
  const [skill, setSkill] = useState(15);

  function loadNext() {
    let pool = allPositions;
    if (fromReviewQueue) {
      const ids = getReviewQueue(categoryId);
      pool = allPositions.filter((p) => ids.has(positionId(p)));
    }
    const p = randomPosition(pool);
    setPosition(p);
    setNoPositions(p === null);
    setOutcomeBanner(null);
  }

  // position selection is random and stats/settings read from localStorage, so both are
  // deferred to a client-only effect to avoid a server/client hydration mismatch
  useEffect(() => {
    loadNext();
    setStats(getStats(categoryId));
    setSkill(getSkillLevel());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromReviewQueue, categoryId]);

  function handleGameEnd({ actualResult, description }: { actualResult: GameResult; description: string }) {
    if (!position) return;
    recordGameEnd(categoryId, positionId(position), actualResult, position.target_result, fromReviewQueue);
    setSessionCount((c) => c + 1);
    setStats(getStats(categoryId));

    if (position.target_result === null) {
      setOutcomeBanner({ success: null, text: description });
    } else if (meetsTarget(actualResult, position.target_result)) {
      setOutcomeBanner({ success: true, text: `${description} — solved!` });
    } else {
      setOutcomeBanner({
        success: false,
        text: `${description} — the book says ${position.target_result}. Moved to review.`,
      });
    }
  }

  function handleSkip() {
    if (!position) return;
    recordSkip(categoryId, positionId(position), fromReviewQueue);
    setSessionCount((c) => c + 1);
    setStats(getStats(categoryId));
    loadNext();
  }

  function handleNext() {
    loadNext();
  }

  function handleSkillChange(value: number) {
    setSkill(value);
    setSkillLevel(value);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center gap-6 px-4 py-8">
      <header className="flex w-full items-start justify-between">
        <Link href="/" className="font-serif text-lg text-foreground/90 hover:text-accent">
          ← Endgame Trainer
        </Link>
        <div className="flex flex-col items-end gap-1">
          <UserBadge />
          <div className="text-right text-xs text-muted">
            <div>{fromReviewQueue ? "Review queue" : "Pawn Endgames"}</div>
            <div>
              {sessionCount} this session · {stats.solved} solved · {stats.reviewQueueSize} in review
            </div>
          </div>
        </div>
      </header>

      {fromReviewQueue && (
        <div className="w-full rounded-lg border border-amber-800/40 bg-amber-950/30 px-4 py-2 text-sm text-amber-200">
          Positions you didn&apos;t win or draw as the book says. Beat the target result to clear
          them from this queue.
        </div>
      )}

      <details className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-sm text-muted">
        <summary className="cursor-pointer text-foreground/80">
          Engine strength: {skillLabel(skill)} ({skill}/20)
        </summary>
        <input
          type="range"
          min={MIN_SKILL}
          max={MAX_SKILL}
          value={skill}
          onChange={(e) => handleSkillChange(Number(e.target.value))}
          className="mt-3 w-full accent-accent"
        />
      </details>

      {noPositions && (
        <p className="text-muted">
          {fromReviewQueue ? "Nothing in the review queue right now." : "No positions available."}
        </p>
      )}

      {position && (
        <section className="flex w-full flex-col items-center gap-4">
          <div className="w-full max-w-[480px] text-sm text-muted">
            <div className="flex items-center justify-between">
              <span>
                Page {position.page_number_pdf}
                {position.diagram_number !== null ? ` · Diagram ${position.diagram_number}` : ""}
              </span>
              <span className="capitalize">
                {position.side_to_move ?? "unknown"} to move
                {position.target_result ? ` · aim: ${position.target_result}` : ""}
              </span>
            </div>
            {position.title_text && (
              <div className="font-serif text-base text-foreground/90">{position.title_text}</div>
            )}
          </div>

          <PracticeBoard position={position} skillLevel={skill} onGameEnd={handleGameEnd} />

          <div className="flex w-full max-w-[480px] items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleSkip}
              className="rounded-lg border border-border px-4 py-2 text-sm text-foreground/80 transition hover:border-accent hover:text-accent"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handleNext}
              className={`flex-1 rounded-lg px-4 py-2 text-center font-medium transition ${
                outcomeBanner
                  ? "animate-pulse bg-accent-strong text-neutral-900 shadow-[0_0_0_3px_rgba(240,185,79,0.35)] hover:animate-none"
                  : "bg-accent text-neutral-900 hover:bg-accent-strong"
              }`}
            >
              {outcomeBanner ? "Next position →" : "New position"}
            </button>
          </div>

          {outcomeBanner && (
            <div
              className={`w-full max-w-[480px] rounded-lg border px-4 py-2 text-center font-medium ${
                outcomeBanner.success === true
                  ? "border-emerald-700/40 bg-emerald-950/30 text-emerald-300"
                  : outcomeBanner.success === false
                    ? "border-red-800/40 bg-red-950/30 text-red-300"
                    : "border-accent/40 bg-accent/10 text-accent-strong"
              }`}
            >
              {outcomeBanner.text}
            </div>
          )}

          <details className="w-full max-w-[480px] text-xs text-muted">
            <summary className="cursor-pointer">FEN &amp; raw notation</summary>
            <div className="mt-1 break-all">{position.fen}</div>
            <div className="mt-1 whitespace-pre-wrap">{position.notation_raw}</div>
          </details>
        </section>
      )}
    </main>
  );
}
