// EXPO_PUBLIC_ vars are inlined into the client bundle by Expo. Set this to
// your dev machine's LAN IP (not localhost) when testing on a physical
// device over Wi-Fi — see AGENTS.md section 26.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

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
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
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

export function socketUrl(): string {
  return API_URL;
}

interface UploadFileOptions {
  token?: string | null;
  fieldName: string;
  uri: string;
  name: string;
  mimeType: string;
}

export async function uploadFile<T>(path: string, options: UploadFileOptions): Promise<T> {
  const form = new FormData();
  // React Native's FormData accepts this { uri, name, type } shape for file
  // parts — it is not a real Blob, so it can't be typed as one.
  form.append(options.fieldName, {
    uri: options.uri,
    name: options.name,
    type: options.mimeType,
  } as unknown as Blob);

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: options.token ? { Authorization: `Bearer ${options.token}` } : undefined,
    body: form,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? res.statusText, data?.details);
  }

  return data as T;
}
