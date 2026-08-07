import type { GameResult } from "@/lib/session";

export interface Perspective {
  userColor: "white" | "black";
  /** Never 'loss': a loss for the recorded side-to-move is reframed as a win for the user,
   * who plays the other color instead. See resolvePerspective. */
  effectiveTarget: "win" | "draw";
  flipped: boolean;
}

/** Decides who the user should play and what they're aiming for, given the book's (or a
 * Stockfish-verified) result for whoever the position records as being on move.
 *
 * Nobody practices trying to lose on purpose: if the side to move is objectively lost, the
 * user instead plays the winning side, with Stockfish taking over the losing side's moves.
 * This is the only place that mapping happens, so grading and orientation always agree.
 */
export function resolvePerspective(sideToMove: "white" | "black", resultForMover: GameResult): Perspective {
  if (resultForMover === "loss") {
    return { userColor: sideToMove === "white" ? "black" : "white", effectiveTarget: "win", flipped: true };
  }
  return { userColor: sideToMove, effectiveTarget: resultForMover, flipped: false };
}
