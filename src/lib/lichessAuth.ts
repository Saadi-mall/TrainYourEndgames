"use client";

/**
 * Lichess OAuth (Authorization Code + PKCE, no client secret -- this is the flow Lichess
 * documents for apps with no backend: https://lichess.org/api#tag/OAuth). Login both gates
 * the app per-user (progress is namespaced by Lichess account, see session.ts) and, since we
 * request study:write up front, doubles as the auth needed for the later Lichess export
 * feature without a second consent screen.
 */

const CLIENT_ID = "endgame-trainer-local";
const SCOPES = "study:write";
const AUTH_SESSION_KEY = "endgame-trainer:auth";
const PKCE_VERIFIER_KEY = "endgame-trainer:pkce-verifier";
const PKCE_STATE_KEY = "endgame-trainer:pkce-state";

export interface AuthSession {
  accessToken: string;
  id: string;
  username: string;
}

function redirectUri(): string {
  return `${window.location.origin}/callback`;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let str = "";
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomVerifier(): string {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function challengeFromVerifier(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

export async function beginLogin(): Promise<void> {
  const verifier = randomVerifier();
  const state = randomVerifier();
  const challenge = await challengeFromVerifier(verifier);

  window.sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  window.sessionStorage.setItem(PKCE_STATE_KEY, state);

  const url = new URL("https://lichess.org/oauth");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);

  window.location.href = url.toString();
}

export class CallbackError extends Error {}

export async function handleCallback(code: string, state: string): Promise<AuthSession> {
  const expectedState = window.sessionStorage.getItem(PKCE_STATE_KEY);
  const verifier = window.sessionStorage.getItem(PKCE_VERIFIER_KEY);
  window.sessionStorage.removeItem(PKCE_STATE_KEY);
  window.sessionStorage.removeItem(PKCE_VERIFIER_KEY);

  if (!verifier || !expectedState || state !== expectedState) {
    throw new CallbackError("Login session expired or was tampered with. Please try again.");
  }

  const tokenRes = await fetch("https://lichess.org/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri(),
      client_id: CLIENT_ID,
    }),
  });
  if (!tokenRes.ok) {
    throw new CallbackError(`Lichess rejected the login (${tokenRes.status}).`);
  }
  const { access_token: accessToken } = await tokenRes.json();

  const accountRes = await fetch("https://lichess.org/api/account", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!accountRes.ok) {
    throw new CallbackError("Logged in, but couldn't load your Lichess account.");
  }
  const account = await accountRes.json();

  const session: AuthSession = { accessToken, id: account.id, username: account.username };
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function logout(): void {
  window.localStorage.removeItem(AUTH_SESSION_KEY);
  window.location.href = "/login";
}
