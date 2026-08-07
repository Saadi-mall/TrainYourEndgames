export type SideToMove = "white" | "black" | null;
export type RawEval = "white_wins" | "black_wins" | "draw" | null;
export type TargetResult = "win" | "draw" | "loss" | null;

export interface Position {
  page_index: number;
  page_number_pdf: number;
  board_index_on_page: number;
  diagram_number: number | null;
  fen: string;
  side_to_move: SideToMove;
  title_text: string;
  notation_raw: string;
  header_raw: string;
  raw_eval: RawEval;
  /** The result the side-to-move is meant to achieve, per the book's own evaluation. Null
   * when the caption showed two variations (side-to-move-dependent) and OCR can't reliably
   * tell which evaluation belongs to which -- these positions are playable but ungraded. */
  target_result: TargetResult;
  legal: boolean;
  legality_issues: string[];
}

/** Stable identity for a position, used as a key for session-tracking records. */
export function positionId(p: Position): string {
  return `${p.page_index}:${p.board_index_on_page}`;
}
