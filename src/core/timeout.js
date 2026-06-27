/**
 * Hard deadline helper. Races a promise against a timer; rejects with
 * a labeled timeout error if the promise hasn't settled by `ms`.
 *
 * IMPORTANT: returning the timeout error to the caller does NOT cancel
 * the underlying work. For network calls, also pass `abortController`'s
 * signal to the SDK (OpenAI/Anthropic accept `{signal}` on their
 * methods) so the underlying HTTP request is cancelled. When `signal`
 * cannot be plumbed (Ollama SDK, Gemini < native), the IRIS-level
 * Promise.race still guarantees the caller is not blocked past `ms`.
 *
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} label Human-readable label for the error message.
 * @param {AbortController} [abortController] If provided, .abort() is called on timeout.
 * @returns {Promise<T>}
 */
export function withDeadline(promise, ms, label = 'operation', abortController = null) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      if (abortController) {
        try { abortController.abort(); } catch { /* ignore */ }
      }
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export default withDeadline;
