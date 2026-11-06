import { BadRequestException } from '@nestjs/common';
import { assertSafeWsUrl } from '@paraspell/sdk';
import type { z } from 'zod';

import type { BuilderOptionsSchema } from '../x-transfer/dto/XTransferDto.js';

type TBuilderOptions = z.infer<typeof BuilderOptionsSchema>;

const ALLOWLIST = (process.env.XCM_API_WSS_ALLOWLIST ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/**
 * Collects every user-supplied WebSocket endpoint from builder options
 * (apiOverrides + customChains providers) and validates them before the SDK
 * is allowed to open connections. When XCM_API_WSS_ALLOWLIST is configured,
 * only hosts on that list are accepted.
 */
export const assertUserWsUrlsSafe = (options: TBuilderOptions | undefined): void => {
  if (!options) return;

  const urls: string[] = [];

  if (options.apiOverrides) {
    for (const override of Object.values(options.apiOverrides)) {
      if (typeof override === 'string') {
        urls.push(override);
      } else if (Array.isArray(override)) {
        urls.push(...override);
      }
    }
  }

  for (const chain of Object.values(options.customChains ?? {})) {
    for (const provider of chain.providers ?? []) {
      urls.push(provider.endpoint);
    }
  }

  for (const url of urls) {
    assertSafeWsUrl(url, options.development);

    if (ALLOWLIST.length > 0) {
      const host = new URL(url).hostname.toLowerCase();
      if (!ALLOWLIST.includes(host)) {
        throw new BadRequestException(
          `WebSocket endpoint "${host}" is not on the allowlist`,
        );
      }
    }
  }
};

/**
 * Upper bound for request execution. Prevents anonymous callers from tying up
 * worker capacity with long-lived connections to slow or unresponsive
 * endpoints. Override with XCM_API_TIMEOUT_MS.
 */
export const REQUEST_TIMEOUT_MS = Number(process.env.XCM_API_TIMEOUT_MS ?? 120_000);

export const withTimeout = async <T>(promise: Promise<T>): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`)),
          REQUEST_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};
