"use client";

import { useEffect, useRef, useState } from "react";
import { StockfishEngine } from "@/lib/stockfishEngine";

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

  return { ready, getBestMove };
}
