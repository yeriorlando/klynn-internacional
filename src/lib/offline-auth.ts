const PBKDF2_ITERATIONS = 210_000;
const OFFLINE_AUTH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface OfflineAuthVerifier {
  algorithm: "PBKDF2-SHA256";
  salt: string;
  verifier: string;
  iterations: number;
  created_at: string;
  expires_at: string;
  failed_attempts: number;
  locked_until?: string;
  last_verified_at?: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function createOfflineAuthVerifier(password: string): Promise<OfflineAuthVerifier> {
  if (!password) throw new Error("No se puede habilitar el acceso offline sin contraseña.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const verifier = await derive(password, salt, PBKDF2_ITERATIONS);
  const now = new Date();
  return {
    algorithm: "PBKDF2-SHA256",
    salt: bytesToBase64(salt),
    verifier: bytesToBase64(verifier),
    iterations: PBKDF2_ITERATIONS,
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + OFFLINE_AUTH_TTL_MS).toISOString(),
    failed_attempts: 0,
  };
}

export function isOfflineAuthLocked(auth?: OfflineAuthVerifier): boolean {
  return Boolean(auth?.locked_until && Date.parse(auth.locked_until) > Date.now());
}

export function isOfflineAuthExpired(auth?: OfflineAuthVerifier): boolean {
  return !auth?.expires_at || Date.parse(auth.expires_at) <= Date.now();
}

export async function verifyOfflinePassword(
  password: string,
  auth: OfflineAuthVerifier,
): Promise<boolean> {
  if (
    !password ||
    auth.algorithm !== "PBKDF2-SHA256" ||
    isOfflineAuthLocked(auth) ||
    isOfflineAuthExpired(auth)
  )
    return false;
  const actual = await derive(password, base64ToBytes(auth.salt), auth.iterations);
  const expected = base64ToBytes(auth.verifier);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index++) difference |= actual[index] ^ expected[index];
  return difference === 0;
}

export function recordOfflineAuthFailure(auth: OfflineAuthVerifier): OfflineAuthVerifier {
  const failedAttempts = (auth.failed_attempts || 0) + 1;
  return {
    ...auth,
    failed_attempts: failedAttempts,
    locked_until:
      failedAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : undefined,
  };
}

export function recordOfflineAuthSuccess(auth: OfflineAuthVerifier): OfflineAuthVerifier {
  return {
    ...auth,
    failed_attempts: 0,
    locked_until: undefined,
    last_verified_at: new Date().toISOString(),
  };
}
