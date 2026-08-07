"use client";

import type { GameResult } from "@/lib/session";

interface EvalGuessProps {
  sideToMove: "white" | "black";
  checking: boolean;
  onGuess: (guess: GameResult) => void;
}

const OPTIONS: { result: GameResult; label: (side: string) => string }[] = [
  { result: "win", label: (side) => `${side} wins` },
  { result: "draw", label: () => "Draw" },
  { result: "loss", label: (side) => `${side} loses` },
];

export default function EvalGuess({ sideToMove, checking, onGuess }: EvalGuessProps) {
  const side = sideToMove === "white" ? "White" : "Black";

  return (
    <div className="w-full max-w-[480px] rounded-lg border border-border bg-surface p-5 text-center">
      <p className="text-sm text-muted">
        This book didn&apos;t give a clear evaluation for this one. What&apos;s the correct result
        for {side} here?
      </p>
      <div className="mt-4 flex justify-center gap-3">
        {OPTIONS.map(({ result, label }) => (
          <button
            key={result}
            type="button"
            disabled={checking}
            onClick={() => onGuess(result)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/80 transition hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {label(side)}
          </button>
        ))}
      </div>
      {checking && <p className="mt-3 text-xs text-muted">Checking with Stockfish…</p>}
    </div>
  );
}
