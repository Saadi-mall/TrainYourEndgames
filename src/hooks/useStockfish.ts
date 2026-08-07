"use client";

import { useEffect, useRef, useState } from "react";
import { StockfishEngine, type AnalysisResult } from "@/lib/stockfishEngine";

/** Depth used when verifying/classifying a position's objective result. Independent of
 * play strength -- this always searches at full strength for an accurate read. */
export const EVAL_DEPTH = 20;

export function useStockfish() {
  const engineRef = useRef<StockfishEngine | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const engine = new StockfishEngine();
    engineRef.current = engine;
    engine.waitUntilReady().then(() => setReady(true));
    return () => {
      engine.terminate();
      engineRef.current = null;
    };
  }, []);

  async function getBestMove(fen: string, depth: number, skillLevel: number) {
    if (!engineRef.current) return null;
    return engineRef.current.getBestMove(fen, { depth, skillLevel });
  }

  async function evaluatePosition(fen: string, depth: number = EVAL_DEPTH): Promise<AnalysisResult | null> {
    if (!engineRef.current) return null;
    return engineRef.current.analyze(fen, depth, 20);
  }

  return { ready, getBestMove, evaluatePosition };
}
