/**
 * c0mpute first, the library's own vendor code second.
 *
 * Text generation goes to the c0mpute peer network through
 * @profullstack/ai-providers. When c0mpute fails (no node, timeout, free tier
 * used up), the caller runs its existing OpenAI code exactly as before, so a
 * failure on both looks the same as a failure did before c0mpute.
 *
 *   C0MPUTE_API_KEY     Infernet account key (ik_live_...). Without one the
 *                       network still answers, on a free tier of 10 calls a day.
 *   C0MPUTE_TIMEOUT_MS  whole call, default 300000 (c0mpute runs at a few
 *                       tokens a second; 60 to 240 s per call is normal)
 *   C0MPUTE_DISABLED    1 skips c0mpute entirely
 */
import { createAiProviders } from '@profullstack/ai-providers';

const ON = /^(1|true|yes|on)$/i;

/** True when C0MPUTE_DISABLED turns c0mpute off. */
export function isC0mputeDisabled(env = process.env) {
  return ON.test(env.C0MPUTE_DISABLED ?? '');
}

/**
 * A c0mpute-only router (no paid fallback inside it: the library keeps its
 * own), or null when c0mpute is disabled.
 * @param {object} [opts]
 * @param {string} [opts.apiKey] overrides C0MPUTE_API_KEY
 * @param {number} [opts.timeoutMs] overrides C0MPUTE_TIMEOUT_MS
 * @param {Record<string, string|undefined>} [opts.env]
 */
export function createC0mpute({ apiKey, timeoutMs, env = process.env } = {}) {
  if (isC0mputeDisabled(env)) return null;
  return createAiProviders({
    env: { ...env, C0MPUTE_API_KEY: apiKey || env.C0MPUTE_API_KEY || env.INFERNET_API_KEY || '' },
    paidFallback: false,
    c0mpute: timeoutMs ? { timeoutMs } : {},
  });
}
