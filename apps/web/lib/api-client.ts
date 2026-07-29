// Every response from apps/api is wrapped in { data, meta } by
// TransformResponseInterceptor (see apps/api/src/common/interceptors) — this
// client unwraps that once, here, so nothing else in the app has to know the
// envelope exists.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Envelope<T> {
  data: T;
  meta: { timestamp: string };
}

interface RequestOptions {
  accessToken?: string;
  cache?: RequestCache;
  revalidate?: number | false;
}

interface ApiErrorBody {
  message?: string | string[];
  error?: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    // apps/api's HttpExceptionFilter always returns { message, error, ... }
    // (see common/filters/http-exception.filter.ts) — surfacing that real
    // message here (not just the status code) is what lets admin UI show
    // "Cannot delete a category that still has child categories..." instead
    // of "API request failed with status 409".
    super(ApiError.extractMessage(body, status));
  }

  private static extractMessage(body: unknown, status: number): string {
    const parsed = body as ApiErrorBody | null;
    if (!parsed?.message) return `API request failed with status ${status}`;
    return Array.isArray(parsed.message) ? parsed.message.join(', ') : parsed.message;
  }
}

async function request<T>(path: string, init: RequestInit, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (options.accessToken) {
    headers.set('Authorization', `Bearer ${options.accessToken}`);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    cache: options.cache,
    next: options.revalidate !== undefined ? { revalidate: options.revalidate } : undefined,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body);
  }

  // A 204 (or any response Express sends with no body at all) has nothing
  // for res.json() to parse — calling it unconditionally would throw.
  // Every DELETE endpoint in this app returns 200 with a real
  // {data, meta} JSON body via the global TransformResponseInterceptor,
  // except AccountsController's erasure endpoint, which explicitly sets
  // @HttpCode(204) since a POPIA erasure request has nothing meaningful
  // to hand back. This check exists for that endpoint specifically, but
  // guards the shared client generally rather than special-casing one path.
  if (res.status === 204) {
    return undefined as T;
  }

  const envelope = (await res.json()) as Envelope<T>;
  return envelope.data;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { method: 'GET' }, options),

  post: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }, options),

  patch: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, options),

  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { method: 'DELETE' }, options),
};
