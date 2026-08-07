"use client";

import { getSession } from "@/lib/lichessAuth";

/**
 * localStorage-backed progress tracking, graded against each position's known target
 * result (derived from the book's own evaluation symbol: the side to move is meant to
 * win, draw, or -- rarely, in a "find the only move" defensive puzzle -- just survive
 * with a loss being par). A position enters the review queue whenever the user's most
 * recent graded attempt at it fell short of that target; it leaves the queue the next
 * time they meet or beat the target. Positions without a known target (ambiguous OCR)
 * are never graded and can never enter the review queue.
 *
 * Storage is namespaced per logged-in Lichess account *and* per puzzle category (see
 * categories.ts), so a shared browser/device keeps each person's progress separate, and
 * resetting one category's progress never touches another's.
 */

export type GameResult = "win" | "draw" | "loss";
export type TargetResult = GameResult | null;

export interface Attempt {
  positionId: string;
  actualResult: GameResult | null; // null = skipped before the game concluded
  targetResult: TargetResult; // copied from the position at attempt time
  success: boolean | null; // null = ungraded (no known target, or skipped)
  fromReviewQueue: boolean; // was this attempt pulled from the review queue?
  timestamp: number;
}

export interface SessionStatsSummary {
  totalAttempts: number;
  solved: number;
  failed: number;
  skipped: number;
  attemptsToday: number;
  uniquePositionsSeen: number;
  reviewQueueSize: number;
  /** Distinct positions with at least one successful attempt, ever (not just currently). */
  solvedPositions: number;
}

export const EMPTY_STATS: SessionStatsSummary = {
  totalAttempts: 0,
  solved: 0,
  failed: 0,
  skipped: 0,
  attemptsToday: 0,
  uniquePositionsSeen: 0,
  reviewQueueSize: 0,
  solvedPositions: 0,
};

const RANK: Record<GameResult, number> = { loss: 0, draw: 1, win: 2 };

export function meetsTarget(actual: GameResult, target: GameResult): boolean {
  return RANK[actual] >= RANK[target];
}

function storageKey(category: string): string {
  const userId = getSession()?.id ?? "anon";
  return `endgame-trainer:attempts:${userId}:${category}`;
}

function load(category: string): Attempt[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(category));
    return raw ? (JSON.parse(raw) as Attempt[]) : [];
  } catch {
    return [];
  }
}

function save(category: string, attempts: Attempt[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(category), JSON.stringify(attempts));
}

export function recordGameEnd(
  category: string,
  positionId: string,
  actualResult: GameResult,
  targetResult: TargetResult,
  fromReviewQueue: boolean
) {
  const success = targetResult === null ? null : meetsTarget(actualResult, targetResult);
  const attempts = load(category);
  attempts.push({ positionId, actualResult, targetResult, success, fromReviewQueue, timestamp: Date.now() });
  save(category, attempts);
}

export function recordSkip(category: string, positionId: string, fromReviewQueue: boolean) {
  const attempts = load(category);
  attempts.push({
    positionId,
    actualResult: null,
    targetResult: null,
    success: null,
    fromReviewQueue,
    timestamp: Date.now(),
  });
  save(category, attempts);
}

/** Position IDs whose most recent *graded* attempt fell short of the target. */
export function getReviewQueue(category: string): Set<string> {
  const attempts = load(category);
  const latestGraded = new Map<string, Attempt>();
  for (const a of attempts) {
    if (a.success === null) continue;
    const prev = latestGraded.get(a.positionId);
    if (!prev || a.timestamp > prev.timestamp) latestGraded.set(a.positionId, a);
  }
  const queue = new Set<string>();
  latestGraded.forEach((a, id) => {
    if (!a.success) queue.add(id);
  });
  return queue;
}

/** Distinct positions with at least one successful attempt, ever. */
export function getSolvedPositionIds(category: string): Set<string> {
  const attempts = load(category);
  const solved = new Set<string>();
  attempts.forEach((a) => {
    if (a.success === true) solved.add(a.positionId);
  });
  return solved;
}

export function getStats(category: string): SessionStatsSummary {
  const attempts = load(category);
  const today = new Date().toDateString();
  return {
    totalAttempts: attempts.length,
    solved: attempts.filter((a) => a.success === true).length,
    failed: attempts.filter((a) => a.success === false).length,
    skipped: attempts.filter((a) => a.actualResult === null).length,
    attemptsToday: attempts.filter((a) => new Date(a.timestamp).toDateString() === today).length,
    uniquePositionsSeen: new Set(attempts.map((a) => a.positionId)).size,
    reviewQueueSize: getReviewQueue(category).size,
    solvedPositions: getSolvedPositionIds(category).size,
  };
}

/** Irreversibly wipes all progress for one category (for the current user only). */
export function resetCategory(category: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey(category));
}
