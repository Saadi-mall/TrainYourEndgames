"use client";

/** Thin UCI wrapper around the Stockfish WASM worker (public/stockfish/). */

const ENGINE_URL = "/stockfish/stockfish-18-lite-single.js";

export interface EngineMoveOptions {
  depth?: number;
  skillLevel?: number; // 0-20, Stockfish's own "dumb it down" knob
}

export class StockfishEngine {
  private worker: Worker;
  private ready: Promise<void>;
  private pendingBestMove: ((move: string | null) => void) | null = null;

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
      if (typeof e.data !== "string") return;
      if (e.data.startsWith("bestmove")) {
        const move = e.data.split(" ")[1] ?? null;
        this.pendingBestMove?.(move === "(none)" ? null : move);
        this.pendingBestMove = null;
      }
    });
  }

  async waitUntilReady(): Promise<void> {
    await this.ready;
  }

  async getBestMove(fen: string, options: EngineMoveOptions = {}): Promise<string | null> {
    await this.ready;
    const { depth = 12, skillLevel } = options;

    if (skillLevel !== undefined) {
      this.worker.postMessage(`setoption name Skill Level value ${Math.round(skillLevel)}`);
    }

    return new Promise((resolve) => {
      this.pendingBestMove = resolve;
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${depth}`);
    });
  }

  terminate() {
    this.worker.terminate();
  }
}
