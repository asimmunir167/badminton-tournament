const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  query?: Record<string, string | undefined>;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`${API_URL}${path}`);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined) url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url.toString(), {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? res.statusText, data?.details);
  }

  return data as T;
}
