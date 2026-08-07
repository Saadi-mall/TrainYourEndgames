import type { AnalysisResult } from "@/lib/stockfishEngine";
import type { GameResult } from "@/lib/session";

/** Centipawn magnitude beyond which a position counts as a clear win rather than a draw.
 * Pawn endgames can be decisive on smaller margins than this (a lone extra passed pawn can
 * be winning at +150), so this is deliberately conservative to avoid false "win" verdicts on
 * positions that are actually holdable draws. */
const DECISIVE_CP_THRESHOLD = 200;

/** Classifies a Stockfish analysis as the result for the side to move in the analyzed FEN. */
export function classifyEval({ cp, mate }: Pick<AnalysisResult, "cp" | "mate">): GameResult {
  if (mate !== null) return mate > 0 ? "win" : "loss";
  if (cp === null) return "draw";
  if (cp >= DECISIVE_CP_THRESHOLD) return "win";
  if (cp <= -DECISIVE_CP_THRESHOLD) return "loss";
  return "draw";
}
