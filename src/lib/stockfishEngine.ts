"use client";

/** Thin UCI wrapper around the Stockfish WASM worker (public/stockfish/). */

const ENGINE_URL = "/stockfish/stockfish-18-lite-single.js";

export interface EngineMoveOptions {
  depth?: number;
  skillLevel?: number; // 0-20, Stockfish's own "dumb it down" knob
}

export interface AnalysisResult {
  bestMove: string | null;
  /** Centipawns from the side-to-move's perspective; null when a forced mate was found instead. */
  cp: number | null;
  /** Moves to mate from the side-to-move's perspective (positive = side to move mates); null if none found. */
  mate: number | null;
}

interface PendingAnalysis {
  cp: number | null;
  mate: number | null;
  resolve: (result: AnalysisResult) => void;
}

export class StockfishEngine {
  private worker: Worker;
  private ready: Promise<void>;
  private pending: PendingAnalysis | null = null;

  constructor() {
    this.worker = new Worker(ENGINE_URL);
    this.ready = new Promise((resolve) => {
      const onReady = (e: MessageEvent<string>) => {
        if (e.data === "uciok") {
          this.worker.postMessage("isready");
        } else if (e.data === "readyok") {
          this.worker.removeEventListener("message", onReady);
          resolve();
        }
      };
      this.worker.addEventListener("message", onReady);
      this.worker.postMessage("uci");
    });

    this.worker.addEventListener("message", (e: MessageEvent<string>) => {
      if (typeof e.data !== "string" || !this.pending) return;

      if (e.data.startsWith("info")) {
        const mateMatch = e.data.match(/score mate (-?\d+)/);
        const cpMatch = e.data.match(/score cp (-?\d+)/);
        if (mateMatch) {
          this.pending.mate = parseInt(mateMatch[1], 10);
          this.pending.cp = null;
        } else if (cpMatch) {
          this.pending.cp = parseInt(cpMatch[1], 10);
          this.pending.mate = null;
        }
        return;
      }

      if (e.data.startsWith("bestmove")) {
        const move = e.data.split(" ")[1] ?? null;
        const { cp, mate, resolve } = this.pending;
        this.pending = null;
        resolve({ bestMove: move === "(none)" ? null : move, cp, mate });
      }
    });
  }

  async waitUntilReady(): Promise<void> {
    await this.ready;
  }

  /** Runs a search and returns the best move plus the final reported evaluation. */
  async analyze(fen: string, depth: number, skillLevel?: number): Promise<AnalysisResult> {
    await this.ready;
    if (skillLevel !== undefined) {
      this.worker.postMessage(`setoption name Skill Level value ${Math.round(skillLevel)}`);
    }
    return new Promise((resolve) => {
      this.pending = { cp: null, mate: null, resolve };
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${depth}`);
    });
  }

  async getBestMove(fen: string, options: EngineMoveOptions = {}): Promise<string | null> {
    const { depth = 12, skillLevel } = options;
    const { bestMove } = await this.analyze(fen, depth, skillLevel);
    return bestMove;
  }

  terminate() {
    this.worker.terminate();
  }
}
