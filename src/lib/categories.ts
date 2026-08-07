/** Puzzle categories. Currently just the one book/theme this app was built for, but progress
 * is tracked per-category (see session.ts) so adding a new one later -- another book, another
 * theme -- is just a new entry here plus a new data source and tile, each with its own
 * independent progress and reset button. */

export interface PuzzleCategory {
  id: string;
  label: string;
}

export const PAWN_ENDGAMES: PuzzleCategory = { id: "pawn-endgames", label: "Pawn Endgames" };

export const CATEGORIES: PuzzleCategory[] = [PAWN_ENDGAMES];
