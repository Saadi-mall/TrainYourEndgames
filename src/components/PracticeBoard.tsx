"use client";

import { useEffect, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { Position } from "@/types/position";
import type { GameResult } from "@/lib/session";
import { depthForSkill } from "@/lib/engineSettings";

interface PracticeBoardProps {
  position: Position;
  /** Which color the human plays. Defaults to the position's recorded side to move. */
  userColor?: "white" | "black";
  skillLevel: number;
  /** Shared engine instance from the parent, so the same worker serves both evaluation
   * (e.g. the eval-guess quiz) and gameplay instead of spinning up a second one. */
  engineReady: boolean;
  getBestMove: (fen: string, depth: number, skillLevel: number) => Promise<string | null>;
  onGameEnd?: (result: { actualResult: GameResult; description: string }) => void;
}

function safeChess(fen: string): Chess | null {
  try {
    return new Chess(fen);
  } catch {
    return null;
  }
}

function describeGameOver(g: Chess): { description: string; winner: "white" | "black" | null } {
  if (g.isCheckmate()) {
    const winner = g.turn() === "w" ? "black" : "white";
    return { description: `Checkmate — ${winner} wins`, winner };
  }
  if (g.isStalemate()) return { description: "Draw — stalemate", winner: null };
  if (g.isInsufficientMaterial()) return { description: "Draw — insufficient material", winner: null };
  if (g.isThreefoldRepetition()) return { description: "Draw — threefold repetition", winner: null };
  if (g.isDraw()) return { description: "Draw — 50-move rule", winner: null };
  return { description: "", winner: null };
}

export default function PracticeBoard({
  position,
  userColor,
  skillLevel,
  engineReady,
  getBestMove,
  onGameEnd,
}: PracticeBoardProps) {
  const initialColor: "white" | "black" = userColor ?? position.side_to_move ?? "white";
  const [game, setGame] = useState<Chess | null>(() => safeChess(position.fen));
  const [orientation, setOrientation] = useState<"white" | "black">(initialColor);
  const [status, setStatus] = useState<string>("");
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [engineThinking, setEngineThinking] = useState(false);
  const gameEndedRef = useRef(false);

  // reset the board whenever a new position is loaded
  useEffect(() => {
    setGame(safeChess(position.fen));
    setOrientation(userColor ?? position.side_to_move ?? "white");
    setStatus("");
    setSelectedSquare(null);
    gameEndedRef.current = false;
  }, [position, userColor]);

  const humanColor = userColor ?? position.side_to_move ?? "white";
  const humanColorCode = humanColor === "white" ? "w" : "b";

  function finishIfOver(g: Chess) {
    if (!g.isGameOver() || gameEndedRef.current) return;
    gameEndedRef.current = true;
    const { description, winner } = describeGameOver(g);
    setStatus(description);
    const actualResult: GameResult = winner === null ? "draw" : winner === humanColor ? "win" : "loss";
    onGameEnd?.({ actualResult, description });
  }

  // let the engine play the non-human side automatically
  useEffect(() => {
    if (!game || !engineReady || gameEndedRef.current) return;
    if (game.isGameOver()) {
      finishIfOver(game);
      return;
    }
    if (game.turn() === humanColorCode) return;

    let cancelled = false;
    setEngineThinking(true);
    getBestMove(game.fen(), depthForSkill(skillLevel), skillLevel).then((uciMove) => {
      if (cancelled || !uciMove) {
        setEngineThinking(false);
        return;
      }
      const from = uciMove.slice(0, 2) as Square;
      const to = uciMove.slice(2, 4) as Square;
      const promotion = uciMove.slice(4, 5) || undefined;
      setGame((current) => {
        if (!current) return current;
        const copy = new Chess(current.fen());
        try {
          copy.move({ from, to, promotion });
        } catch {
          return current;
        }
        finishIfOver(copy);
        return copy;
      });
      setEngineThinking(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, engineReady, humanColorCode, skillLevel]);

  function attemptMove(sourceSquare: Square, targetSquare: Square): boolean {
    if (!game || game.turn() !== humanColorCode || engineThinking) return false;
    try {
      const gameCopy = new Chess(game.fen());
      gameCopy.move({ from: sourceSquare, to: targetSquare, promotion: "q" }); // throws on illegal moves
      setGame(gameCopy);
      setStatus("");
      finishIfOver(gameCopy);
      return true;
    } catch {
      return false;
    }
  }

  function onPieceDrop(sourceSquare: Square, targetSquare: Square): boolean {
    setSelectedSquare(null);
    return attemptMove(sourceSquare, targetSquare);
  }

  function onSquareClick(square: Square): void {
    if (!game || game.turn() !== humanColorCode || engineThinking) return;
    if (selectedSquare === null) {
      const piece = game.get(square);
      if (piece) setSelectedSquare(square);
      return;
    }
    if (selectedSquare === square) {
      setSelectedSquare(null);
      return;
    }
    const moved = attemptMove(selectedSquare, square);
    if (moved) {
      setSelectedSquare(null);
    } else {
      // clicking a second own piece re-selects instead of attempting an illegal move
      const piece = game.get(square);
      setSelectedSquare(piece ? square : null);
    }
  }

  const selectedSquareStyle = selectedSquare
    ? { [selectedSquare]: { backgroundColor: "rgba(217, 164, 65, 0.45)" } }
    : {};

  if (!game) {
    return (
      <div className="w-full max-w-[480px] rounded-lg border border-red-900/50 bg-red-950/40 p-4 text-red-300">
        This position&apos;s FEN doesn&apos;t parse as a legal chess position, so it can&apos;t be
        played out here: <code className="break-all">{position.fen}</code>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-full max-w-[480px] overflow-hidden rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.35)] ring-1 ring-border">
        <Chessboard
          position={game.fen()}
          onPieceDrop={onPieceDrop}
          onSquareClick={onSquareClick}
          customSquareStyles={selectedSquareStyle}
          boardOrientation={orientation}
          boardWidth={480}
          customDarkSquareStyle={{ backgroundColor: "#8c7250" }}
          customLightSquareStyle={{ backgroundColor: "#e9dcc4" }}
        />
      </div>

      <div className="flex w-full max-w-[480px] items-center justify-between text-sm text-muted">
        <span>
          {!engineReady ? "Loading engine…" : engineThinking ? "Stockfish is thinking…" : ""}
        </span>
        <button
          type="button"
          onClick={() => setOrientation((o) => (o === "white" ? "black" : "white"))}
          className="rounded border border-border px-2 py-1 text-foreground/80 transition hover:border-accent hover:text-accent"
        >
          Flip board
        </button>
      </div>

      {status && (
        <div className="w-full max-w-[480px] rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-center font-medium text-accent-strong">
          {status}
        </div>
      )}
    </div>
  );
}
