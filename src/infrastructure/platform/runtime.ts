/**
 * The subset of the artifact host's runtime API (window.claude) this app uses.
 *
 * Only what is declared here is relied on; the full contract is provided by
 * the host at run time. Outside the host (local development, tests)
 * window.claude does not exist and the app falls back to in-memory adapters.
 */

export interface PlatformError {
  readonly code: string;
  readonly message: string;
}

export interface PlatformDocumentSnapshot {
  readonly id: string;
  data(): Record<string, unknown> | undefined;
}

export interface PlatformQuerySnapshot {
  readonly docs: readonly PlatformDocumentSnapshot[];
  readonly metadata: { readonly fromCache: boolean };
}

export interface PlatformDocumentReference {
  set(data: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
}

export interface PlatformCollection {
  doc(id: string): PlatformDocumentReference;
  onSnapshot(
    next: (snapshot: PlatformQuerySnapshot) => void,
    error?: (error: PlatformError) => void,
  ): () => void;
}

export interface PlatformDb {
  collection(path: string): PlatformCollection;
}

export interface PlatformSampleOptions {
  readonly modelTier?: "quick" | "default" | "complex";
  readonly signal?: AbortSignal;
  readonly images?: Blob[];
  readonly cache?: boolean;
}

export interface PlatformSample {
  json(input: string, options?: PlatformSampleOptions): Promise<unknown>;
}

export interface PlatformCapabilities {
  readonly db: PlatformDb;
  /** Null when this viewer cannot call Claude from the page. */
  readonly sample: PlatformSample | null;
}

interface ClaudeRuntime {
  use(name: string): Promise<unknown>;
}

declare global {
  interface Window {
    claude?: ClaudeRuntime;
  }
}

/**
 * Connects to the host runtime. Resolves null when the page runs outside
 * the host or the database is not available to this viewer.
 */
export async function connectPlatform(): Promise<PlatformCapabilities | null> {
  const runtime = window.claude;
  if (!runtime) return null;

  const [db, sample] = await Promise.all([
    runtime.use("db") as Promise<PlatformDb | null>,
    runtime.use("sample") as Promise<PlatformSample | null>,
  ]);
  return db ? { db, sample } : null;
}
