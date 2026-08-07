import { Chess } from "chess.js";
import rawPositions from "@/data/positions.json";
import type { Position, SideToMove } from "@/types/position";

const allPositionsRaw: Position[] = rawPositions as Position[];

function isFenPlayable(fen: string): boolean {
  try {
    new Chess(fen);
    return true;
  } catch {
    return false;
  }
}

/** Positions that are both flagged-legal and actually loadable by the chess engine.
 * Unplayable extractions never surface anywhere in the app -- not in practice, not in
 * review -- there's nothing a user could do with a board that won't load. */
export const allPositions: Position[] = allPositionsRaw.filter((p) => p.legal && isFenPlayable(p.fen));

export interface PositionFilter {
  /** Inclusive PDF page range. */
  minPage?: number;
  maxPage?: number;
  /** Restrict to a specific side to move. */
  sideToMove?: SideToMove;
  /** Restrict to positions with a known target result (win/draw/loss for the mover). */
  gradedOnly?: boolean;
}

export function filterPositions(positions: Position[], filter: PositionFilter = {}): Position[] {
  const { minPage, maxPage, sideToMove, gradedOnly } = filter;

  return positions.filter((p) => {
    if (minPage !== undefined && p.page_number_pdf < minPage) return false;
    if (maxPage !== undefined && p.page_number_pdf > maxPage) return false;
    if (sideToMove !== undefined && p.side_to_move !== sideToMove) return false;
    if (gradedOnly && p.target_result === null) return false;
    return true;
  });
}

export function randomPosition(positions: Position[], filter: PositionFilter = {}): Position | null {
  const pool = filterPositions(positions, filter);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export const pageBounds = {
  min: Math.min(...allPositions.map((p) => p.page_number_pdf)),
  max: Math.max(...allPositions.map((p) => p.page_number_pdf)),
};

export const totalCount = allPositions.length;
export const gradedCount = allPositions.filter((p) => p.target_result !== null).length;
export const unplayableCount = allPositionsRaw.length - allPositions.length;
