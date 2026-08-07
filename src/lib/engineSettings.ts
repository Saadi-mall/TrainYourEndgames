"use client";

/** Persisted Stockfish strength setting. Skill Level (0-20) is Stockfish's own knob for
 * playing deliberately weaker; search depth is derived from it so low skill also means a
 * shallower, faster (and more error-prone) search rather than just occasional blunders. */

const STORAGE_KEY = "endgame-trainer:engine-skill";

export const MIN_SKILL = 0;
export const MAX_SKILL = 20;
export const DEFAULT_SKILL = 15;

export function depthForSkill(skill: number): number {
  return Math.min(18, Math.max(4, skill + 3));
}

export function getSkillLevel(): number {
  if (typeof window === "undefined") return DEFAULT_SKILL;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : DEFAULT_SKILL;
}

export function setSkillLevel(skill: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, String(skill));
}

export function skillLabel(skill: number): string {
  if (skill <= 3) return "Beginner";
  if (skill <= 7) return "Easy";
  if (skill <= 12) return "Intermediate";
  if (skill <= 17) return "Strong";
  return "Maximum";
}
