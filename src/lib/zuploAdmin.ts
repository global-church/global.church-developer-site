/**
 * Server-only client for the Zuplo Developer API.
 * Used to programmatically manage API key consumers and keys.
 */

type ZuploConfig = {
  apiKey: string;
  accountName: string;
  bucketName: string;
};

export type ZuploConsumer = {
  id: string;
  name: string;
  description: string;
  metadata: Record<string, string>;
  createdOn: string;
  updatedOn: string;
};

export type ZuploKeyInfo = {
  id: string;
  consumerName: string;
  description: string;
  createdOn: string;
  expiresOn: string | null;
};

export type CreateKeyResult = {
  consumerId: string;
  keyId: string;
  apiKey: string;
};

const ZUPLO_API_BASE = 'https://dev.zuplo.com';
const DEFAULT_CONSUMER_PLAN = process.env.ZUPLO_DEFAULT_PLAN ?? 'standard';
const DEFAULT_CONSUMER_RATE_LIMIT = Number(process.env.ZUPLO_DEFAULT_RATE_LIMIT ?? 100);

function getConfig(): ZuploConfig {
  const apiKey = process.env.ZUPLO_DEV_API_KEY;
  const accountName = process.env.ZUPLO_ACCOUNT_NAME;
  const bucketName = process.env.ZUPLO_BUCKET_NAME;
  if (!apiKey || !accountName || !bucketName) {
    throw new Error(
      'Zuplo admin API credentials are not configured. Set ZUPLO_DEV_API_KEY, ZUPLO_ACCOUNT_NAME, and ZUPLO_BUCKET_NAME.',
    );
  }
  return { apiKey, accountName, bucketName };
}

function buildUrl(config: ZuploConfig, path: string): string {
  return `${ZUPLO_API_BASE}/v1/accounts/${config.accountName}/key-buckets/${config.bucketName}${path}`;
}

async function zuploFetch(
  url: string,
  apiKey: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    ...((options.headers as Record<string, string>) ?? {}),
  };
  // Only set Content-Type for requests that carry a body
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, {
    ...options,
    headers,
  });
  return res;
}

/**
 * Get an existing consumer by name. Returns null if not found.
 */
export async function getZuploConsumer(
  consumerName: string,
): Promise<ZuploConsumer | null> {
  const config = getConfig();
  const url = buildUrl(config, `/consumers/${encodeURIComponent(consumerName)}`);
  const res = await zuploFetch(url, config.apiKey);

  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zuplo API error (get consumer): ${res.status} ${body}`);
  }

  return res.json();
}

/**
 * Create a new consumer with an initial API key.
 */
export async function createZuploConsumerWithKey(
  consumerName: string,
  description: string,
  metadata: Record<string, string | number> = {},
): Promise<CreateKeyResult> {
  const config = getConfig();
  const url = buildUrl(config, `/consumers?with-api-key=true`);

  const res = await zuploFetch(url, config.apiKey, {
    method: 'POST',
    body: JSON.stringify({
      name: consumerName,
      description,
      metadata: { plan: DEFAULT_CONSUMER_PLAN, rateLimit: DEFAULT_CONSUMER_RATE_LIMIT, ...metadata },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zuplo API error (create consumer): ${res.status} ${body}`);
  }

  const data = await res.json();

  return {
    consumerId: data.id ?? data.consumer?.id ?? '',
    keyId: data.apiKey?.id ?? data.key?.id ?? '',
    apiKey: data.apiKey?.key ?? data.key?.key ?? '',
  };
}

/**
 * Create an additional API key for an existing consumer.
 */
export async function createZuploApiKey(
  consumerName: string,
  description: string,
): Promise<{ keyId: string; apiKey: string }> {
  const config = getConfig();
  const url = buildUrl(config, `/consumers/${encodeURIComponent(consumerName)}/keys`);

  const res = await zuploFetch(url, config.apiKey, {
    method: 'POST',
    body: JSON.stringify({ description }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zuplo API error (create key): ${res.status} ${body}`);
  }

  const data = await res.json();

  return {
    keyId: data.id ?? '',
    apiKey: data.key ?? '',
  };
}

const DELETE_MAX_RETRIES = 3;
const DELETE_INITIAL_BACKOFF_MS = 500;

/**
 * Delete (revoke) an API key.
 *
 * Retries up to 3 times with exponential backoff (500ms → 1s → 2s) to handle
 * transient Zuplo outages. Without retry, a single network hiccup leaves the
 * key active at the gateway while the caller may give up.
 */
export async function deleteZuploApiKey(
  consumerName: string,
  keyId: string,
): Promise<void> {
  const config = getConfig();
  const url = buildUrl(
    config,
    `/consumers/${encodeURIComponent(consumerName)}/keys/${encodeURIComponent(keyId)}`,
  );

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < DELETE_MAX_RETRIES; attempt++) {
    try {
      const res = await zuploFetch(url, config.apiKey, { method: 'DELETE' });

      // 2xx or 404 (already deleted) are both success
      if (res.ok || res.status === 404) return;

      // 4xx (except 404) are not retryable — the request itself is wrong
      if (res.status >= 400 && res.status < 500) {
        const body = await res.text();
        throw new Error(`Zuplo API error (delete key): ${res.status} ${body}`);
      }

      // 5xx — retryable server error
      const body = await res.text();
      lastError = new Error(`Zuplo API error (delete key): ${res.status} ${body}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Non-retryable client errors are re-thrown from the 4xx branch above
      // and will have already exited the function. Network errors and 5xx
      // errors fall through to the backoff below.
    }

    if (attempt < DELETE_MAX_RETRIES - 1) {
      const backoff = DELETE_INITIAL_BACKOFF_MS * 2 ** attempt;
      console.warn(
        `[deleteZuploApiKey] Attempt ${attempt + 1}/${DELETE_MAX_RETRIES} failed, retrying in ${backoff}ms`,
        { consumerName, keyId, error: lastError?.message },
      );
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  console.error(
    `[deleteZuploApiKey] All ${DELETE_MAX_RETRIES} attempts failed`,
    { consumerName, keyId, error: lastError?.message },
  );
  throw lastError ?? new Error('Failed to delete Zuplo API key after retries.');
}
