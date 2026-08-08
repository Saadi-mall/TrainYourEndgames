"use client";

import { Chessboard } from "react-chessboard";

interface StaticBoardProps {
  fen: string;
  orientation?: "white" | "black";
}

/** Read-only board display, no interactivity or engine involved. Used for the eval-guess
 * quiz, where the user needs to actually see the position before judging it. */
export default function StaticBoard({ fen, orientation = "white" }: StaticBoardProps) {
  return (
    <div className="w-full max-w-[480px] overflow-hidden rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.35)] ring-1 ring-border">
      <Chessboard
        position={fen}
        arePiecesDraggable={false}
        boardOrientation={orientation}
        boardWidth={480}
        customDarkSquareStyle={{ backgroundColor: "#8c7250" }}
        customLightSquareStyle={{ backgroundColor: "#e9dcc4" }}
      />
    </div>
  );
}
