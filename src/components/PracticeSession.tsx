"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PracticeBoard from "@/components/PracticeBoard";
import StaticBoard from "@/components/StaticBoard";
import EvalGuess from "@/components/EvalGuess";
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
import { useStockfish } from "@/hooks/useStockfish";
import { classifyEval } from "@/lib/evalClassifier";
import { resolvePerspective, type Perspective } from "@/lib/perspective";
import { positionId, type Position } from "@/types/position";

interface PracticeSessionProps {
  /** true = pull from the review queue (positions previously failed) instead of the full pool. */
  fromReviewQueue: boolean;
  /** Which puzzle category's pool/progress to use. Defaults to the only category there is today. */
  categoryId?: string;
}

type Phase =
  | { kind: "quiz"; checking: boolean }
  | { kind: "quiz-revealed"; guess: GameResult; verified: GameResult; correct: boolean }
  | { kind: "playing"; perspective: Perspective };

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function PracticeSession({ fromReviewQueue, categoryId = PAWN_ENDGAMES.id }: PracticeSessionProps) {
  const [position, setPosition] = useState<Position | null>(null);
  const [noPositions, setNoPositions] = useState(false);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [outcomeBanner, setOutcomeBanner] = useState<{ success: boolean | null; text: string } | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [stats, setStats] = useState<SessionStatsSummary>(EMPTY_STATS);
  const [skill, setSkill] = useState(15);
  const { ready: engineReady, getBestMove, evaluatePosition } = useStockfish();

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

    if (p === null) {
      setPhase(null);
    } else if (p.target_result !== null) {
      setPhase({ kind: "playing", perspective: resolvePerspective(p.side_to_move ?? "white", p.target_result) });
    } else {
      setPhase({ kind: "quiz", checking: false });
    }
  }

  // position selection is random and stats/settings read from localStorage, so both are
  // deferred to a client-only effect to avoid a server/client hydration mismatch
  useEffect(() => {
    loadNext();
    setStats(getStats(categoryId));
    setSkill(getSkillLevel());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromReviewQueue, categoryId]);

  async function handleGuess(guess: GameResult) {
    if (!position || phase?.kind !== "quiz") return;
    setPhase({ kind: "quiz", checking: true });
    const analysis = await evaluatePosition(position.fen);
    if (!analysis) {
      setPhase({ kind: "quiz", checking: false });
      return;
    }
    const verified = classifyEval(analysis);
    setPhase({ kind: "quiz-revealed", guess, verified, correct: guess === verified });
  }

  function handleStartPractice() {
    if (!position || phase?.kind !== "quiz-revealed") return;
    setPhase({
      kind: "playing",
      perspective: resolvePerspective(position.side_to_move ?? "white", phase.verified),
    });
  }

  function handleGameEnd({ actualResult, description }: { actualResult: GameResult; description: string }) {
    if (!position || phase?.kind !== "playing") return;
    const { effectiveTarget } = phase.perspective;
    recordGameEnd(categoryId, positionId(position), actualResult, effectiveTarget, fromReviewQueue);
    setSessionCount((c) => c + 1);
    setStats(getStats(categoryId));

    if (meetsTarget(actualResult, effectiveTarget)) {
      setOutcomeBanner({ success: true, text: `${description} — solved!` });
    } else {
      setOutcomeBanner({
        success: false,
        text: `${description} — the goal was ${effectiveTarget}. Moved to review.`,
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
          Positions you didn&apos;t win or draw as the goal required. Beat it to clear them from
          this queue.
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

      {position && phase && (
        <section className="flex w-full flex-col items-center gap-4">
          <div className="w-full max-w-[480px] text-sm text-muted">
            <div className="flex items-center justify-between">
              <span>
                Page {position.page_number_pdf}
                {position.diagram_number !== null ? ` · Diagram ${position.diagram_number}` : ""}
              </span>
              {phase.kind === "playing" && (
                <span className="capitalize">
                  You play {phase.perspective.userColor} · Goal: {capitalize(phase.perspective.effectiveTarget)}
                </span>
              )}
            </div>
            {position.title_text && (
              <div className="font-serif text-base text-foreground/90">{position.title_text}</div>
            )}
          </div>

          {(phase.kind === "quiz" || phase.kind === "quiz-revealed") && (
            <StaticBoard fen={position.fen} orientation={position.side_to_move ?? "white"} />
          )}

          {phase.kind === "quiz" && (
            <EvalGuess
              sideToMove={position.side_to_move ?? "white"}
              checking={phase.checking}
              onGuess={handleGuess}
            />
          )}

          {phase.kind === "quiz-revealed" && (
            <div
              className={`w-full max-w-[480px] rounded-lg border p-5 text-center ${
                phase.correct
                  ? "border-emerald-700/40 bg-emerald-950/30"
                  : "border-red-800/40 bg-red-950/30"
              }`}
            >
              <p className={phase.correct ? "text-emerald-300" : "text-red-300"}>
                {phase.correct ? "Correct! " : "Not quite. "}
                Stockfish says this is a <strong>{phase.verified}</strong> for{" "}
                {position.side_to_move === "black" ? "Black" : "White"}.
              </p>
              {phase.verified === "loss" && (
                <p className="mt-1 text-xs text-muted">
                  Since that side is lost, you&apos;ll play the winning side instead.
                </p>
              )}
              <button
                type="button"
                onClick={handleStartPractice}
                className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-accent-strong"
              >
                Practice this position →
              </button>
            </div>
          )}

          {phase.kind === "playing" && (
            <PracticeBoard
              position={position}
              userColor={phase.perspective.userColor}
              skillLevel={skill}
              engineReady={engineReady}
              getBestMove={getBestMove}
              onGameEnd={handleGameEnd}
            />
          )}

          <div className="flex w-full max-w-[480px] items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleSkip}
              className="rounded-lg border border-border px-4 py-2 text-sm text-foreground/80 transition hover:border-accent hover:text-accent"
            >
              Skip
            </button>
            {phase.kind === "playing" && (
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
            )}
          </div>

          {outcomeBanner && (
            <div
              className={`w-full max-w-[480px] rounded-lg border px-4 py-2 text-center font-medium ${
                outcomeBanner.success === true
                  ? "border-emerald-700/40 bg-emerald-950/30 text-emerald-300"
                  : "border-red-800/40 bg-red-950/30 text-red-300"
              }`}
            >
              {outcomeBanner.text}
            </div>
          )}

          <details className="w-full max-w-[480px] text-xs text-muted">
            <summary className="cursor-pointer">FEN</summary>
            <div className="mt-1 break-all">{position.fen}</div>
          </details>
        </section>
      )}
    </main>
  );
}
