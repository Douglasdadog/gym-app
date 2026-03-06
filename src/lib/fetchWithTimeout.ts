const DEFAULT_MS = 12000; // 12 seconds - avoid hanging forever on slow/cold APIs

/**
 * fetch with a timeout. After ms milliseconds the request is aborted
 * and the promise rejects so loading states can be cleared.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number }
): Promise<Response> {
  const { timeoutMs = DEFAULT_MS, ...fetchInit } = init ?? {};
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(input, {
      ...fetchInit,
      signal: controller.signal,
    });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request took too long. Please try again.");
    }
    throw err;
  }
}
